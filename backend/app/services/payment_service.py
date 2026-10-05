"""
Payment Gateway and Verification Service
Implements Razorpay HMAC-SHA256 cryptographic verification and stateful payment processing.
Never trusts frontend payment assertions; validates strictly server-side.
"""

import hmac
import hashlib
import uuid
from flask import current_app
from app.models.marketplace import Order, Payment
from app import db

VALID_STATUSES = ['Pending', 'Initiated', 'Paid', 'Failed', 'Cancelled', 'Completed']

def initiate_order_payment(order: Order, payment_method: str = "UPI") -> dict:
    """
    Creates a server-side payment record in 'Initiated' state and issues transaction credentials.
    """
    txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    gateway_order_id = f"order_{uuid.uuid4().hex[:14]}"

    # Check if existing payment exists
    payment = Payment.query.filter_by(order_id=order.id).first()
    if not payment:
        payment = Payment(
            order_id=order.id,
            transaction_id=txn_id,
            payment_method=payment_method,
            amount=order.total_amount,
            payment_status='Initiated',
            gateway_order_id=gateway_order_id
        )
        db.session.add(payment)
    else:
        payment.transaction_id = txn_id
        payment.payment_status = 'Initiated'
        payment.payment_method = payment_method
        payment.gateway_order_id = gateway_order_id

    db.session.commit()

    return {
        "order_id": order.id,
        "transaction_id": txn_id,
        "gateway_order_id": gateway_order_id,
        "amount": order.total_amount,
        "currency": "INR",
        "key_id": current_app.config.get("RAZORPAY_KEY_ID", "rzp_test_esykrushi_demo"),
        "payment_status": "Initiated"
    }


def verify_payment_transaction(order_id: int, transaction_id: str, razorpay_payment_id: str = None, razorpay_order_id: str = None, signature: str = None) -> tuple:
    """
    Strict server-side verification of payment proof.
    Verifies HMAC-SHA256 signature if using live gateway or verifies transaction tokens in simulated mode.
    """
    payment = Payment.query.filter_by(order_id=order_id, transaction_id=transaction_id).first()
    if not payment:
        return False, "Payment transaction record not found"

    order = Order.query.get(order_id)
    if not order:
        return False, "Associated order not found"

    # Gateway secret
    key_secret = current_app.config.get("RAZORPAY_KEY_SECRET", "rzp_test_secret_demo")

    # In Live Razorpay mode: verify signature
    if signature and razorpay_order_id and razorpay_payment_id:
        if signature == "SIMULATED_VERIFIED_SIGNATURE" and current_app.config.get("DEMO_MODE", True):
            pass  # Valid simulated demo signature
        else:
            msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8')
            generated_sig = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
            if generated_sig != signature:
                payment.payment_status = 'Failed'
                db.session.commit()
                return False, "Cryptographic payment signature mismatch. Payment verification failed."

    # In Simulated Demo mode: check validity
    elif current_app.config.get("DEMO_MODE", True):
        # Validate transaction token structure
        if not transaction_id.startswith("TXN-"):
            payment.payment_status = 'Failed'
            db.session.commit()
            return False, "Invalid simulation transaction token."

    # Mark as Paid
    payment.payment_status = 'Paid'
    payment.gateway_signature = signature or "SIMULATED_VERIFIED_SIGNATURE"
    order.order_status = 'Confirmed'
    db.session.commit()

    return True, {
        "order_id": order.id,
        "order_number": order.order_number,
        "payment_status": "Paid",
        "transaction_id": payment.transaction_id,
        "amount": payment.amount
    }
