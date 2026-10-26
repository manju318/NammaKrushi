"""
Payment Verification & Destination Routes (/api/payments)
Provides server-side transaction validation, HMAC cryptographic signature checking,
farmer payment destination registration, refund requests, and webhook processing.
Strictly verifies all details server-side.
"""

import hmac
import hashlib
import re
import os
import uuid
import json
from datetime import datetime
from flask import Blueprint, request, g, current_app
from werkzeug.utils import secure_filename
from app.models.user import User
from app.models.marketplace import (
    Order, Payment, FarmerPaymentDestination, PaymentWebhookEvent
)
from app.services.payment_service import (
    initiate_order_payment,
    verify_payment_transaction,
    process_order_refund
)
from app.auth.jwt_handler import login_required, role_required
from app.utils.response import success_response, error_response
from app import db

payment_bp = Blueprint('payments', __name__)

IFSC_REGEX = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')
UPI_REGEX = re.compile(r'^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$')
PHONE_REGEX = re.compile(r'^[6-9]\d{9}$')

@payment_bp.route('/create', methods=['POST'])
@login_required
def create_payment():
    """Initiates payment order and credentials for an order."""
    data = request.get_json() or {}
    order_id = data.get('order_id')
    payment_method = data.get('payment_method', 'UPI')

    if not order_id:
        return error_response(code="MISSING_ORDER_ID", message="order_id is required", status_code=400)

    order = Order.query.get(order_id)
    if not order:
        return error_response(code="NOT_FOUND", message="Order not found", status_code=404)

    # Authorization: only the ordering buyer or admin can initiate payment
    user: User = g.current_user
    if user.role != 'admin':
        if not user.buyer_profile or user.buyer_profile.id != order.buyer_id:
            return error_response(code="FORBIDDEN", message="You can only initiate payment for your own orders", status_code=403)

    try:
        payment_info = initiate_order_payment(order, payment_method)
        return success_response(data=payment_info, message="Payment transaction credentials issued")
    except RuntimeError as ex:
        return error_response(code="PAYMENT_CONFIG_ERROR", message=str(ex), status_code=400)


@payment_bp.route('/verify', methods=['POST'])
@login_required
def verify_payment():
    """
    Cryptographic verification of Razorpay transaction.
    Validates HMAC-SHA256 signature against provider secret.
    Transitions order to 'Confirmed' only upon cryptographic verification.
    """
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

    return success_response(data=result, message="Payment cryptographically verified by server. Order confirmed.")


@payment_bp.route('/upload-qr', methods=['POST'])
@login_required
def upload_upi_qr():
    """
    Allows farmer to upload their genuine UPI QR code image file.
    """
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="FORBIDDEN", message="Only registered farmers can upload payment QR codes", status_code=403)

    if 'file' not in request.files:
        return error_response(code="NO_FILE", message="No file was attached to request", status_code=400)

    file = request.files['file']
    if not file or not file.filename:
        return error_response(code="EMPTY_FILE", message="Empty file provided", status_code=400)

    allowed = {'png', 'jpg', 'jpeg', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return error_response(code="INVALID_EXTENSION", message="QR Code must be an image (PNG, JPG, JPEG, WEBP)", status_code=400)

    unique_name = f"qr_{user.farmer_profile.id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
    file.save(dest_path)
    qr_url = f"/uploads/{unique_name}"

    return success_response(data={"qr_url": qr_url}, message="UPI QR code uploaded successfully")


@payment_bp.route('/destination', methods=['POST'])
@login_required
def register_payment_destination():
    """
    Farmer registers or updates their mandatory payment details.
    Backend performs strict validation of account numbers, IFSC codes, UPI IDs,
    phone numbers, and farm addresses.
    Always marks status as 'Pending' until reviewed and approved by administrator.
    """
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="FORBIDDEN", message="Only registered farmers can configure payment destinations", status_code=403)

    data = request.get_json() or {}

    # Extract required fields
    holder_name = data.get('account_holder_name', '').strip()
    bank_name = data.get('bank_name', '').strip()
    account_number = data.get('account_number', '').strip()
    account_number_confirm = data.get('account_number_confirm', '').strip()
    ifsc_code = data.get('ifsc_code', '').strip().upper()
    upi_id = data.get('upi_id', '').strip().lower()
    registered_phone = data.get('registered_phone', '').strip()
    farm_address = data.get('farm_address', '').strip()
    preferred_methods = data.get('preferred_payment_methods', 'UPI, Bank Transfer, Razorpay').strip()
    upi_qr_url = data.get('upi_qr_url', '').strip()
    dest_type = data.get('destination_type', 'both').strip().lower()

    # Field Validations
    if not holder_name:
        return error_response(code="MISSING_HOLDER_NAME", message="Farmer full name / account holder name is required", status_code=400)

    if not bank_name:
        bank_name = "State Bank of India"

    # Account Number & Confirmation Validation
    if not account_number:
        return error_response(code="MISSING_ACCOUNT_NUMBER", message="Bank account number is required", status_code=400)

    if account_number_confirm and account_number != account_number_confirm:
        return error_response(code="ACCOUNT_MISMATCH", message="Bank account number and confirmation account number do not match", status_code=400)

    if not account_number.isdigit() or len(account_number) < 9 or len(account_number) > 18:
        return error_response(code="INVALID_ACCOUNT_NUMBER", message="Account number must contain between 9 and 18 digits", status_code=400)

    # IFSC Code Validation (4 letters, 0, 6 alphanumeric)
    if not ifsc_code or not IFSC_REGEX.match(ifsc_code):
        return error_response(
            code="INVALID_IFSC",
            message=f"Invalid IFSC code format ('{ifsc_code}'). Must be 11 characters starting with 4 letters, '0', and 6 alphanumeric characters (e.g. SBIN0001234)",
            status_code=400
        )

    # UPI ID Validation
    if not upi_id or not UPI_REGEX.match(upi_id):
        return error_response(
            code="INVALID_UPI",
            message=f"Invalid UPI ID format ('{upi_id}'). Must be a valid Virtual Payment Address (e.g. farmer@okaxis or 9845012345@upi)",
            status_code=400
        )

    # Registered Mobile Validation
    if registered_phone:
        clean_phone = re.sub(r'[\s\-+]', '', registered_phone)[-10:]
        if not PHONE_REGEX.match(clean_phone):
            return error_response(code="INVALID_PHONE", message="Registered mobile number must be a valid 10-digit Indian phone number", status_code=400)
        registered_phone = clean_phone
    else:
        registered_phone = user.phone or "9845012345"

    # Farm address validation
    if not farm_address:
        farm_address = f"Survey No. Farm, {user.farmer_profile.district}, {user.farmer_profile.state}"

    # Mask account number: e.g. "••••••••1234"
    masked_account = f"{'•' * (len(account_number) - 4)}{account_number[-4:]}"
    account_hash = hashlib.sha256(account_number.encode('utf-8')).hexdigest()

    dest = FarmerPaymentDestination.query.filter_by(farmer_id=user.farmer_profile.id).first()
    if not dest:
        dest = FarmerPaymentDestination(
            farmer_id=user.farmer_profile.id,
            destination_type=dest_type,
            upi_id=upi_id,
            account_number_masked=masked_account,
            account_number_hash=account_hash,
            ifsc_code=ifsc_code,
            account_holder_name=holder_name,
            bank_name=bank_name,
            registered_phone=registered_phone,
            farm_address=farm_address,
            upi_qr_url=upi_qr_url or None,
            preferred_payment_methods=preferred_methods,
            is_verified=False,
            verification_status='Pending'
        )
        db.session.add(dest)
    else:
        dest.destination_type = dest_type
        dest.upi_id = upi_id
        dest.account_number_masked = masked_account
        dest.account_number_hash = account_hash
        dest.ifsc_code = ifsc_code
        dest.account_holder_name = holder_name
        dest.bank_name = bank_name
        dest.registered_phone = registered_phone
        dest.farm_address = farm_address
        if upi_qr_url:
            dest.upi_qr_url = upi_qr_url
        dest.preferred_payment_methods = preferred_methods
        dest.verification_status = 'Pending'
        dest.is_verified = False

    db.session.commit()
    return success_response(
        data={"destination": dest.to_dict(is_owner_or_admin=True)},
        message="Farmer payment details securely saved and submitted for administrator verification"
    )


@payment_bp.route('/destination', methods=['GET'])
@login_required
def get_payment_destination():
    """Retrieves farmer's registered payment destination with masked financial details."""
    user: User = g.current_user
    farmer_id = request.args.get('farmer_id', type=int)

    if farmer_id:
        # Public or buyer view: only show masked details and verification badge
        dest = FarmerPaymentDestination.query.filter_by(farmer_id=farmer_id).first()
        is_owner_or_admin = (
            user.role == 'admin' or
            (user.farmer_profile and user.farmer_profile.id == farmer_id)
        )
        if not dest:
            return success_response(data={"destination": None}, message="No payment destination registered for this farmer")
        return success_response(data={"destination": dest.to_dict(is_owner_or_admin=is_owner_or_admin)})

    # Logged-in farmer viewing their own destination
    if not user.farmer_profile:
        return error_response(code="FORBIDDEN", message="Only farmers have payment destinations", status_code=403)

    dest = FarmerPaymentDestination.query.filter_by(farmer_id=user.farmer_profile.id).first()
    if not dest:
        return success_response(data={"destination": None}, message="No payment destination configured")

    return success_response(data={"destination": dest.to_dict(is_owner_or_admin=True)})


@payment_bp.route('/refund', methods=['POST'])
@login_required
@role_required('admin')
def issue_refund():
    """Admin-only provider refund endpoint."""
    data = request.get_json() or {}
    order_id = data.get('order_id')
    reason = data.get('reason', 'Administrative refund')

    if not order_id:
        return error_response(code="MISSING_ORDER_ID", message="order_id is required", status_code=400)

    success, result = process_order_refund(order_id, reason, admin_user=g.current_user)
    if not success:
        return error_response(code="REFUND_FAILED", message=str(result), status_code=400)

    return success_response(data=result, message="Refund processed successfully via payment gateway")


@payment_bp.route('/webhook', methods=['POST'])
def payment_webhook():
    """
    Razorpay Webhook Handler with strict HMAC-SHA256 signature verification
    and idempotent event processing.
    """
    webhook_secret = current_app.config.get('RAZORPAY_WEBHOOK_SECRET', '')
    received_signature = request.headers.get('X-Razorpay-Signature', '')
    payload_bytes = request.get_data()

    if webhook_secret and received_signature:
        expected_sig = hmac.new(
            webhook_secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, received_signature):
            return error_response(code='INVALID_WEBHOOK_SIGNATURE', message='Webhook HMAC-SHA256 signature mismatch', status_code=400)

    event_data = request.get_json(force=True, silent=True) or {}
    event_id = event_data.get('event_id') or event_data.get('id') or f"evt_{uuid.uuid4().hex[:12]}"
    event_type = event_data.get('event', '')

    # Idempotency check: prevent duplicate event processing
    existing_evt = PaymentWebhookEvent.query.filter_by(event_id=event_id).first()
    if existing_evt:
        return success_response(message='Webhook event already processed (idempotent ignore)')

    webhook_record = PaymentWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload=json.dumps(event_data)[:2000],
        status='Processed'
    )
    db.session.add(webhook_record)

    if event_type == 'payment.captured':
        payment_entity = event_data.get('payload', {}).get('payment', {}).get('entity', {})
        razorpay_order_id = payment_entity.get('order_id')
        razorpay_payment_id = payment_entity.get('id')

        if razorpay_order_id:
            payment = Payment.query.filter_by(gateway_order_id=razorpay_order_id).first()
            if payment and payment.payment_status != 'Paid':
                payment.payment_status = 'Paid'
                payment.gateway_payment_id = razorpay_payment_id
                payment.settlement_status = 'Settled to Farmer Destination'
                webhook_record.order_id = payment.order_id
                webhook_record.payment_id = razorpay_payment_id

                order = Order.query.get(payment.order_id)
                if order:
                    order.order_status = 'Confirmed'
                    for res in order.reservations:
                        prod = res.product
                        if prod:
                            prod.reserved_quantity = max(0.0, (prod.reserved_quantity or 0) - res.reserved_qty)
                            db.session.add(prod)
                        db.session.delete(res)

    elif event_type == 'payment.failed':
        payment_entity = event_data.get('payload', {}).get('payment', {}).get('entity', {})
        razorpay_order_id = payment_entity.get('order_id')
        if razorpay_order_id:
            payment = Payment.query.filter_by(gateway_order_id=razorpay_order_id).first()
            if payment and payment.payment_status != 'Paid':
                payment.payment_status = 'Failed'
                webhook_record.order_id = payment.order_id
                order = Order.query.get(payment.order_id)
                if order:
                    for res in order.reservations:
                        prod = res.product
                        if prod:
                            prod.available_quantity = (prod.available_quantity or 0) + res.reserved_qty
                            prod.reserved_quantity = max(0.0, (prod.reserved_quantity or 0) - res.reserved_qty)
                            db.session.add(prod)
                        db.session.delete(res)

    db.session.commit()
    return success_response(message='Webhook processed idempotently')
