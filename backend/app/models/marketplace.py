"""
Marketplace Models: Product, CartItem, Order, OrderItem, Payment,
FarmerPaymentDestination, VideoCallSession, AdminAuditLog, MarketplaceDispute
Supports direct farmer-to-buyer transactions, GPS evidence verification,
WebRTC signaling, and stateful payment processing.
"""

from datetime import datetime, date
from app import db
import uuid
import json

class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(120), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)  # Grains, Pulses, Fruits, Vegetables, Spices, Oilseeds
    description = db.Column(db.Text, nullable=True)
    price_per_unit = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), default='kg')  # kg, quintal, crate, ton
    available_quantity = db.Column(db.Float, nullable=False, default=100.0)
    reserved_quantity = db.Column(db.Float, nullable=False, default=0.0)
    harvest_date = db.Column(db.Date, default=date.today)
    farm_location = db.Column(db.String(150), default='Mandya, Karnataka')
    image_url = db.Column(db.String(255), nullable=True)
    video_url = db.Column(db.String(255), nullable=True)
    media_hash = db.Column(db.String(64), nullable=True)  # SHA-256 for duplicate detection
    
    # Moderation & Approval Status
    # Values: 'Draft', 'Pending Review', 'Approved', 'Rejected', 'Suspended'
    approval_status = db.Column(db.String(30), default='Approved')
    is_approved = db.Column(db.Boolean, default=True)  # Backward-compatible sync
    rejection_reason = db.Column(db.Text, nullable=True)
    crop_quality = db.Column(db.String(50), default='Grade A - Premium')
    delivery_options = db.Column(db.String(150), default='Farm Pickup, Mandi Transport')

    # Location & GPS Evidence
    location_latitude = db.Column(db.Float, nullable=True)
    location_longitude = db.Column(db.Float, nullable=True)
    location_source = db.Column(db.String(30), default='none')  # 'exif', 'browser_device', 'manual_declared', 'none'
    location_accuracy = db.Column(db.Float, nullable=True)  # in meters
    location_capture_time = db.Column(db.DateTime, nullable=True)
    location_distance_km = db.Column(db.Float, nullable=True)  # distance from declared farm
    location_status = db.Column(db.String(30), default='Unverified')  # 'Verified', 'Warning', 'Unverified', 'Flagged'
    location_flags = db.Column(db.Text, nullable=True)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    seller = db.relationship('FarmerProfile', backref='products')

    def to_dict(self):
        is_verified = False
        seller_name = "Independent Farmer"
        farmer_phone = None
        if self.seller and self.seller.user:
            seller_name = self.seller.user.full_name
            farmer_phone = self.seller.user.phone
            if hasattr(self.seller, 'verified_seller') and self.seller.verified_seller:
                is_verified = (self.seller.verified_seller.verification_status == 'Verified')

        flags_list = []
        if self.location_flags:
            try:
                flags_list = json.loads(self.location_flags) if self.location_flags.startswith('[') else [self.location_flags]
            except Exception:
                flags_list = [self.location_flags]

        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'seller_name': seller_name,
            'seller_district': self.seller.district if self.seller else None,
            'seller_state': self.seller.state if self.seller else None,
            'is_verified_seller': is_verified,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'price_per_unit': self.price_per_unit,
            'unit': self.unit,
            'available_quantity': self.available_quantity,
            'reserved_quantity': self.reserved_quantity,
            'harvest_date': self.harvest_date.isoformat() if self.harvest_date else None,
            'farm_location': self.farm_location,
            'image_url': self.image_url,
            'video_url': self.video_url,
            'media_hash': self.media_hash,
            'approval_status': self.approval_status or ('Approved' if self.is_approved else 'Pending Review'),
            'is_approved': self.is_approved and self.approval_status == 'Approved',
            'rejection_reason': self.rejection_reason,
            'crop_quality': self.crop_quality,
            'delivery_options': self.delivery_options,
            'location_evidence': {
                'latitude': self.location_latitude,
                'longitude': self.location_longitude,
                'source': self.location_source,
                'accuracy_meters': self.location_accuracy,
                'capture_time': self.location_capture_time.isoformat() if self.location_capture_time else None,
                'distance_to_farm_km': self.location_distance_km,
                'verification_status': self.location_status,
                'warnings': flags_list
            },
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CartItem(db.Model):
    __tablename__ = 'cart_items'

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer_profiles.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id,
            'buyer_id': self.buyer_id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'quantity': self.quantity,
            'subtotal': round(self.quantity * (self.product.price_per_unit if self.product else 0), 2)
        }


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer_profiles.id', ondelete='CASCADE'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='SET NULL'), nullable=True)
    order_number = db.Column(db.String(36), unique=True, nullable=False, default=lambda: f"ORD-{uuid.uuid4().hex[:8].upper()}")
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    shipping_address = db.Column(db.Text, nullable=False)
    contact_phone = db.Column(db.String(20), nullable=False)
    mandi_name = db.Column(db.String(150), nullable=True)
    mandi_address = db.Column(db.String(255), nullable=True)
    purchase_request_id = db.Column(db.Integer, nullable=True)
    order_status = db.Column(db.String(30), default='Pending')  # Pending, Confirmed, Shipped, Delivered, Cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    seller = db.relationship('FarmerProfile', backref='orders_received')
    items = db.relationship('OrderItem', backref='order', lazy='dynamic', cascade="all, delete-orphan")
    payment = db.relationship('Payment', backref='order', uselist=False, cascade="all, delete-orphan")

    def to_dict(self, current_user=None):
        # Privacy & Access Control:
        # Delivery address is shown to the seller and admin; general users see minimal contact
        seller_name = "Direct Farmer"
        seller_phone = None
        seller_location = None
        if self.seller and self.seller.user:
            seller_name = self.seller.user.full_name
            seller_phone = self.seller.user.phone
            seller_location = f"{self.seller.district}, {self.seller.state}"

        # Mask phone and address for unauthorized users
        display_address = self.shipping_address
        display_phone = self.contact_phone
        if current_user and current_user.role != 'admin':
            is_buyer = (current_user.buyer_profile and current_user.buyer_profile.id == self.buyer_id)
            is_seller = (current_user.farmer_profile and current_user.farmer_profile.id == self.seller_id)
            if not is_buyer and not is_seller:
                display_address = "[Protected Address]"
                display_phone = "[Protected Phone]"

        return {
            'id': self.id,
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer.user.full_name if self.buyer and self.buyer.user else "Buyer",
            'seller_id': self.seller_id,
            'seller_name': seller_name,
            'seller_phone': seller_phone,
            'seller_location': seller_location,
            'order_number': self.order_number,
            'total_amount': self.total_amount,
            'shipping_address': display_address,
            'contact_phone': display_phone,
            'mandi_name': self.mandi_name,
            'mandi_address': self.mandi_address,
            'purchase_request_id': self.purchase_request_id,
            'order_status': self.order_status,
            'items': [item.to_dict() for item in self.items],
            'payment': self.payment.to_dict() if self.payment else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='SET NULL'), nullable=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='SET NULL'), nullable=True)
    product_name = db.Column(db.String(120), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'seller_id': self.seller_id,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'subtotal': self.subtotal
        }


class OrderReservation(db.Model):
    __tablename__ = 'order_reservations'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    reserved_qty = db.Column(db.Float, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order', backref=db.backref('reservations', cascade='all, delete-orphan', lazy='dynamic'))
    product = db.relationship('Product')


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, unique=True)
    transaction_id = db.Column(db.String(64), unique=True, nullable=False)
    payment_method = db.Column(db.String(30), default='UPI')
    amount = db.Column(db.Float, nullable=False)
    payment_status = db.Column(db.String(20), default='Pending')  # Pending, Initiated, Paid, Failed, Refunded
    gateway_order_id = db.Column(db.String(64), nullable=True)
    gateway_payment_id = db.Column(db.String(64), nullable=True)
    gateway_signature = db.Column(db.String(128), nullable=True)
    settlement_status = db.Column(db.String(30), default='Pending Payout')  # Pending Payout, Settled to Farmer
    refund_id = db.Column(db.String(64), nullable=True)
    refund_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'transaction_id': self.transaction_id,
            'payment_method': self.payment_method,
            'amount': self.amount,
            'payment_status': self.payment_status,
            'gateway_order_id': self.gateway_order_id,
            'gateway_payment_id': self.gateway_payment_id,
            'settlement_status': self.settlement_status,
            'refund_id': self.refund_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class FarmerPaymentDestination(db.Model):
    """
    Farmer-owned payment destination (UPI ID and Bank Account).
    Enforces that money flows directly to the verified farmer.
    Private financial details are masked when returned to unauthorized users.
    """
    __tablename__ = 'farmer_payment_destinations'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    destination_type = db.Column(db.String(20), default='upi')  # 'upi', 'bank_account', 'both'
    upi_id = db.Column(db.String(100), nullable=True)
    account_number_masked = db.Column(db.String(50), nullable=True)
    account_number_hash = db.Column(db.String(64), nullable=True)
    ifsc_code = db.Column(db.String(20), nullable=True)
    account_holder_name = db.Column(db.String(120), nullable=True)
    bank_name = db.Column(db.String(100), nullable=True)
    registered_phone = db.Column(db.String(20), nullable=True)
    farm_address = db.Column(db.Text, nullable=True)
    upi_qr_url = db.Column(db.String(255), nullable=True)
    preferred_payment_methods = db.Column(db.String(100), default='UPI, Bank Transfer, Razorpay')
    is_verified = db.Column(db.Boolean, default=False)
    verification_status = db.Column(db.String(20), default='Pending')  # 'Pending', 'Verified', 'Rejected'
    rejection_reason = db.Column(db.Text, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farmer = db.relationship('FarmerProfile', backref=db.backref('payment_destinations', cascade='all, delete-orphan'))

    def to_dict(self, is_owner_or_admin=False):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'destination_type': self.destination_type,
            'upi_id': self.upi_id if is_owner_or_admin else (self.upi_id[:3] + '***@***' if self.upi_id else None),
            'account_number_masked': self.account_number_masked,
            'ifsc_code': self.ifsc_code if is_owner_or_admin else (self.ifsc_code[:4] + '****' if self.ifsc_code else None),
            'account_holder_name': self.account_holder_name,
            'bank_name': self.bank_name,
            'registered_phone': self.registered_phone if is_owner_or_admin else (self.registered_phone[:2] + '******' + self.registered_phone[-2:] if self.registered_phone else None),
            'farm_address': self.farm_address,
            'upi_qr_url': self.upi_qr_url,
            'preferred_payment_methods': self.preferred_payment_methods,
            'is_verified': self.is_verified,
            'verification_status': self.verification_status,
            'rejection_reason': self.rejection_reason if is_owner_or_admin else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Domain alias for clarity
FarmerPaymentDetails = FarmerPaymentDestination


class VideoCallSession(db.Model):
    """
    Live WebRTC video call session between prospective buyer and farmer.
    Facilitates real-time crop inspection prior to purchase.
    """
    __tablename__ = 'video_call_sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    # Status: 'requested', 'accepted', 'declined', 'in_progress', 'ended', 'missed'
    status = db.Column(db.String(30), default='requested')
    sdp_offer = db.Column(db.Text, nullable=True)
    sdp_answer = db.Column(db.Text, nullable=True)
    ice_candidates = db.Column(db.Text, nullable=True)  # JSON array of candidates
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    product = db.relationship('Product')
    buyer = db.relationship('User', foreign_keys=[buyer_id])
    farmer = db.relationship('User', foreign_keys=[farmer_id])

    def to_dict(self):
        candidates = []
        if self.ice_candidates:
            try:
                candidates = json.loads(self.ice_candidates)
            except Exception:
                candidates = []

        return {
            'id': self.id,
            'session_id': self.session_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else "Crop Produce",
            'product_image': self.product.image_url if self.product else None,
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer.full_name if self.buyer else "Buyer",
            'farmer_id': self.farmer_id,
            'farmer_name': self.farmer.full_name if self.farmer else "Farmer",
            'status': self.status,
            'sdp_offer': self.sdp_offer,
            'sdp_answer': self.sdp_answer,
            'ice_candidates': candidates,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AdminAuditLog(db.Model):
    """
    Searchable audit trail of administrative moderation, verification,
    and refund decisions.
    """
    __tablename__ = 'admin_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action_type = db.Column(db.String(50), nullable=False)  # 'product_approval', 'product_rejection', etc.
    target_type = db.Column(db.String(50), nullable=False)  # 'Product', 'VerifiedSeller', 'Payment', 'User'
    target_id = db.Column(db.Integer, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.full_name if self.admin else "System Administrator",
            'action_type': self.action_type,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'reason': self.reason,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class MarketplaceDispute(db.Model):
    """
    Dispute and refund request tracking between buyer and farmer.
    """
    __tablename__ = 'marketplace_disputes'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    raised_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    issue_type = db.Column(db.String(50), nullable=False)  # 'damaged_produce', 'quality_mismatch', etc.
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Open')  # 'Open', 'Under Review', 'Resolved', 'Rejected'
    resolution_notes = db.Column(db.Text, nullable=True)
    refund_requested = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    order = db.relationship('Order', backref='disputes')
    raised_by = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'raised_by_id': self.raised_by_id,
            'raised_by_name': self.raised_by.full_name if self.raised_by else "User",
            'issue_type': self.issue_type,
            'description': self.description,
            'status': self.status,
            'resolution_notes': self.resolution_notes,
            'refund_requested': self.refund_requested,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }


class MandiLocation(db.Model):
    """
    Standard and user-entered APMC Mandis and agricultural delivery destinations.
    """
    __tablename__ = 'mandi_locations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    code = db.Column(db.String(30), nullable=True, unique=True)
    district = db.Column(db.String(60), nullable=False, index=True)
    state = db.Column(db.String(60), default='Karnataka')
    address = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    market_type = db.Column(db.String(40), default='APMC Yard')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'district': self.district,
            'state': self.state,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'market_type': self.market_type
        }


class PurchaseRequest(db.Model):
    """
    Direct Product-Specific Purchase Request and Price Negotiation System
    between prospective buyer and authentic farmer.
    Tied specifically to product.id and product.seller_id.
    """
    __tablename__ = 'purchase_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(36), unique=True, nullable=False, default=lambda: f"REQ-{uuid.uuid4().hex[:8].upper()}")
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer_profiles.id', ondelete='CASCADE'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    product_name = db.Column(db.String(120), nullable=False)
    
    # Quantities and Proposed Terms
    requested_quantity = db.Column(db.Float, nullable=False, default=1.0)
    unit = db.Column(db.String(20), default='kg')
    proposed_unit_price = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    
    # Counter Offer (for Negotiation)
    counter_unit_price = db.Column(db.Float, nullable=True)
    counter_quantity = db.Column(db.Float, nullable=True)
    
    # Buyer Contact & Authorized Delivery
    buyer_name = db.Column(db.String(120), nullable=True)
    buyer_phone = db.Column(db.String(20), nullable=True)
    delivery_address = db.Column(db.Text, nullable=False)
    
    # Preferred Mandi Destination
    mandi_name = db.Column(db.String(150), nullable=True)
    mandi_address = db.Column(db.String(255), nullable=True)
    mandi_district = db.Column(db.String(60), nullable=True)
    mandi_state = db.Column(db.String(60), default='Karnataka')
    mandi_latitude = db.Column(db.Float, nullable=True)
    mandi_longitude = db.Column(db.Float, nullable=True)
    
    # Notes & Messages
    buyer_notes = db.Column(db.Text, nullable=True)
    farmer_notes = db.Column(db.Text, nullable=True)
    
    # Status: 'Pending', 'Accepted', 'Rejected', 'Negotiation', 'Completed', 'Cancelled'
    status = db.Column(db.String(30), default='Pending', index=True)
    
    # If converted to an order
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='SET NULL'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    buyer = db.relationship('BuyerProfile', backref=db.backref('purchase_requests', cascade='all, delete-orphan'))
    seller = db.relationship('FarmerProfile', backref=db.backref('purchase_requests_received', cascade='all, delete-orphan'))
    product = db.relationship('Product')
    order = db.relationship('Order', foreign_keys=[order_id], backref=db.backref('originating_request', uselist=False))

    def to_dict(self, current_user=None):
        seller_user = self.seller.user if self.seller else None
        buyer_user = self.buyer.user if self.buyer else None
        
        is_authorized = False
        if current_user:
            if current_user.role == 'admin':
                is_authorized = True
            elif current_user.farmer_profile and current_user.farmer_profile.id == self.seller_id:
                is_authorized = True
            elif current_user.buyer_profile and current_user.buyer_profile.id == self.buyer_id:
                is_authorized = True
                
        disp_phone = self.buyer_phone if is_authorized else "[Protected]"
        disp_address = self.delivery_address if is_authorized else "[Protected]"
        
        # Farmer details
        farmer_name = seller_user.full_name if seller_user else "Farmer"
        farmer_phone = seller_user.phone if (is_authorized and seller_user) else "[Protected]"
        farmer_location = f"{self.seller.district}, {self.seller.state}" if self.seller else "Karnataka"

        return {
            'id': self.id,
            'request_number': self.request_number,
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer_name or (buyer_user.full_name if buyer_user else "Buyer"),
            'buyer_phone': disp_phone,
            'seller_id': self.seller_id,
            'farmer_name': farmer_name,
            'farmer_phone': farmer_phone,
            'farmer_location': farmer_location,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'product_image': self.product.image_url if self.product else None,
            'requested_quantity': self.requested_quantity,
            'unit': self.unit,
            'proposed_unit_price': self.proposed_unit_price,
            'total_amount': self.total_amount,
            'counter_unit_price': self.counter_unit_price,
            'counter_quantity': self.counter_quantity,
            'delivery_address': disp_address,
            'mandi_name': self.mandi_name,
            'mandi_address': self.mandi_address,
            'mandi_district': self.mandi_district,
            'mandi_state': self.mandi_state,
            'buyer_notes': self.buyer_notes,
            'farmer_notes': self.farmer_notes,
            'status': self.status,
            'order_id': self.order_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PaymentWebhookEvent(db.Model):
    """
    Idempotent audit log for Razorpay and payment provider webhook events.
    Prevents duplicate payment captures, race conditions, or replay attacks.
    """
    __tablename__ = 'payment_webhook_events'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(80), unique=True, nullable=False, index=True)
    event_type = db.Column(db.String(60), nullable=False)
    order_id = db.Column(db.Integer, nullable=True)
    payment_id = db.Column(db.String(64), nullable=True)
    payload = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='Processed')  # 'Processed', 'Ignored', 'Failed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'event_type': self.event_type,
            'order_id': self.order_id,
            'payment_id': self.payment_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
