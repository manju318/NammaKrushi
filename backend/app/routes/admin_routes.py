"""
Admin Moderation & Governance Routes (/api/admin)
Enforces strict role-based access control, dedicated product moderation queue,
media & GPS evidence validation, farmer payment destination review,
transaction auditing, dispute management, and immutable audit logging.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User, FarmerProfile, BuyerProfile, VerifiedSeller
from app.models.farm import Farm
from app.models.marketplace import (
    Product, Order, Payment, FarmerPaymentDestination,
    AdminAuditLog, MarketplaceDispute, PurchaseRequest
)
from app.auth.jwt_handler import role_required
from ml.evaluate import get_model_evaluation_metrics
from app.utils.response import success_response, error_response
from app import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@role_required(['admin'])
def get_admin_dashboard():
    """Returns platform-wide operational, moderation, and financial governance metrics."""
    total_users = User.query.count()
    total_farmers = FarmerProfile.query.count()
    total_buyers = BuyerProfile.query.count()

    # Product moderation breakdown
    pending_products = Product.query.filter_by(approval_status='Pending Review').count()
    approved_products = Product.query.filter(Product.approval_status == 'Approved', Product.is_active == True).count()
    rejected_products = Product.query.filter_by(approval_status='Rejected').count()
    suspended_products = Product.query.filter_by(approval_status='Suspended').count()

    # Seller & payment destination verification breakdown
    verified_sellers = VerifiedSeller.query.filter_by(verification_status='Verified').count()
    pending_sellers = VerifiedSeller.query.filter_by(verification_status='Pending').count()
    pending_destinations = FarmerPaymentDestination.query.filter_by(verification_status='Pending').count()

    # Orders & Financials
    total_orders = Order.query.count()
    paid_payments = Payment.query.filter_by(payment_status='Paid').all()
    failed_payments = Payment.query.filter_by(payment_status='Failed').count()
    refunded_payments = Payment.query.filter_by(payment_status='Refunded').count()
    total_revenue = sum(p.amount for p in paid_payments)

    open_disputes = MarketplaceDispute.query.filter_by(status='Open').count()

    ml_metrics = get_model_evaluation_metrics()

    stats = {
        "total_users": total_users,
        "farmers_count": total_farmers,
        "buyers_count": total_buyers,
        "active_products": approved_products,
        "pending_products": pending_products,
        "rejected_products": rejected_products,
        "suspended_products": suspended_products,
        "verified_sellers_count": verified_sellers,
        "pending_verifications": pending_sellers,
        "pending_destinations": pending_destinations,
        "total_orders": total_orders,
        "paid_orders_count": len(paid_payments),
        "failed_payments_count": failed_payments,
        "refunded_payments_count": refunded_payments,
        "open_disputes_count": open_disputes,
        "platform_volume_rs": round(total_revenue, 2),
        "ml_model_accuracy": ml_metrics.get("accuracy"),
        "ml_model_status": "Operational (Random Forest 100 Trees)"
    }

    return success_response(
        data={"stats": stats, "ml_metrics": ml_metrics},
        message="Admin dashboard governance metrics retrieved"
    )


@admin_bp.route('/products/queue', methods=['GET'])
@role_required(['admin'])
def get_product_approval_queue():
    """
    Dedicated product moderation queue.
    Returns all submitted products with original media, extracted EXIF metadata,
    device GPS capture records, accuracy, capture timestamps, declared farm coordinates,
    and verification warnings.
    """
    status_filter = request.args.get('status')
    query = Product.query

    if status_filter and status_filter != 'All':
        query = query.filter_by(approval_status=status_filter)
    else:
        # Default: show pending first, then all
        query = query.order_by(Product.created_at.desc())

    products = query.all()

    # Enhance each item with declared farm coordinates for map comparison
    results = []
    for p in products:
        p_dict = p.to_dict()
        declared_lat = None
        declared_lon = None
        if p.seller:
            farm = Farm.query.filter_by(farmer_id=p.seller.id).first()
            if farm and farm.latitude and farm.longitude:
                declared_lat = farm.latitude
                declared_lon = farm.longitude

        p_dict["declared_farm_coordinates"] = {
            "latitude": declared_lat,
            "longitude": declared_lon,
            "location_name": p.farm_location
        }
        results.append(p_dict)

    return success_response(
        data={"products": results, "total": len(results)},
        message="Product moderation queue retrieved"
    )


@admin_bp.route('/products/<int:product_id>/moderate', methods=['POST'])
@role_required(['admin'])
def moderate_product(product_id):
    """
    Admin approves, rejects, suspends, or requests resubmission with a mandatory reason.
    Only approved products are published to the public marketplace.
    """
    user: User = g.current_user
    prod = Product.query.get(product_id)
    if not prod:
        return error_response(code="NOT_FOUND", message="Product not found", status_code=404)

    data = request.get_json() or {}
    action = data.get('action')  # 'approve', 'reject', 'suspend', 'request_resubmission'
    reason = data.get('reason', '').strip()

    if action in ('reject', 'suspend', 'request_resubmission') and not reason:
        return error_response(code="MISSING_REASON", message=f"A mandatory reason is required to {action} a product listing", status_code=400)

    if action == 'approve':
        prod.approval_status = 'Approved'
        prod.is_approved = True
        prod.is_active = True
        prod.rejection_reason = None
    elif action == 'reject':
        prod.approval_status = 'Rejected'
        prod.is_approved = False
        prod.is_active = False
        prod.rejection_reason = reason
    elif action == 'suspend':
        prod.approval_status = 'Suspended'
        prod.is_approved = False
        prod.is_active = False
        prod.rejection_reason = reason
    elif action == 'request_resubmission':
        prod.approval_status = 'Draft'
        prod.is_approved = False
        prod.is_active = False
        prod.rejection_reason = f"Resubmission requested: {reason}"
    else:
        return error_response(code="INVALID_ACTION", message="Action must be approve, reject, suspend, or request_resubmission", status_code=400)

    # Immutable Audit Log
    audit = AdminAuditLog(
        admin_id=user.id,
        action_type=f"product_{action}",
        target_type="Product",
        target_id=prod.id,
        reason=reason or "Approved by administrator review",
        details=f"Product '{prod.name}' status set to {prod.approval_status}. Location Status: {prod.location_status}."
    )
    db.session.add(audit)
    db.session.commit()

    return success_response(
        data={"product": prod.to_dict()},
        message=f"Product listing successfully updated to '{prod.approval_status}'"
    )


@admin_bp.route('/destinations', methods=['GET'])
@role_required(['admin'])
def list_payment_destinations():
    """
    Lists farmer payment destinations for KYC and bank/UPI verification review.
    Does not expose sensitive raw bank account numbers.
    """
    destinations = FarmerPaymentDestination.query.order_by(FarmerPaymentDestination.created_at.desc()).all()
    results = []
    for d in destinations:
        dest_dict = d.to_dict(is_owner_or_admin=True)
        dest_dict["farmer_name"] = d.farmer.user.full_name if d.farmer and d.farmer.user else "Farmer"
        dest_dict["farmer_email"] = d.farmer.user.email if d.farmer and d.farmer.user else None
        dest_dict["farmer_district"] = d.farmer.district if d.farmer else None
        results.append(dest_dict)

    return success_response(data={"destinations": results}, message="Payment destinations retrieved")


@admin_bp.route('/destinations/<int:dest_id>/verify', methods=['POST'])
@role_required(['admin'])
def verify_payment_destination(dest_id):
    """
    Admin approves or rejects farmer payment destination.
    """
    user: User = g.current_user
    dest = FarmerPaymentDestination.query.get(dest_id)
    if not dest:
        return error_response(code="NOT_FOUND", message="Payment destination not found", status_code=404)

    data = request.get_json() or {}
    status = data.get('status', 'Verified')  # 'Verified' or 'Rejected'
    reason = data.get('reason', 'Payment destination verified by administrator')

    if status not in ('Verified', 'Rejected'):
        return error_response(code="INVALID_STATUS", message="Status must be 'Verified' or 'Rejected'", status_code=400)

    dest.verification_status = status
    dest.is_verified = (status == 'Verified')
    dest.rejection_reason = reason if status == 'Rejected' else None
    if status == 'Verified':
        dest.verified_at = datetime.utcnow()

    audit = AdminAuditLog(
        admin_id=user.id,
        action_type=f"payment_destination_{status.lower()}",
        target_type="FarmerPaymentDestination",
        target_id=dest.id,
        reason=reason,
        details=f"Payment destination ID {dest.id} for farmer ID {dest.farmer_id} updated to {status}."
    )
    db.session.add(audit)
    db.session.commit()

    return success_response(
        data={"destination": dest.to_dict(is_owner_or_admin=True)},
        message=f"Farmer payment destination status updated to '{status}'"
    )


@admin_bp.route('/requests', methods=['GET'])
@role_required(['admin'])
def list_admin_purchase_requests():
    """
    Administrator oversight of all buyer-farmer purchase requests across the platform.
    """
    status = request.args.get('status')
    query = PurchaseRequest.query
    if status and status != 'All':
        query = query.filter_by(status=status)
    reqs = query.order_by(PurchaseRequest.created_at.desc()).all()
    return success_response(
        data={"requests": [r.to_dict(current_user=g.current_user) for r in reqs]},
        message=f"Retrieved {len(reqs)} purchase requests"
    )


@admin_bp.route('/transactions', methods=['GET'])
@role_required(['admin'])
def list_transactions():
    """
    Audit log of payment gateway transactions, provider order IDs,
    signatures, and settlement statuses.
    """
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    results = []
    for p in payments:
        p_dict = p.to_dict()
        p_dict["order_number"] = p.order.order_number if p.order else None
        p_dict["buyer_name"] = p.order.buyer.user.full_name if (p.order and p.order.buyer and p.order.buyer.user) else "Buyer"
        p_dict["seller_name"] = p.order.seller.user.full_name if (p.order and p.order.seller and p.order.seller.user) else "Farmer"
        results.append(p_dict)

    return success_response(data={"transactions": results}, message="Transaction audit logs retrieved")


@admin_bp.route('/disputes', methods=['GET'])
@role_required(['admin'])
def list_disputes():
    """Lists buyer-farmer disputes and refund requests."""
    disputes = MarketplaceDispute.query.order_by(MarketplaceDispute.created_at.desc()).all()
    return success_response(data={"disputes": [d.to_dict() for d in disputes]}, message="Disputes retrieved")


@admin_bp.route('/disputes/<int:dispute_id>/resolve', methods=['POST'])
@role_required(['admin'])
def resolve_dispute(dispute_id):
    """Admin resolves a dispute with notes and optional refund action."""
    user: User = g.current_user
    dispute = MarketplaceDispute.query.get(dispute_id)
    if not dispute:
        return error_response(code="NOT_FOUND", message="Dispute not found", status_code=404)

    data = request.get_json() or {}
    status = data.get('status', 'Resolved')  # 'Resolved' or 'Rejected'
    resolution_notes = data.get('resolution_notes', 'Resolved by admin')

    dispute.status = status
    dispute.resolution_notes = resolution_notes
    dispute.resolved_at = datetime.utcnow()

    audit = AdminAuditLog(
        admin_id=user.id,
        action_type="dispute_resolved",
        target_type="MarketplaceDispute",
        target_id=dispute.id,
        reason=resolution_notes,
        details=f"Dispute {dispute.id} on Order {dispute.order_id} marked as {status}."
    )
    db.session.add(audit)
    db.session.commit()

    return success_response(data={"dispute": dispute.to_dict()}, message="Dispute status updated")


@admin_bp.route('/audit-logs', methods=['GET'])
@role_required(['admin'])
def get_audit_logs():
    """Returns immutable log of all moderation and administrative actions."""
    logs = AdminAuditLog.query.order_by(AdminAuditLog.created_at.desc()).limit(100).all()
    return success_response(data={"logs": [l.to_dict() for l in logs]}, message="Audit logs retrieved")


@admin_bp.route('/users/<int:user_id>/status', methods=['POST'])
@role_required(['admin'])
def update_user_status(user_id):
    """Suspends or reactivates user accounts with audit trail."""
    user = User.query.get(user_id)
    if not user:
        return error_response(code="NOT_FOUND", message="User not found", status_code=404)

    data = request.get_json() or {}
    is_active = bool(data.get('is_active', True))
    reason = data.get('reason', 'Account status updated by administrator')

    user.is_active = is_active
    audit = AdminAuditLog(
        admin_id=g.current_user.id,
        action_type="user_status_changed",
        target_type="User",
        target_id=user.id,
        reason=reason,
        details=f"User {user.email} (ID {user.id}) active status set to {is_active}."
    )
    db.session.add(audit)
    db.session.commit()

    return success_response(
        data={"user": user.to_dict()},
        message=f"User account {'reactivated' if is_active else 'suspended'}"
    )


@admin_bp.route('/sellers', methods=['GET'])
@role_required(['admin'])
def list_sellers():
    """Lists verified seller KYC applications."""
    sellers = VerifiedSeller.query.order_by(VerifiedSeller.created_at.desc()).all()
    return success_response(data={"sellers": [s.to_dict() for s in sellers]}, message="Seller verification applications retrieved")


@admin_bp.route('/sellers/<int:seller_id>/verify', methods=['POST'])
@role_required(['admin'])
def verify_seller(seller_id):
    """Reviews seller KYC application."""
    seller = VerifiedSeller.query.get(seller_id)
    if not seller:
        return error_response(code="NOT_FOUND", message="Seller application not found", status_code=404)

    data = request.get_json() or {}
    status = data.get('status', 'Verified')
    remarks = data.get('remarks', 'Approved by administrator verification review')

    seller.verification_status = status
    seller.admin_remarks = remarks
    if status == 'Verified':
        seller.verified_at = datetime.utcnow()

    audit = AdminAuditLog(
        admin_id=g.current_user.id,
        action_type=f"seller_kyc_{status.lower()}",
        target_type="VerifiedSeller",
        target_id=seller.id,
        reason=remarks,
        details=f"Seller KYC ID {seller.id} for farmer ID {seller.farmer_id} updated to {status}."
    )
    db.session.add(audit)
    db.session.commit()

    return success_response(data={"seller": seller.to_dict()}, message=f"Seller application status updated to: {status}")


@admin_bp.route('/users', methods=['GET'])
@role_required(['admin'])
def list_users():
    """Lists users for administration and suspension management."""
    users = User.query.order_by(User.created_at.desc()).all()
    return success_response(data={"users": [u.to_dict() for u in users]}, message="Users retrieved")
