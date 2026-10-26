"""
Pytest Test Configuration and Fixtures for ESYKRUSHI
Sets up an isolated in-memory test database, test client, and seeded accounts.
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.user import User, FarmerProfile, BuyerProfile, VerifiedSeller
from app.models.farm import Farm, Crop, Task, Journal, Inventory, Expense
from app.models.marketplace import Product, Order, OrderItem, Payment
from app.auth.jwt_handler import generate_access_token

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-super-secure-esykrushi-2026'
    JWT_SECRET_KEY = 'test-jwt-secret-key-32-bytes-long-super-secure-2026'
    DEMO_MODE = True
    GEMINI_API_KEY = ''
    OPENAI_API_KEY = ''
    UPLOAD_FOLDER = os.path.join(backend_dir, 'tests', 'uploads')
    REPORTS_FOLDER = os.path.join(backend_dir, 'tests', 'reports')

@pytest.fixture(scope='session')
def app():
    app = create_app(TestConfig)
    return app

@pytest.fixture(scope='function')
def client(app):
    with app.app_context():
        db.create_all()
        # Seed basic accounts
        # 1. Admin
        admin = User(email="admin@test.com", full_name="Admin User", role="admin")
        admin.set_password("Admin@123")
        db.session.add(admin)

        # 2. Farmer
        farmer = User(email="farmer@test.com", full_name="Ramesh Farmer", role="farmer")
        farmer.set_password("Farmer@123")
        db.session.add(farmer)
        db.session.flush()

        fp = FarmerProfile(user_id=farmer.id, district="Mandya", state="Karnataka", total_acreage=5.0)
        db.session.add(fp)
        db.session.flush()

        farm = Farm(farmer_id=fp.id, farm_name="Mandya Farm", location_name="Mandya, Karnataka")
        db.session.add(farm)

        seller = VerifiedSeller(farmer_id=fp.id, id_proof_type="KCC", id_proof_number="KCC-101", verification_status="Verified")
        db.session.add(seller)

        # 3. Buyer
        buyer = User(email="buyer@test.com", full_name="Suresh Buyer", role="buyer")
        buyer.set_password("Buyer@123")
        db.session.add(buyer)
        db.session.flush()

        bp = BuyerProfile(user_id=buyer.id, business_name="APMC Traders", delivery_address="Bangalore")
        db.session.add(bp)

        db.session.commit()

        yield app.test_client()

        db.session.remove()
        db.drop_all()

@pytest.fixture
def farmer_token(app):
    with app.app_context():
        u = User.query.filter_by(email="farmer@test.com").first()
        return generate_access_token(u)

@pytest.fixture
def buyer_token(app):
    with app.app_context():
        u = User.query.filter_by(email="buyer@test.com").first()
        return generate_access_token(u)

@pytest.fixture
def admin_token(app):
    with app.app_context():
        u = User.query.filter_by(email="admin@test.com").first()
        return generate_access_token(u)
