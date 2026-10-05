"""
Authentication Routes (/api/auth)
Handles registration, login, logout, and token-based identity checks.
"""

from flask import Blueprint, request, g
from pydantic import ValidationError
from app.models.user import User, FarmerProfile, BuyerProfile
from app.models.farm import Farm
from app.schemas.validators import RegisterRequest, LoginRequest
from app.auth.jwt_handler import generate_access_token, login_required
from app.utils.response import success_response, error_response
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    raw_data = request.get_json() or {}
    try:
        data = RegisterRequest(**raw_data)
    except ValidationError as err:
        return error_response(code="VALIDATION_ERROR", message="Invalid registration parameters", details=err.errors(), status_code=400)

    # Check email collision
    if User.query.filter_by(email=data.email).first():
        return error_response(code="EMAIL_EXISTS", message="An account with this email address already exists", status_code=409)

    user = User(
        email=data.email,
        full_name=data.full_name,
        phone=data.phone,
        role=data.role
    )
    user.set_password(data.password)
    db.session.add(user)
    db.session.flush()

    # Create associated profile
    if data.role == 'farmer':
        farmer = FarmerProfile(
            user_id=user.id,
            state=data.state or 'Karnataka',
            district=data.district or 'Bengaluru Rural',
            total_acreage=data.total_acreage or 5.0,
            soil_type=data.soil_type or 'Red Loam'
        )
        db.session.add(farmer)
        db.session.flush()

        # Create default primary farm
        default_farm = Farm(
            farmer_id=farmer.id,
            farm_name=f"{data.full_name}'s Farm",
            location_name=f"{farmer.district}, {farmer.state}",
            size_in_acres=farmer.total_acreage
        )
        db.session.add(default_farm)

    elif data.role == 'buyer':
        buyer = BuyerProfile(
            user_id=user.id,
            business_name=data.business_name or f"{data.full_name} Enterprises",
            delivery_address=data.delivery_address or "Bangalore Market Yard"
        )
        db.session.add(buyer)

    db.session.commit()
    token = generate_access_token(user)

    return success_response(
        data={
            "token": token,
            "user": user.to_dict()
        },
        message="Registration successful. Welcome to EsyKrushi!",
        status_code=201
    )


@auth_bp.route('/login', methods=['POST'])
def login():
    raw_data = request.get_json() or {}
    try:
        data = LoginRequest(**raw_data)
    except ValidationError as err:
        return error_response(code="VALIDATION_ERROR", message="Invalid login credentials format", details=err.errors(), status_code=400)

    user = User.query.filter_by(email=data.email).first()
    if not user or not user.check_password(data.password):
        return error_response(code="INVALID_CREDENTIALS", message="Invalid email or password", status_code=401)

    if not user.is_active:
        return error_response(code="ACCOUNT_DISABLED", message="This account has been deactivated. Please contact support.", status_code=403)

    token = generate_access_token(user)
    return success_response(
        data={
            "token": token,
            "user": user.to_dict()
        },
        message=f"Welcome back, {user.full_name}!"
    )


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user_profile():
    user: User = g.current_user
    return success_response(data={"user": user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    # Client removes token
    return success_response(message="Logged out successfully")
