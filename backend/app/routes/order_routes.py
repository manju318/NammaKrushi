"""
Order Management Routes (/api/orders)
Handles cart conversion, multi-vendor order placement, order history, and status tracking.
"""

from flask import Blueprint, request, g
from app.models.user import User
from app.models.marketplace import Product, Order, OrderItem
from app.services.payment_service import initiate_order_payment
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

order_bp = Blueprint('orders', __name__)

@order_bp.route('', methods=['POST'])
@login_required
def create_order():
    user: User = g.current_user
    if not user.buyer_profile:
        # If farmer wants to purchase, auto-create buyer profile
        from app.models.user import BuyerProfile
        buyer = BuyerProfile(user_id=user.id, business_name=user.full_name, delivery_address="Default Farm Address")
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

    total_amount = 0.0
    order_items_to_create = []

    # Validate each item and check stock
    for item in items_input:
        prod_id = item.get('product_id')
        qty = float(item.get('quantity', 1.0))
        product = Product.query.get(prod_id)

        if not product or not product.is_active:
            return error_response(code="PRODUCT_UNAVAILABLE", message=f"Product with ID {prod_id} is no longer available", status_code=400)

        if product.available_quantity < qty:
            return error_response(
                code="INSUFFICIENT_STOCK",
                message=f"Only {product.available_quantity} {product.unit} available for '{product.name}'. Requested: {qty}.",
                status_code=400
            )

        subtotal = round(qty * product.price_per_unit, 2)
        total_amount += subtotal

        # Reserve/deduct stock
        product.available_quantity -= qty

        order_items_to_create.append({
            "product_id": product.id,
            "seller_id": product.seller_id,
            "product_name": product.name,
            "quantity": qty,
            "unit_price": product.price_per_unit,
            "subtotal": subtotal
        })

    total_amount = round(total_amount, 2)

    # Create Order
    order = Order(
        buyer_id=buyer.id,
        total_amount=total_amount,
        shipping_address=shipping_addr,
        contact_phone=contact_phone,
        order_status='Pending'
    )
    db.session.add(order)
    db.session.flush()

    # Create OrderItems
    for oi in order_items_to_create:
        item_obj = OrderItem(
            order_id=order.id,
            product_id=oi["product_id"],
            seller_id=oi["seller_id"],
            product_name=oi["product_name"],
            quantity=oi["quantity"],
            unit_price=oi["unit_price"],
            subtotal=oi["subtotal"]
        )
        db.session.add(item_obj)

    # Initiate payment state machine
    payment_init = initiate_order_payment(order, payment_method=payment_method)

    db.session.commit()

    return success_response(
        data={
            "order": order.to_dict(),
            "payment_init": payment_init
        },
        message="Order created successfully. Ready for payment processing.",
        status_code=201
    )


@order_bp.route('', methods=['GET'])
@login_required
def list_orders():
    user: User = g.current_user
    
    if user.role == 'farmer' and user.farmer_profile:
        # Farmer view: orders that contain their products
        farmer_id = user.farmer_profile.id
        items = OrderItem.query.filter_by(seller_id=farmer_id).all()
        order_ids = list(set([i.order_id for i in items]))
        orders = Order.query.filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all() if order_ids else []
    else:
        # Buyer view
        buyer_id = user.buyer_profile.id if user.buyer_profile else None
        if not buyer_id:
            return success_response(data={"orders": []}, message="No orders found")
        orders = Order.query.filter_by(buyer_id=buyer_id).order_by(Order.created_at.desc()).all()

    return success_response(data={"orders": [o.to_dict() for o in orders]}, message="Orders retrieved successfully")


@order_bp.route('/<int:order_id>', methods=['GET'])
@login_required
def get_order_details(order_id):
    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    return success_response(data={"order": order.to_dict()}, message="Order details retrieved")
