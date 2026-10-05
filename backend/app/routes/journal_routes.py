"""
Digital Farm Journal Routes (/api/journal)
Records chronological field activities, pest/disease observations, costs, and weather snapshots.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.farm import Journal
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

journal_bp = Blueprint('journal', __name__)

@journal_bp.route('', methods=['GET'])
@login_required
def list_journal_entries():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Journal belongs to farmer profiles", status_code=400)

    farms = user.farmer_profile.farms.all()
    farm_ids = [f.id for f in farms]

    entries = Journal.query.filter(Journal.farm_id.in_(farm_ids)).order_by(Journal.entry_date.desc()).all()
    return success_response(data={"journals": [e.to_dict() for e in entries]}, message="Journal entries retrieved")


@journal_bp.route('', methods=['POST'])
@login_required
def create_journal_entry():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Farmer profile required", status_code=400)

    farm = user.farmer_profile.farms.first()
    if not farm:
        return error_response(code="NO_FARM", message="Farm required to log journal entry", status_code=404)

    data = request.get_json() or {}
    activity = data.get('activity_type')
    observations = data.get('observations')

    if not activity or not observations:
        return error_response(code="MISSING_DATA", message="Activity type and observations are required", status_code=400)

    entry_date = datetime.strptime(data['entry_date'], '%Y-%m-%d').date() if data.get('entry_date') else datetime.utcnow().date()

    journal = Journal(
        farm_id=farm.id,
        crop_id=data.get('crop_id'),
        entry_date=entry_date,
        activity_type=activity,
        observations=observations,
        weather_notes=data.get('weather_notes', ''),
        cost_involved=float(data.get('cost_involved', 0.0)),
        image_url=data.get('image_url')
    )
    db.session.add(journal)
    db.session.commit()

    return success_response(data={"journal": journal.to_dict()}, message="Journal entry recorded successfully", status_code=201)


@journal_bp.route('/<int:journal_id>', methods=['PUT'])
@login_required
def update_journal(journal_id):
    journal = Journal.query.get(journal_id)
    if not journal:
        return error_response(code="NOT_FOUND", message="Journal entry not found", status_code=404)

    data = request.get_json() or {}
    if 'activity_type' in data: journal.activity_type = data['activity_type']
    if 'observations' in data: journal.observations = data['observations']
    if 'weather_notes' in data: journal.weather_notes = data['weather_notes']
    if 'cost_involved' in data: journal.cost_involved = float(data['cost_involved'])
    if 'image_url' in data: journal.image_url = data['image_url']
    if 'entry_date' in data and data['entry_date']:
        journal.entry_date = datetime.strptime(data['entry_date'], '%Y-%m-%d').date()

    db.session.commit()
    return success_response(data={"journal": journal.to_dict()}, message="Journal entry updated")


@journal_bp.route('/<int:journal_id>', methods=['DELETE'])
@login_required
def delete_journal(journal_id):
    journal = Journal.query.get(journal_id)
    if not journal:
        return error_response(code="NOT_FOUND", message="Journal entry not found", status_code=404)

    db.session.delete(journal)
    db.session.commit()
    return success_response(message="Journal entry deleted successfully")
