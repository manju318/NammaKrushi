"""
Farm Inventory Management Routes (/api/inventory)
Tracks seeds, fertilizers, pesticides, tools, and signals low-stock replenishment alerts.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.farm import Inventory
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('', methods=['GET'])
@login_required
def list_inventory():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Inventory belongs to farmer profiles", status_code=400)

    farms = user.farmer_profile.farms.all()
    farm_ids = [f.id for f in farms]

    items = Inventory.query.filter(Inventory.farm_id.in_(farm_ids)).order_by(Inventory.item_name.asc()).all()
    
    total_val = sum(item.quantity * item.unit_cost for item in items)
    low_stock_count = sum(1 for item in items if item.is_low_stock)

    return success_response(
        data={
            "items": [item.to_dict() for item in items],
            "total_valuation": round(total_val, 2),
            "low_stock_items_count": low_stock_count
        },
        message="Inventory items retrieved"
    )


@inventory_bp.route('', methods=['POST'])
@login_required
def create_inventory_item():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Farmer profile required", status_code=400)

    farm = user.farmer_profile.farms.first()
    if not farm:
        return error_response(code="NO_FARM", message="Farm required to add inventory", status_code=404)

    data = request.get_json() or {}
    name = data.get('item_name')
    if not name:
        return error_response(code="MISSING_NAME", message="Item name is required", status_code=400)

    exp_date = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None

    item = Inventory(
        farm_id=farm.id,
        item_name=name,
        category=data.get('category', 'Seeds'),
        quantity=float(data.get('quantity', 0.0)),
        unit=data.get('unit', 'kg'),
        min_threshold=float(data.get('min_threshold', 5.0)),
        unit_cost=float(data.get('unit_cost', 0.0)),
        expiry_date=exp_date
    )
    db.session.add(item)
    db.session.commit()

    return success_response(data={"item": item.to_dict()}, message="Inventory item added successfully", status_code=201)


@inventory_bp.route('/<int:item_id>', methods=['PUT'])
@login_required
def update_inventory_item(item_id):
    item = Inventory.query.get(item_id)
    if not item:
        return error_response(code="NOT_FOUND", message="Inventory item not found", status_code=404)

    data = request.get_json() or {}
    if 'item_name' in data: item.item_name = data['item_name']
    if 'category' in data: item.category = data['category']
    if 'quantity' in data: item.quantity = float(data['quantity'])
    if 'unit' in data: item.unit = data['unit']
    if 'min_threshold' in data: item.min_threshold = float(data['min_threshold'])
    if 'unit_cost' in data: item.unit_cost = float(data['unit_cost'])
    if 'expiry_date' in data and data['expiry_date']:
        item.expiry_date = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date()

    db.session.commit()
    return success_response(data={"item": item.to_dict()}, message="Inventory item updated")


@inventory_bp.route('/<int:item_id>', methods=['DELETE'])
@login_required
def delete_inventory_item(item_id):
    item = Inventory.query.get(item_id)
    if not item:
        return error_response(code="NOT_FOUND", message="Inventory item not found", status_code=404)

    db.session.delete(item)
    db.session.commit()
    return success_response(message="Inventory item deleted successfully")
