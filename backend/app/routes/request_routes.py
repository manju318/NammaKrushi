"""
Purchase Request Routes (/api/requests)
Facilitates direct, product-specific buyer-farmer purchase requests,
price & quantity negotiations, preferred mandi logistics, and accepted order conversion.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, g
from app.models.user import User, BuyerProfile
from app.models.marketplace import (
    Product, Order, OrderItem, OrderReservation, PurchaseRequest
)
from app.models.notification import Notification
from app.services.payment_service import initiate_order_payment
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

request_bp = Blueprint('requests', __name__)

@request_bp.route('', methods=['POST'])
@login_required
def create_request():
    """
    Buyer creates a purchase request for a specific product listing.
    Retrieves the authentic seller from product.seller_id on the backend.
    """
    user: User = g.current_user
    data = request.get_json() or {}

    product_id = data.get('product_id')
    qty = data.get('quantity') or data.get('requested_quantity')
    proposed_price = data.get('proposed_unit_price')
    delivery_address = data.get('delivery_address') or (user.buyer_profile.delivery_address if user.buyer_profile else None)
    mandi_name = data.get('mandi_name')
    mandi_address = data.get('mandi_address')
    mandi_district = data.get('mandi_district')
    buyer_phone = data.get('buyer_phone') or user.phone
    buyer_notes = data.get('buyer_notes', '').strip()

    if not product_id or qty is None:
        return error_response(code="MISSING_DATA", message="product_id and quantity are required", status_code=400)

    try:
        qty = float(qty)
        if qty <= 0:
            raise ValueError()
    except ValueError:
        return error_response(code="INVALID_QUANTITY", message="Quantity must be a positive number", status_code=400)

    # Validate product
    product = Product.query.get(product_id)
    if not product or not product.is_active or not product.is_approved:
        return error_response(code="PRODUCT_UNAVAILABLE", message="This product is currently unavailable or unapproved", status_code=400)

    # Check available stock
    if qty > product.available_quantity:
        return error_response(
            code="EXCEEDS_STOCK",
            message=f"Requested quantity ({qty} {product.unit}) exceeds currently available stock ({product.available_quantity} {product.unit})",
            status_code=400
        )

    # Proposed unit price defaults to product price if omitted or non-positive
    try:
        proposed_price = float(proposed_price) if proposed_price is not None else product.price_per_unit
        if proposed_price <= 0:
            proposed_price = product.price_per_unit
    except (ValueError, TypeError):
        proposed_price = product.price_per_unit

    total_amount = round(qty * proposed_price, 2)

    # Ensure buyer profile exists
    if not user.buyer_profile:
        buyer = BuyerProfile(
            user_id=user.id,
            business_name=user.full_name,
            delivery_address=delivery_address or "Buyer Delivery Address"
        )
        db.session.add(buyer)
        db.session.flush()
    else:
        buyer = user.buyer_profile

    # Delivery address validation
    if not delivery_address:
        delivery_address = "Preferred APMC Delivery / Farm Pickup"

    # Create PurchaseRequest tied to product and authentic seller
    purchase_req = PurchaseRequest(
        buyer_id=buyer.id,
        seller_id=product.seller_id,  # Authenticated authentic seller from product
        product_id=product.id,
        product_name=product.name,
        requested_quantity=qty,
        unit=product.unit,
        proposed_unit_price=proposed_price,
        total_amount=total_amount,
        buyer_name=user.full_name,
        buyer_phone=buyer_phone or user.phone or "Not provided",
        delivery_address=delivery_address,
        mandi_name=mandi_name or "Direct Farm Pickup",
        mandi_address=mandi_address,
        mandi_district=mandi_district or product.seller.district if product.seller else None,
        buyer_notes=buyer_notes,
        status='Pending'
    )
    db.session.add(purchase_req)

    # Notify farmer
    if product.seller and product.seller.user_id:
        notif = Notification(
            user_id=product.seller.user_id,
            title=f"New Purchase Request for {product.name}",
            message=f"Buyer {user.full_name} requested {qty} {product.unit} at Rs.{proposed_price}/{product.unit} (Total: Rs.{total_amount:,.2f}) for delivery to {mandi_name or 'Farm'}.",
            type="Order"
        )
        db.session.add(notif)

    db.session.commit()

    return success_response(
        data={"request": purchase_req.to_dict(current_user=user)},
        message="Purchase request successfully submitted to farmer",
        status_code=201
    )


@request_bp.route('', methods=['GET'])
@login_required
def list_requests():
    """
    List purchase requests filtered by authenticated user role.
    Farmers receive requests for their produce; Buyers see their submitted requests;
    Admins see platform-wide requests.
    """
    user: User = g.current_user
    status = request.args.get('status')
    product_id = request.args.get('product_id', type=int)

    query = PurchaseRequest.query

    if user.role == 'farmer':
        if not user.farmer_profile:
            return success_response(data={"requests": []})
        query = query.filter_by(seller_id=user.farmer_profile.id)
    elif user.role == 'buyer':
        if not user.buyer_profile:
            return success_response(data={"requests": []})
        query = query.filter_by(buyer_id=user.buyer_profile.id)
    elif user.role == 'admin':
        pass  # Admin views all
    else:
        # General user: check both buyer and farmer profiles
        if user.farmer_profile:
            query = query.filter_by(seller_id=user.farmer_profile.id)
        elif user.buyer_profile:
            query = query.filter_by(buyer_id=user.buyer_profile.id)
        else:
            return success_response(data={"requests": []})

    if status and status != 'All':
        query = query.filter_by(status=status)
    if product_id:
        query = query.filter_by(product_id=product_id)

    requests_list = query.order_by(PurchaseRequest.created_at.desc()).all()

    return success_response(
        data={"requests": [r.to_dict(current_user=user) for r in requests_list]},
        message=f"Retrieved {len(requests_list)} purchase requests"
    )


@request_bp.route('/<int:req_id>', methods=['GET'])
@login_required
def get_request(req_id):
    """Retrieve full request details with authorization checks."""
    user: User = g.current_user
    purchase_req = PurchaseRequest.query.get(req_id)
    if not purchase_req:
        return error_response(code="NOT_FOUND", message="Purchase request not found", status_code=404)

    # Authorization
    is_authorized = (
        user.role == 'admin' or
        (user.farmer_profile and user.farmer_profile.id == purchase_req.seller_id) or
        (user.buyer_profile and user.buyer_profile.id == purchase_req.buyer_id)
    )
    if not is_authorized:
        return error_response(code="FORBIDDEN", message="You do not have permission to view this request", status_code=403)

    return success_response(data={"request": purchase_req.to_dict(current_user=user)}, message="Request retrieved")


@request_bp.route('/<int:req_id>/respond', methods=['POST'])
@login_required
def respond_to_request(req_id):
    """
    Farmer responds to a purchase request.
    Actions:
    - 'accept' / 'Accepted': Farmer accepts proposed terms.
    - 'reject' / 'Rejected': Farmer declines request with optional notes.
    - 'negotiate' / 'Negotiation': Farmer proposes counter price and/or quantity.
    """
    user: User = g.current_user
    purchase_req = PurchaseRequest.query.get(req_id)
    if not purchase_req:
        return error_response(code="NOT_FOUND", message="Purchase request not found", status_code=404)

    if not user.farmer_profile or user.farmer_profile.id != purchase_req.seller_id:
        return error_response(code="FORBIDDEN", message="Only the intended farmer can respond to this request", status_code=403)

    if purchase_req.status in ('Completed', 'Cancelled', 'Rejected'):
        return error_response(code="INVALID_STATE", message=f"Cannot modify request in '{purchase_req.status}' state", status_code=400)

    data = request.get_json() or {}
    action = data.get('action', '').strip().lower()
    farmer_notes = data.get('farmer_notes', '').strip()

    if action in ('accept', 'accepted'):
        purchase_req.status = 'Accepted'
        purchase_req.farmer_notes = farmer_notes or "Accepted by farmer at agreed terms."
        msg = f"Farmer {user.full_name} accepted your request {purchase_req.request_number} for {purchase_req.product_name}!"

        # Notify buyer
        if purchase_req.buyer and purchase_req.buyer.user_id:
            db.session.add(Notification(
                user_id=purchase_req.buyer.user_id,
                title="Purchase Request Accepted!",
                message=f"Farmer {user.full_name} accepted your request for {purchase_req.requested_quantity} {purchase_req.unit} of {purchase_req.product_name}. You can now proceed to payment.",
                type="Order"
            ))

    elif action in ('reject', 'rejected'):
        purchase_req.status = 'Rejected'
        purchase_req.farmer_notes = farmer_notes or "Declined due to crop availability or scheduling."
        msg = f"Purchase request {purchase_req.request_number} was rejected."

        if purchase_req.buyer and purchase_req.buyer.user_id:
            db.session.add(Notification(
                user_id=purchase_req.buyer.user_id,
                title="Purchase Request Update",
                message=f"Farmer was unable to accept request {purchase_req.request_number}. Reason: {purchase_req.farmer_notes}",
                type="Order"
            ))

    elif action in ('negotiate', 'negotiation'):
        counter_price = data.get('counter_unit_price')
        counter_qty = data.get('counter_quantity')

        try:
            if counter_price is not None:
                purchase_req.counter_unit_price = float(counter_price)
            if counter_qty is not None:
                purchase_req.counter_quantity = float(counter_qty)
        except ValueError:
            return error_response(code="INVALID_INPUT", message="Counter price and quantity must be valid numbers", status_code=400)

        purchase_req.status = 'Negotiation'
        purchase_req.farmer_notes = farmer_notes or f"Farmer proposed counter offer: ₹{purchase_req.counter_unit_price}/{purchase_req.unit}"
        msg = f"Counter negotiation proposed for request {purchase_req.request_number}."

        if purchase_req.buyer and purchase_req.buyer.user_id:
            db.session.add(Notification(
                user_id=purchase_req.buyer.user_id,
                title="Farmer Counter-Offer Received",
                message=f"Farmer {user.full_name} proposed counter terms for {purchase_req.product_name}: ₹{purchase_req.counter_unit_price or purchase_req.proposed_unit_price}/{purchase_req.unit}. Review and accept in your dashboard.",
                type="Order"
            ))
    else:
        return error_response(code="INVALID_ACTION", message="Action must be 'accept', 'reject', or 'negotiate'", status_code=400)

    purchase_req.updated_at = datetime.utcnow()
    db.session.commit()

    return success_response(
        data={"request": purchase_req.to_dict(current_user=user)},
        message=msg
    )


@request_bp.route('/<int:req_id>/buyer-respond', methods=['POST'])
@login_required
def buyer_respond(req_id):
    """
    Buyer accepts farmer's counter offer or cancels the negotiation.
    """
    user: User = g.current_user
    purchase_req = PurchaseRequest.query.get(req_id)
    if not purchase_req:
        return error_response(code="NOT_FOUND", message="Purchase request not found", status_code=404)

    if not user.buyer_profile or user.buyer_profile.id != purchase_req.buyer_id:
        return error_response(code="FORBIDDEN", message="Only the requesting buyer can respond", status_code=403)

    data = request.get_json() or {}
    action = data.get('action', '').strip().lower()

    if action in ('accept_counter', 'accept'):
        if purchase_req.counter_unit_price:
            purchase_req.proposed_unit_price = purchase_req.counter_unit_price
        if purchase_req.counter_quantity:
            purchase_req.requested_quantity = purchase_req.counter_quantity
        purchase_req.total_amount = round(purchase_req.requested_quantity * purchase_req.proposed_unit_price, 2)
        purchase_req.status = 'Accepted'
        msg = "Counter-offer accepted! Request is now Accepted and ready for payment."

        # Notify farmer
        if purchase_req.seller and purchase_req.seller.user_id:
            db.session.add(Notification(
                user_id=purchase_req.seller.user_id,
                title="Counter Offer Accepted",
                message=f"Buyer {user.full_name} accepted your counter offer for {purchase_req.product_name}. Total: Rs.{purchase_req.total_amount:,.2f}.",
                type="Order"
            ))
    elif action in ('cancel', 'cancelled'):
        purchase_req.status = 'Cancelled'
        msg = "Purchase request cancelled."
    else:
        return error_response(code="INVALID_ACTION", message="Action must be 'accept_counter' or 'cancel'", status_code=400)

    purchase_req.updated_at = datetime.utcnow()
    db.session.commit()

    return success_response(data={"request": purchase_req.to_dict(current_user=user)}, message=msg)


@request_bp.route('/<int:req_id>/convert-to-order', methods=['POST'])
@login_required
def convert_to_order(req_id):
    """
    Converts an Accepted purchase request directly into an official Order.
    Initializes Razorpay and farmer settlement payment state machine.
    """
    user: User = g.current_user
    purchase_req = PurchaseRequest.query.get(req_id)
    if not purchase_req:
        return error_response(code="NOT_FOUND", message="Purchase request not found", status_code=404)

    if not user.buyer_profile or user.buyer_profile.id != purchase_req.buyer_id:
        return error_response(code="FORBIDDEN", message="Only the requesting buyer can convert to order", status_code=403)

    if purchase_req.status != 'Accepted':
        return error_response(code="NOT_ACCEPTED", message=f"Request must be 'Accepted' by farmer before checkout (current status: {purchase_req.status})", status_code=400)

    if purchase_req.order_id:
        order = Order.query.get(purchase_req.order_id)
        if order:
            payment_info = initiate_order_payment(order)
            return success_response(
                data={"order": order.to_dict(current_user=user), "payment_init": payment_info},
                message="Existing order credentials retrieved"
            )

    product = Product.query.get(purchase_req.product_id)
    if not product or not product.is_active:
        return error_response(code="PRODUCT_UNAVAILABLE", message="Product is no longer available", status_code=400)

    data = request.get_json() or {}
    shipping_addr = data.get('shipping_address') or purchase_req.delivery_address
    contact_phone = data.get('contact_phone') or purchase_req.buyer_phone or user.phone
    payment_method = data.get('payment_method', 'UPI')

    # Create Order
    order = Order(
        buyer_id=purchase_req.buyer_id,
        seller_id=purchase_req.seller_id,
        purchase_request_id=purchase_req.id,
        total_amount=purchase_req.total_amount,
        shipping_address=shipping_addr,
        contact_phone=contact_phone,
        mandi_name=purchase_req.mandi_name,
        mandi_address=purchase_req.mandi_address,
        order_status='Pending'
    )
    db.session.add(order)
    db.session.flush()

    # Create OrderItem
    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        seller_id=purchase_req.seller_id,
        product_name=purchase_req.product_name,
        quantity=purchase_req.requested_quantity,
        unit_price=purchase_req.proposed_unit_price,
        subtotal=purchase_req.total_amount
    )
    db.session.add(item)

    # Reserve Stock
    product.reserved_quantity = (product.reserved_quantity or 0) + purchase_req.requested_quantity
    product.available_quantity = max(0.0, (product.available_quantity or 0) - purchase_req.requested_quantity)
    db.session.add(product)

    res = OrderReservation(
        order_id=order.id,
        product_id=product.id,
        reserved_qty=purchase_req.requested_quantity,
        expires_at=datetime.utcnow() + timedelta(minutes=20)
    )
    db.session.add(res)

    # Link request to order
    purchase_req.order_id = order.id
    purchase_req.status = 'Completed'

    # Initiate payment state machine
    payment_init = initiate_order_payment(order, payment_method=payment_method)

    db.session.commit()

    return success_response(
        data={
            "order": order.to_dict(current_user=user),
            "payment_init": payment_init,
            "request_id": purchase_req.id
        },
        message="Purchase request successfully converted to Order. Proceed to payment.",
        status_code=201
    )
