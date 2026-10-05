"""
Payment Verification Routes (/api/payments)
Provides server-side transaction validation, HMAC cryptographic signature checking, and webhook receiver.
"""

from flask import Blueprint, request, g
from app.models.marketplace import Order
from app.services.payment_service import initiate_order_payment, verify_payment_transaction
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

payment_bp = Blueprint('payments', __name__)

@payment_bp.route('/create', methods=['POST'])
@login_required
def create_payment():
    data = request.get_json() or {}
    order_id = data.get('order_id')
    payment_method = data.get('payment_method', 'UPI')

    if not order_id:
        return error_response(code="MISSING_ORDER_ID", message="order_id is required", status_code=400)

    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    payment_info = initiate_order_payment(order, payment_method)
    return success_response(data=payment_info, message="Payment initiated")


@payment_bp.route('/verify', methods=['POST'])
@login_required
def verify_payment():
    data = request.get_json() or {}
    order_id = data.get('order_id')
    txn_id = data.get('transaction_id')
    sig = data.get('razorpay_signature')
    p_id = data.get('razorpay_payment_id')
    o_id = data.get('razorpay_order_id')

    if not order_id or not txn_id:
        return error_response(code="MISSING_VERIFICATION_DATA", message="order_id and transaction_id are required", status_code=400)

    success, result = verify_payment_transaction(
        order_id=order_id,
        transaction_id=txn_id,
        razorpay_payment_id=p_id,
        razorpay_order_id=o_id,
        signature=sig
    )

    if not success:
        return error_response(code="PAYMENT_VERIFICATION_FAILED", message=str(result), status_code=400)

    return success_response(data=result, message="Payment verified successfully by server. Order confirmed.")


@payment_bp.route('/webhook', methods=['POST'])
def payment_webhook():
    """
    Webhook handler for asynchronous gateway event notifications.
    """
    event = request.get_json() or {}
    # Process webhook events in production
    return success_response(message="Webhook received")
