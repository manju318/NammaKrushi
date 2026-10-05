"""
Marketplace Models: Product, CartItem, Order, OrderItem, Payment
Supports direct farmer-to-buyer transactions, verified seller badges, and stateful payment verification.
"""

from datetime import datetime, date
from app import db
import uuid

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
    harvest_date = db.Column(db.Date, default=date.today)
    farm_location = db.Column(db.String(150), default='Mandya, Karnataka')
    image_url = db.Column(db.String(255), nullable=True)
    is_approved = db.Column(db.Boolean, default=True)  # Admin moderation
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    seller = db.relationship('FarmerProfile', backref='products')

    def to_dict(self):
        is_verified = False
        seller_name = "Independent Farmer"
        if self.seller and self.seller.user:
            seller_name = self.seller.user.full_name
            if hasattr(self.seller, 'verified_seller') and self.seller.verified_seller:
                is_verified = (self.seller.verified_seller.verification_status == 'Verified')

        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'seller_name': seller_name,
            'is_verified_seller': is_verified,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'price_per_unit': self.price_per_unit,
            'unit': self.unit,
            'available_quantity': self.available_quantity,
            'harvest_date': self.harvest_date.isoformat() if self.harvest_date else None,
            'farm_location': self.farm_location,
            'image_url': self.image_url,
            'is_approved': self.is_approved,
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
    order_number = db.Column(db.String(36), unique=True, nullable=False, default=lambda: f"ORD-{uuid.uuid4().hex[:8].upper()}")
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    shipping_address = db.Column(db.Text, nullable=False)
    contact_phone = db.Column(db.String(20), nullable=False)
    order_status = db.Column(db.String(30), default='Pending')  # Pending, Confirmed, Shipped, Delivered, Cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy='dynamic', cascade="all, delete-orphan")
    payment = db.relationship('Payment', backref='order', uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer.user.full_name if self.buyer and self.buyer.user else "Buyer",
            'order_number': self.order_number,
            'total_amount': self.total_amount,
            'shipping_address': self.shipping_address,
            'contact_phone': self.contact_phone,
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


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, unique=True)
    transaction_id = db.Column(db.String(64), unique=True, nullable=False)
    payment_method = db.Column(db.String(30), default='UPI')  # UPI, NetBanking, Card, COD
    amount = db.Column(db.Float, nullable=False)
    payment_status = db.Column(db.String(20), default='Pending')  # Pending, Initiated, Paid, Failed, Cancelled, Completed
    gateway_order_id = db.Column(db.String(64), nullable=True)
    gateway_signature = db.Column(db.String(128), nullable=True)
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
