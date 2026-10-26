"""
AI Agricultural Assistant Routes (/api/ai)
Provides grounded, context-aware chatbot consultations with citation references.
"""

from flask import Blueprint, request, g
from app.models.user import User
from app.models.ai_models import AIConversation, AIMessage
from app.models.farm import Crop, Journal
from app.services.ai_service import generate_agricultural_response
from app.services.weather_service import get_current_weather
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    user: User = g.current_user
    data = request.get_json() or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return error_response(code="EMPTY_MESSAGE", message="Message cannot be empty", status_code=400)

    conv_id = data.get('conversation_id')
    conversation = None
    if conv_id:
        conversation = AIConversation.query.filter_by(id=conv_id, user_id=user.id).first()

    if not conversation:
        title = user_message[:40] + ("..." if len(user_message) > 40 else "")
        conversation = AIConversation(user_id=user.id, title=title)
        db.session.add(conversation)
        db.session.flush()

    # Save User message
    user_msg_record = AIMessage(
        conversation_id=conversation.id,
        role='user',
        message_text=user_message
    )
    db.session.add(user_msg_record)

    # Compile rich farm context for grounding
    farm_context = {}
    if user.farmer_profile:
        fp = user.farmer_profile
        farm = fp.farms.first()
        farm_context["location"] = f"{fp.district}, {fp.state}"
        farm_context["soil_type"] = fp.soil_type
        
        # Weather
        if farm:
            w = get_current_weather(farm.latitude, farm.longitude)
            farm_context["temperature"] = w.get("temperature")
            farm_context["humidity"] = w.get("humidity")
            farm_context["weather_condition"] = w.get("condition")

        # Active Crop
        active_crop = Crop.query.filter(Crop.farm_id.in_([f.id for f in fp.farms.all()]), Crop.status == 'Active').first() if fp.farms.count() > 0 else None
        if active_crop:
            farm_context["crop_name"] = active_crop.crop_name
            farm_context["crop_stage"] = active_crop.current_stage

        # Recent Journal observation
        recent_j = Journal.query.filter(Journal.farm_id.in_([f.id for f in fp.farms.all()])).order_by(Journal.entry_date.desc()).first() if fp.farms.count() > 0 else None
        if recent_j:
            farm_context["recent_journal"] = f"{recent_j.activity_type} - {recent_j.observations}"

    # Override with request specifics if provided
    if data.get('current_crop'): farm_context["crop_name"] = data['current_crop']
    if data.get('crop_stage'): farm_context["crop_stage"] = data['crop_stage']
    if data.get('soil_type'): farm_context["soil_type"] = data['soil_type']

    language = data.get('language', 'en')

    # Fetch last 6 messages from this conversation for multi-turn chat memory
    history_records = AIMessage.query.filter_by(conversation_id=conversation.id).order_by(AIMessage.created_at.asc()).all()
    # Exclude the message we just added
    history_records = [m for m in history_records if m.id != user_msg_record.id][-6:]
    conversation_history = [
        {"role": "user" if m.role == "user" else "model", "parts": [m.message_text]}
        for m in history_records
    ]

    # Generate response
    response_data = generate_agricultural_response(
        user_message=user_message,
        farm_context=farm_context,
        conversation_history=conversation_history,
        language=language
    )

    # Save Assistant message
    assistant_msg_record = AIMessage(
        conversation_id=conversation.id,
        role='assistant',
        message_text=response_data.get("reply", ""),
        sources_cited=response_data.get("citations", [])
    )
    db.session.add(assistant_msg_record)
    db.session.commit()

    return success_response(
        data={
            "conversation_id": conversation.id,
            "reply": response_data.get("reply"),
            "citations": response_data.get("citations", []),
            "provider": response_data.get("provider"),
            "is_grounded": response_data.get("is_grounded", False),
            "language": response_data.get("language", language),
            "created_at": assistant_msg_record.created_at.isoformat()
        },
        message="AI response generated"
    )


@ai_bp.route('/history', methods=['GET'])
@login_required
def history():
    user: User = g.current_user
    convs = AIConversation.query.filter_by(user_id=user.id).order_by(AIConversation.created_at.desc()).limit(10).all()
    return success_response(data={"conversations": [c.to_dict() for c in convs]}, message="AI conversation history retrieved")
