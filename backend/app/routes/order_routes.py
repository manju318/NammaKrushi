"""
Order Management Routes (/api/orders)
Handles multi-vendor cart conversion, direct farmer order splitting,
stock reservation, stateful payment credentials, and privacy-protected order tracking.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, g
from app.models.user import User
from app.models.marketplace import Product, Order, OrderItem, OrderReservation, MarketplaceDispute
from app.services.payment_service import initiate_order_payment
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

order_bp = Blueprint('orders', __name__)

@order_bp.route('', methods=['POST'])
@login_required
def create_order():
    """
    Creates order(s) from cart items.
    If cart contains items from multiple farmers, splits them into separate,
    farmer-specific orders and payments so money flows directly to each intended seller.
    """
    user: User = g.current_user
    if not user.buyer_profile:
        from app.models.user import BuyerProfile
        buyer = BuyerProfile(user_id=user.id, business_name=user.full_name, delivery_address="Default Farm Delivery Address")
        db.session.add(buyer)
        db.session.flush()
    else:
        buyer = user.buyer_profile

    data = request.get_json() or {}
    items_input = data.get('items', [])
    shipping_addr = data.get('shipping_address')
    contact_phone = data.get('contact_phone')
    payment_method = data.get('payment_method', 'UPI')

    if not items_input or not shipping_addr or not contact_phone:
        return error_response(code="MISSING_ORDER_DATA", message="Items list, shipping address, and contact phone are required", status_code=400)

    # Group items by seller_id (farmer) to support direct farmer settlement
    items_by_seller = {}

    for item in items_input:
        prod_id = item.get('product_id')
        qty = float(item.get('quantity', 1.0))
        product = Product.query.get(prod_id)

        if not product or not product.is_active or not product.is_approved:
            return error_response(
                code="PRODUCT_UNAVAILABLE",
                message=f"Product with ID {prod_id} is unavailable or awaiting admin approval",
                status_code=400
            )

        # Check effective available stock
        effective_available = product.available_quantity
        if effective_available < qty:
            return error_response(
                code="INSUFFICIENT_STOCK",
                message=f"Only {effective_available} {product.unit} available for '{product.name}'. Requested: {qty}.",
                status_code=400
            )

        subtotal = round(qty * product.price_per_unit, 2)
        seller_id = product.seller_id

        items_by_seller.setdefault(seller_id, []).append({
            "product": product,
            "product_id": product.id,
            "product_name": product.name,
            "quantity": qty,
            "unit_price": product.price_per_unit,
            "subtotal": subtotal
        })

    created_orders = []
    created_payments = []

    # Process each farmer-specific sub-order
    for seller_id, seller_items in items_by_seller.items():
        seller_subtotal = round(sum(i["subtotal"] for i in seller_items), 2)

        order = Order(
            buyer_id=buyer.id,
            seller_id=seller_id,
            total_amount=seller_subtotal,
            shipping_address=shipping_addr,
            contact_phone=contact_phone,
            order_status='Pending'
        )
        db.session.add(order)
        db.session.flush()

        # Create OrderItems and manage stock reservations
        for item_data in seller_items:
            prod = item_data["product"]
            qty = item_data["quantity"]

            item_obj = OrderItem(
                order_id=order.id,
                product_id=prod.id,
                seller_id=seller_id,
                product_name=item_data["product_name"],
                quantity=qty,
                unit_price=item_data["unit_price"],
                subtotal=item_data["subtotal"]
            )
            db.session.add(item_obj)

            # Stock reservation logic
            prod.reserved_quantity = (prod.reserved_quantity or 0) + qty
            prod.available_quantity = max(0.0, (prod.available_quantity or 0) - qty)

            reservation = OrderReservation(
                order_id=order.id,
                product_id=prod.id,
                reserved_qty=qty,
                expires_at=datetime.utcnow() + timedelta(minutes=15)
            )
            db.session.add(reservation)
            db.session.add(prod)

        # Initiate Razorpay payment state machine linked directly to this order & seller
        payment_init = initiate_order_payment(order, payment_method=payment_method)
        created_orders.append(order)
        created_payments.append(payment_init)

    db.session.commit()

    # If single seller (standard checkout)
    primary_order = created_orders[0]
    primary_payment = created_payments[0]

    return success_response(
        data={
            "order": primary_order.to_dict(current_user=user),
            "payment_init": primary_payment,
            "orders": [o.to_dict(current_user=user) for o in created_orders],
            "payment_inits": created_payments,
            "is_multi_farmer_order": len(created_orders) > 1
        },
        message="Order created successfully. Direct payment transaction initialized.",
        status_code=201
    )


@order_bp.route('', methods=['GET'])
@login_required
def list_orders():
    """
    Retrieves orders filtered by user role with strict privacy protections.
    """
    user: User = g.current_user

    if user.role == 'farmer' and user.farmer_profile:
        farmer_id = user.farmer_profile.id
        orders = Order.query.filter_by(seller_id=farmer_id).order_by(Order.created_at.desc()).all()
        if not orders:
            # Fallback for orders created via order_items
            items = OrderItem.query.filter_by(seller_id=farmer_id).all()
            order_ids = list(set([i.order_id for i in items]))
            orders = Order.query.filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all() if order_ids else []
    elif user.role == 'admin':
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        buyer_id = user.buyer_profile.id if user.buyer_profile else None
        if not buyer_id:
            return success_response(data={"orders": []}, message="No orders found")
        orders = Order.query.filter_by(buyer_id=buyer_id).order_by(Order.created_at.desc()).all()

    return success_response(
        data={"orders": [o.to_dict(current_user=user) for o in orders]},
        message="Orders retrieved successfully"
    )


@order_bp.route('/<int:order_id>', methods=['GET'])
@login_required
def get_order_details(order_id):
    """
    Inspects order with role-based access control.
    Prevents buyers and farmers from viewing transactions belonging to other users.
    """
    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    user: User = g.current_user
    # Authorization check
    if user.role != 'admin':
        is_buyer = (user.buyer_profile and user.buyer_profile.id == order.buyer_id)
        is_seller = (user.farmer_profile and (order.seller_id == user.farmer_profile.id or any(i.seller_id == user.farmer_profile.id for i in order.items)))
        if not is_buyer and not is_seller:
            return error_response(code="FORBIDDEN", message="You are not authorized to view this order", status_code=403)

    return success_response(data={"order": order.to_dict(current_user=user)}, message="Order details retrieved")


@order_bp.route('/<int:order_id>/cancel', methods=['POST'])
@login_required
def cancel_order(order_id):
    """
    Cancels an order and immediately releases reserved product stock.
    """
    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    user: User = g.current_user
    is_buyer = (user.buyer_profile and user.buyer_profile.id == order.buyer_id)
    is_seller = (user.farmer_profile and order.seller_id == user.farmer_profile.id)

    if user.role != 'admin' and not is_buyer and not is_seller:
        return error_response(code="FORBIDDEN", message="Unauthorized to cancel this order", status_code=403)

    if order.order_status in ('Delivered', 'Cancelled'):
        return error_response(code="INVALID_STATE", message=f"Cannot cancel order in '{order.order_status}' status", status_code=400)

    # Release stock
    for item in order.items:
        prod = Product.query.get(item.product_id)
        if prod:
            prod.available_quantity = (prod.available_quantity or 0) + item.quantity
            prod.reserved_quantity = max(0.0, (prod.reserved_quantity or 0) - item.quantity)
            db.session.add(prod)

    order.order_status = 'Cancelled'
    if order.payment:
        order.payment.payment_status = 'Cancelled'

    db.session.commit()
    return success_response(data={"order": order.to_dict(current_user=user)}, message="Order successfully cancelled and stock released")


@order_bp.route('/<int:order_id>/dispute', methods=['POST'])
@login_required
def raise_order_dispute(order_id):
    """
    Allows a buyer to raise a dispute or request a refund for damaged/mismatched produce.
    """
    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    user: User = g.current_user
    data = request.get_json() or {}
    issue_type = data.get('issue_type', 'quality_mismatch')
    description = data.get('description')
    refund_requested = bool(data.get('refund_requested', False))

    if not description:
        return error_response(code="MISSING_DATA", message="Dispute description is required", status_code=400)

    dispute = MarketplaceDispute(
        order_id=order.id,
        raised_by_id=user.id,
        issue_type=issue_type,
        description=description,
        refund_requested=refund_requested,
        status='Open'
    )
    db.session.add(dispute)
    db.session.commit()

    return success_response(
        data={"dispute": dispute.to_dict()},
        message="Dispute registered. Our agricultural resolution team will review within 24 hours.",
        status_code=201
    )
