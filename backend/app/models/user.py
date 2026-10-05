"""
User and Profile ORM Models for ESYKRUSHI
Supports Role-Based Access Control (Farmer, Buyer, Admin) and Seller Verification.
"""

from datetime import datetime
from app import db
import bcrypt

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='farmer')  # farmer, buyer, admin
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farmer_profile = db.relationship('FarmerProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    buyer_profile = db.relationship('BuyerProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade="all, delete-orphan")

    def set_password(self, password: str):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        data = {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if self.role == 'farmer' and self.farmer_profile:
            data['farmer_profile'] = self.farmer_profile.to_dict()
            # Check verification
            if hasattr(self.farmer_profile, 'verified_seller') and self.farmer_profile.verified_seller:
                data['is_verified_seller'] = (self.farmer_profile.verified_seller.verification_status == 'Verified')
                data['verification_status'] = self.farmer_profile.verified_seller.verification_status
            else:
                data['is_verified_seller'] = False
                data['verification_status'] = 'Unapplied'
        elif self.role == 'buyer' and self.buyer_profile:
            data['buyer_profile'] = self.buyer_profile.to_dict()
        return data


class FarmerProfile(db.Model):
    __tablename__ = 'farmer_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    state = db.Column(db.String(50), default='Karnataka')
    district = db.Column(db.String(50), default='Bengaluru Rural')
    taluk = db.Column(db.String(50), nullable=True)
    pincode = db.Column(db.String(10), nullable=True)
    total_acreage = db.Column(db.Float, default=5.0)
    soil_type = db.Column(db.String(50), default='Red Loam')
    farming_experience_years = db.Column(db.Integer, default=5)

    # Relationships
    farms = db.relationship('Farm', backref='farmer', lazy='dynamic', cascade="all, delete-orphan")
    verified_seller = db.relationship('VerifiedSeller', backref='farmer_profile', uselist=False, cascade="all, delete-orphan")
    recommendations = db.relationship('CropRecommendation', backref='farmer', lazy='dynamic', cascade="all, delete-orphan")
    seasonal_reports = db.relationship('SeasonalReport', backref='farmer', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'state': self.state,
            'district': self.district,
            'taluk': self.taluk,
            'pincode': self.pincode,
            'total_acreage': self.total_acreage,
            'soil_type': self.soil_type,
            'farming_experience_years': self.farming_experience_years
        }


class BuyerProfile(db.Model):
    __tablename__ = 'buyer_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    business_name = db.Column(db.String(120), nullable=True)
    business_type = db.Column(db.String(50), default='Wholesaler')  # Wholesaler, Retailer, Consumer, Agribusiness
    delivery_address = db.Column(db.Text, nullable=True)
    gst_number = db.Column(db.String(30), nullable=True)

    # Relationships
    orders = db.relationship('Order', backref='buyer', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'business_name': self.business_name,
            'business_type': self.business_type,
            'delivery_address': self.delivery_address,
            'gst_number': self.gst_number
        }


class VerifiedSeller(db.Model):
    __tablename__ = 'verified_sellers'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False, unique=True)
    id_proof_type = db.Column(db.String(50), default='Aadhaar Card')  # Aadhaar, Kisan Credit Card, Land Record / RTC
    id_proof_number = db.Column(db.String(50), nullable=False)
    document_url = db.Column(db.String(255), nullable=True)
    verification_status = db.Column(db.String(20), default='Pending')  # Pending, Verified, Rejected
    admin_remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'farmer_name': self.farmer_profile.user.full_name if self.farmer_profile and self.farmer_profile.user else None,
            'farmer_email': self.farmer_profile.user.email if self.farmer_profile and self.farmer_profile.user else None,
            'id_proof_type': self.id_proof_type,
            'id_proof_number': self.id_proof_number,
            'document_url': self.document_url,
            'verification_status': self.verification_status,
            'admin_remarks': self.admin_remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None
        }
