"""
Farm Management Routes (/api/farm)
Handles farm profile, acreage, and cultivated crop records.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.farm import Farm, Crop
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

farm_bp = Blueprint('farm', __name__)

@farm_bp.route('', methods=['GET'])
@login_required
def get_farm_details():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="User profile does not contain farm details", status_code=400)

    farms = user.farmer_profile.farms.all()
    farms_data = []
    for f in farms:
        f_dict = f.to_dict()
        f_dict['crops'] = [c.to_dict() for c in f.crops.all()]
        farms_data.append(f_dict)

    return success_response(
        data={"farms": farms_data, "profile": user.farmer_profile.to_dict()},
        message="Farm details retrieved"
    )


@farm_bp.route('', methods=['POST'])
@login_required
def create_or_update_farm():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Farmer profile required", status_code=400)

    data = request.get_json() or {}
    farm = user.farmer_profile.farms.first()

    if not farm:
        farm = Farm(
            farmer_id=user.farmer_profile.id,
            farm_name=data.get('farm_name', f"{user.full_name}'s Farm"),
            location_name=data.get('location_name', 'Bengaluru Rural'),
            latitude=data.get('latitude', 13.0827),
            longitude=data.get('longitude', 77.5877),
            size_in_acres=data.get('size_in_acres', 5.0),
            irrigation_source=data.get('irrigation_source', 'Drip & Borewell')
        )
        db.session.add(farm)
    else:
        farm.farm_name = data.get('farm_name', farm.farm_name)
        farm.location_name = data.get('location_name', farm.location_name)
        farm.size_in_acres = data.get('size_in_acres', farm.size_in_acres)
        farm.irrigation_source = data.get('irrigation_source', farm.irrigation_source)
        if 'latitude' in data: farm.latitude = data['latitude']
        if 'longitude' in data: farm.longitude = data['longitude']

    db.session.commit()
    return success_response(data={"farm": farm.to_dict()}, message="Farm profile updated successfully")


@farm_bp.route('/crops', methods=['POST'])
@login_required
def add_crop():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Farmer profile required", status_code=400)

    data = request.get_json() or {}
    farm = user.farmer_profile.farms.first()
    if not farm:
        return error_response(code="NO_FARM", message="No farm found to associate crop with", status_code=404)

    sowing_date = datetime.strptime(data['sowing_date'], '%Y-%m-%d').date() if data.get('sowing_date') else None

    crop = Crop(
        farm_id=farm.id,
        crop_name=data.get('crop_name', 'Tomato'),
        variety=data.get('variety', 'Hybrid F1'),
        sowing_date=sowing_date,
        current_stage=data.get('current_stage', 'Vegetative'),
        acreage=data.get('acreage', 2.0),
        status='Active'
    )
    db.session.add(crop)
    db.session.commit()

    return success_response(data={"crop": crop.to_dict()}, message="Crop plot registered successfully", status_code=201)


@farm_bp.route('/crops/<int:crop_id>', methods=['PUT'])
@login_required
def update_crop(crop_id):
    crop = Crop.query.get(crop_id)
    if not crop:
        return error_response(code="CROP_NOT_FOUND", message="Crop record not found", status_code=404)

    data = request.get_json() or {}
    if 'current_stage' in data: crop.current_stage = data['current_stage']
    if 'status' in data: crop.status = data['status']
    if 'acreage' in data: crop.acreage = data['acreage']
    
    db.session.commit()
    return success_response(data={"crop": crop.to_dict()}, message="Crop record updated")
