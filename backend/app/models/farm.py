"""
Farm Management Models: Farm, Crop, Task, Journal, Inventory, Expense, SeasonalReport
Supports complete farm lifecycle tracking, financial analytics, and crop scheduling.
"""

from datetime import datetime, date
from app import db

class Farm(db.Model):
    __tablename__ = 'farms'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    farm_name = db.Column(db.String(100), nullable=False)
    location_name = db.Column(db.String(120), default='Bengaluru Rural, Karnataka')
    latitude = db.Column(db.Float, default=13.0827)
    longitude = db.Column(db.Float, default=77.5877)
    size_in_acres = db.Column(db.Float, default=5.0)
    irrigation_source = db.Column(db.String(50), default='Borewell & Drip')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    crops = db.relationship('Crop', backref='farm', lazy='dynamic', cascade="all, delete-orphan")
    tasks = db.relationship('Task', backref='farm', lazy='dynamic', cascade="all, delete-orphan")
    inventories = db.relationship('Inventory', backref='farm', lazy='dynamic', cascade="all, delete-orphan")
    expenses = db.relationship('Expense', backref='farm', lazy='dynamic', cascade="all, delete-orphan")
    journals = db.relationship('Journal', backref='farm', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'farm_name': self.farm_name,
            'location_name': self.location_name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'size_in_acres': self.size_in_acres,
            'irrigation_source': self.irrigation_source,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Crop(db.Model):
    __tablename__ = 'crops'

    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    crop_name = db.Column(db.String(80), nullable=False)
    variety = db.Column(db.String(80), nullable=True)
    sowing_date = db.Column(db.Date, default=date.today)
    expected_harvest_date = db.Column(db.Date, nullable=True)
    current_stage = db.Column(db.String(50), default='Vegetative')  # Sowing, Germination, Vegetative, Flowering, Grain Filling, Harvesting
    acreage = db.Column(db.Float, default=2.5)
    status = db.Column(db.String(20), default='Active')  # Active, Harvested, Terminated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    tasks = db.relationship('Task', backref='crop', lazy='dynamic')
    expenses = db.relationship('Expense', backref='crop', lazy='dynamic')
    journals = db.relationship('Journal', backref='crop', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'crop_name': self.crop_name,
            'variety': self.variety,
            'sowing_date': self.sowing_date.isoformat() if self.sowing_date else None,
            'expected_harvest_date': self.expected_harvest_date.isoformat() if self.expected_harvest_date else None,
            'current_stage': self.current_stage,
            'acreage': self.acreage,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    crop_id = db.Column(db.Integer, db.ForeignKey('crops.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='General')  # Sowing, Irrigation, Fertilization, Pesticide, Harvesting, Land Prep, Other
    priority = db.Column(db.String(20), default='Medium')  # Low, Medium, High, Critical
    due_date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(20), default='Pending')  # Pending, In_Progress, Completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'crop_id': self.crop_id,
            'crop_name': self.crop.crop_name if self.crop else 'General Farm',
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Journal(db.Model):
    __tablename__ = 'journals'

    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    crop_id = db.Column(db.Integer, db.ForeignKey('crops.id', ondelete='SET NULL'), nullable=True)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    activity_type = db.Column(db.String(80), nullable=False)
    observations = db.Column(db.Text, nullable=False)
    weather_notes = db.Column(db.String(200), nullable=True)
    cost_involved = db.Column(db.Float, default=0.0)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'crop_id': self.crop_id,
            'crop_name': self.crop.crop_name if self.crop else 'Farm General',
            'entry_date': self.entry_date.isoformat() if self.entry_date else None,
            'activity_type': self.activity_type,
            'observations': self.observations,
            'weather_notes': self.weather_notes,
            'cost_involved': self.cost_involved,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Inventory(db.Model):
    __tablename__ = 'inventories'

    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), default='Seeds')  # Seeds, Fertilizers, Pesticides, Tools, Equipment, Other
    quantity = db.Column(db.Float, nullable=False, default=0.0)
    unit = db.Column(db.String(20), default='kg')  # kg, L, bags, count, packets
    min_threshold = db.Column(db.Float, default=10.0)
    unit_cost = db.Column(db.Float, default=0.0)
    purchase_date = db.Column(db.Date, default=date.today)
    expiry_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def is_low_stock(self) -> bool:
        return self.quantity <= self.min_threshold

    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'item_name': self.item_name,
            'category': self.category,
            'quantity': self.quantity,
            'unit': self.unit,
            'min_threshold': self.min_threshold,
            'unit_cost': self.unit_cost,
            'total_value': round(self.quantity * self.unit_cost, 2),
            'is_low_stock': self.is_low_stock,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    crop_id = db.Column(db.Integer, db.ForeignKey('crops.id', ondelete='SET NULL'), nullable=True)
    category = db.Column(db.String(50), nullable=False)  # Seeds, Fertilizer, Labor, Equipment, Irrigation, Transport, Pesticides, Other
    amount = db.Column(db.Float, nullable=False)
    expense_date = db.Column(db.Date, nullable=False, default=date.today)
    payment_method = db.Column(db.String(30), default='Cash')  # Cash, UPI, Bank Transfer, Credit
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'farm_id': self.farm_id,
            'crop_id': self.crop_id,
            'crop_name': self.crop.crop_name if self.crop else 'General Operation',
            'category': self.category,
            'amount': self.amount,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'payment_method': self.payment_method,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SeasonalReport(db.Model):
    __tablename__ = 'seasonal_reports'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    season_name = db.Column(db.String(50), default='Kharif')  # Kharif, Rabi, Zaid
    year = db.Column(db.Integer, default=2026)
    insights_json = db.Column(db.JSON, nullable=False)
    pdf_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'season_name': self.season_name,
            'year': self.year,
            'insights': self.insights_json,
            'pdf_path': self.pdf_path,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
