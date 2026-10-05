"""
Admin Moderation & Governance Routes (/api/admin)
Enables system health inspection, seller KYC verification, marketplace moderation, and ML performance monitoring.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User, FarmerProfile, BuyerProfile, VerifiedSeller
from app.models.marketplace import Product, Order, Payment
from app.auth.jwt_handler import role_required
from ml.evaluate import get_model_evaluation_metrics
from app.utils.response import success_response, error_response
from app import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@role_required(['admin'])
def get_admin_dashboard():
    total_users = User.query.count()
    total_farmers = FarmerProfile.query.count()
    total_buyers = BuyerProfile.query.count()
    verified_sellers = VerifiedSeller.query.filter_by(verification_status='Verified').count()
    pending_sellers = VerifiedSeller.query.filter_by(verification_status='Pending').count()
    total_products = Product.query.filter_by(is_active=True).count()
    total_orders = Order.query.count()
    
    # Revenue from paid orders
    paid_payments = Payment.query.filter_by(payment_status='Paid').all()
    total_revenue = sum(p.amount for p in paid_payments)

    ml_metrics = get_model_evaluation_metrics()

    stats = {
        "total_users": total_users,
        "farmers_count": total_farmers,
        "buyers_count": total_buyers,
        "verified_sellers_count": verified_sellers,
        "pending_verifications": pending_sellers,
        "active_products": total_products,
        "total_orders": total_orders,
        "platform_volume_rs": round(total_revenue, 2),
        "ml_model_accuracy": ml_metrics.get("accuracy"),
        "ml_model_status": "Operational (Random Forest 100 Trees)"
    }

    return success_response(data={"stats": stats, "ml_metrics": ml_metrics}, message="Admin dashboard metrics retrieved")


@admin_bp.route('/users', methods=['GET'])
@role_required(['admin'])
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return success_response(data={"users": [u.to_dict() for u in users]}, message="Users retrieved")


@admin_bp.route('/sellers', methods=['GET'])
@role_required(['admin'])
def list_sellers():
    sellers = VerifiedSeller.query.order_by(VerifiedSeller.created_at.desc()).all()
    return success_response(data={"sellers": [s.to_dict() for s in sellers]}, message="Seller verification applications retrieved")


@admin_bp.route('/sellers/<int:seller_id>/verify', methods=['POST'])
@role_required(['admin'])
def verify_seller(seller_id):
    seller = VerifiedSeller.query.get(seller_id)
    if not seller:
        return error_response(code="NOT_FOUND", message="Seller application not found", status_code=404)

    data = request.get_json() or {}
    status = data.get('status', 'Verified')  # 'Verified' or 'Rejected'
    remarks = data.get('remarks', 'Approved by administrator verification review')

    seller.verification_status = status
    seller.admin_remarks = remarks
    if status == 'Verified':
        seller.verified_at = datetime.utcnow()

    db.session.commit()
    return success_response(data={"seller": seller.to_dict()}, message=f"Seller application status updated to: {status}")


@admin_bp.route('/products/<int:product_id>/approve', methods=['POST'])
@role_required(['admin'])
def approve_product(product_id):
    prod = Product.query.get(product_id)
    if not prod:
        return error_response(code="NOT_FOUND", message="Product not found", status_code=404)

    data = request.get_json() or {}
    prod.is_approved = bool(data.get('is_approved', True))
    db.session.commit()

    return success_response(data={"product": prod.to_dict()}, message="Product moderation status updated")


@admin_bp.route('/payments/<int:payment_id>/verify', methods=['POST'])
@role_required(['admin'])
def admin_verify_payment(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return error_response(code="NOT_FOUND", message="Payment not found", status_code=404)

    payment.payment_status = 'Paid'
    if payment.order:
        payment.order.order_status = 'Confirmed'
    db.session.commit()

    return success_response(data={"payment": payment.to_dict()}, message="Payment manually verified by administrator")
