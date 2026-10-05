"""
Direct Farmer Marketplace Routes (/api/products)
Enables farmers to list fresh produce, and allows buyers to search, filter, and purchase with verified seller badges.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.marketplace import Product
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

marketplace_bp = Blueprint('marketplace', __name__)

@marketplace_bp.route('', methods=['GET'])
def list_products():
    category = request.args.get('category')
    search = request.args.get('search')
    seller_id = request.args.get('seller_id', type=int)
    sort_by = request.args.get('sort_by', 'newest')

    query = Product.query.filter_by(is_active=True, is_approved=True)

    if seller_id:
        query = query.filter_by(seller_id=seller_id)
    if category and category != 'All':
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%") | Product.description.ilike(f"%{search}%"))

    if sort_by == 'price_low':
        query = query.order_by(Product.price_per_unit.asc())
    elif sort_by == 'price_high':
        query = query.order_by(Product.price_per_unit.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    products = query.all()
    return success_response(data={"products": [p.to_dict() for p in products]}, message=f"Retrieved {len(products)} products")


@marketplace_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return error_response(code="NOT_FOUND", message="Product not found", status_code=404)
    return success_response(data={"product": product.to_dict()}, message="Product details retrieved")


@marketplace_bp.route('', methods=['POST'])
@login_required
def create_product():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Only registered farmers can list produce on the marketplace", status_code=403)

    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price_per_unit')
    qty = data.get('available_quantity')

    if not name or price is None or qty is None:
        return error_response(code="MISSING_DATA", message="Product name, price, and available quantity are required", status_code=400)

    harvest_date = datetime.strptime(data['harvest_date'], '%Y-%m-%d').date() if data.get('harvest_date') else datetime.utcnow().date()

    product = Product(
        seller_id=user.farmer_profile.id,
        name=name,
        category=data.get('category', 'Vegetables'),
        description=data.get('description', ''),
        price_per_unit=float(price),
        unit=data.get('unit', 'kg'),
        available_quantity=float(qty),
        harvest_date=harvest_date,
        farm_location=data.get('farm_location', f"{user.farmer_profile.district}, {user.farmer_profile.state}"),
        image_url=data.get('image_url')
    )
    db.session.add(product)
    db.session.commit()

    return success_response(data={"product": product.to_dict()}, message="Product listed successfully on marketplace", status_code=201)


@marketplace_bp.route('/<int:product_id>', methods=['PUT'])
@login_required
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return error_response(code="NOT_FOUND", message="Product not found", status_code=404)

    user: User = g.current_user
    # Must be owner or admin
    if user.role != 'admin' and (not user.farmer_profile or product.seller_id != user.farmer_profile.id):
        return error_response(code="FORBIDDEN", message="You do not own this product listing", status_code=403)

    data = request.get_json() or {}
    if 'name' in data: product.name = data['name']
    if 'category' in data: product.category = data['category']
    if 'description' in data: product.description = data['description']
    if 'price_per_unit' in data: product.price_per_unit = float(data['price_per_unit'])
    if 'available_quantity' in data: product.available_quantity = float(data['available_quantity'])
    if 'unit' in data: product.unit = data['unit']
    if 'image_url' in data: product.image_url = data['image_url']
    if 'is_active' in data: product.is_active = bool(data['is_active'])

    db.session.commit()
    return success_response(data={"product": product.to_dict()}, message="Product listing updated")


@marketplace_bp.route('/<int:product_id>', methods=['DELETE'])
@login_required
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return error_response(code="NOT_FOUND", message="Product not found", status_code=404)

    user: User = g.current_user
    if user.role != 'admin' and (not user.farmer_profile or product.seller_id != user.farmer_profile.id):
        return error_response(code="FORBIDDEN", message="You do not own this product listing", status_code=403)

    product.is_active = False
    db.session.commit()
    return success_response(message="Product listing removed successfully")
