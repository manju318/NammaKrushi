"""
Mandi & Delivery Location Routes (/api/mandis)
Provides searchable APMC yard directories, market locations, and coordinates.
"""

from flask import Blueprint, request
from app.models.marketplace import MandiLocation
from app.utils.response import success_response, error_response

mandi_bp = Blueprint('mandis', __name__)

@mandi_bp.route('', methods=['GET'])
def list_mandis():
    """
    Retrieves APMC Mandis with optional filtering by district, state, or name query.
    """
    search = request.args.get('search', '').strip()
    district = request.args.get('district', '').strip()
    state = request.args.get('state', '').strip()

    query = MandiLocation.query.filter_by(is_active=True)

    if district:
        query = query.filter(MandiLocation.district.ilike(f"%{district}%"))
    if state:
        query = query.filter(MandiLocation.state.ilike(f"%{state}%"))
    if search:
        query = query.filter(
            (MandiLocation.name.ilike(f"%{search}%")) |
            (MandiLocation.district.ilike(f"%{search}%")) |
            (MandiLocation.address.ilike(f"%{search}%"))
        )

    mandis = query.order_by(MandiLocation.district.asc(), MandiLocation.name.asc()).all()
    return success_response(
        data={"mandis": [m.to_dict() for m in mandis]},
        message=f"Retrieved {len(mandis)} APMC mandi locations"
    )

@mandi_bp.route('/<int:mandi_id>', methods=['GET'])
def get_mandi(mandi_id):
    """Retrieves specific mandi location details."""
    mandi = MandiLocation.query.get(mandi_id)
    if not mandi or not mandi.is_active:
        return error_response(code="NOT_FOUND", message="Mandi location not found", status_code=404)
    return success_response(data={"mandi": mandi.to_dict()}, message="Mandi location retrieved")
