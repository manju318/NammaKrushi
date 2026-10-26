"""
Live WebRTC Video Calling Routes (/api/calls)
Provides authenticated signaling channel, session authorization,
SDP offer/answer exchange, and ICE candidate synchronization.
"""

import json
from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.marketplace import Product, VideoCallSession
from app.models.notification import Notification
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

call_bp = Blueprint('calls', __name__)

DEFAULT_ICE_SERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:stun1.l.google.com:19302"},
    {"urls": "stun:stun2.l.google.com:19302"}
]

@call_bp.route('/config', methods=['GET'])
@login_required
def get_webrtc_config():
    """Returns official public STUN server configurations for WebRTC peer connection."""
    return success_response(data={"iceServers": DEFAULT_ICE_SERVERS})


@call_bp.route('/request', methods=['POST'])
@login_required
def request_video_call():
    """
    Buyer requests a live video crop inspection call with the farmer.
    Only approved products are eligible for pre-purchase video inspection.
    """
    user: User = g.current_user
    data = request.get_json() or {}
    product_id = data.get('product_id')

    if not product_id:
        return error_response(code="MISSING_PRODUCT_ID", message="product_id is required", status_code=400)

    product = Product.query.get(product_id)
    if not product or not product.is_active or not product.is_approved:
        return error_response(code="PRODUCT_UNAVAILABLE", message="Product is not available for video inspection", status_code=400)

    farmer_user_id = product.seller.user_id if product.seller else None
    if not farmer_user_id:
        return error_response(code="SELLER_NOT_FOUND", message="Farmer account associated with produce not found", status_code=404)

    if farmer_user_id == user.id:
        return error_response(code="INVALID_CALL", message="Cannot request a video inspection call with yourself", status_code=400)

    # Check for active existing call
    existing_call = VideoCallSession.query.filter_by(
        product_id=product.id,
        buyer_id=user.id,
        status='requested'
    ).first()
    if existing_call:
        return success_response(
            data={"session": existing_call.to_dict(), "iceServers": DEFAULT_ICE_SERVERS},
            message="Active call request already pending"
        )

    call_session = VideoCallSession(
        product_id=product.id,
        buyer_id=user.id,
        farmer_id=farmer_user_id,
        status='requested'
    )
    db.session.add(call_session)

    # Send in-app notification to the farmer
    notif = Notification(
        user_id=farmer_user_id,
        title="Incoming Video Call Request",
        message=f"{user.full_name} is requesting a live video call to inspect your {product.name}.",
        type="video_call"
    )
    db.session.add(notif)
    db.session.commit()

    return success_response(
        data={"session": call_session.to_dict(), "iceServers": DEFAULT_ICE_SERVERS},
        message="Video call request sent to farmer",
        status_code=201
    )


@call_bp.route('/incoming', methods=['GET'])
@login_required
def get_incoming_calls():
    """
    Farmer checks for active pending video call requests.
    """
    user: User = g.current_user
    pending_calls = VideoCallSession.query.filter_by(
        farmer_id=user.id,
        status='requested'
    ).order_by(VideoCallSession.created_at.desc()).all()

    return success_response(
        data={"calls": [c.to_dict() for c in pending_calls]},
        message="Incoming call sessions retrieved"
    )


@call_bp.route('/<string:session_id>/respond', methods=['POST'])
@login_required
def respond_to_call(session_id):
    """
    Farmer accepts or declines the incoming video call request.
    """
    user: User = g.current_user
    session = VideoCallSession.query.filter_by(session_id=session_id).first()
    if not session:
        return error_response(code="NOT_FOUND", message="Call session not found", status_code=404)

    if session.farmer_id != user.id:
        return error_response(code="FORBIDDEN", message="Only the target farmer can respond to this call", status_code=403)

    data = request.get_json() or {}
    action = data.get('action', 'accept')  # 'accept' or 'decline'

    if action == 'accept':
        session.status = 'accepted'
        session.started_at = datetime.utcnow()
    else:
        session.status = 'declined'
        session.ended_at = datetime.utcnow()

    db.session.commit()
    return success_response(data={"session": session.to_dict()}, message=f"Call request {action}ed")


@call_bp.route('/<string:session_id>/signal', methods=['POST'])
@login_required
def exchange_webrtc_signal(session_id):
    """
    WebRTC Signaling Channel.
    Stores and synchronizes SDP offer, SDP answer, and ICE candidates between authorized peers.
    """
    user: User = g.current_user
    session = VideoCallSession.query.filter_by(session_id=session_id).first()
    if not session:
        return error_response(code="NOT_FOUND", message="Call session not found", status_code=404)

    if session.buyer_id != user.id and session.farmer_id != user.id:
        return error_response(code="FORBIDDEN", message="Unauthorized to participate in this call session", status_code=403)

    data = request.get_json() or {}
    sdp_offer = data.get('sdp_offer')
    sdp_answer = data.get('sdp_answer')
    ice_candidate = data.get('ice_candidate')

    if sdp_offer:
        session.sdp_offer = sdp_offer
        session.status = 'in_progress'

    if sdp_answer:
        session.sdp_answer = sdp_answer
        session.status = 'in_progress'

    if ice_candidate:
        existing = []
        if session.ice_candidates:
            try:
                existing = json.loads(session.ice_candidates)
            except Exception:
                existing = []
        existing.append(ice_candidate)
        session.ice_candidates = json.dumps(existing)

    db.session.commit()
    return success_response(data={"session": session.to_dict()}, message="Signal processed")


@call_bp.route('/<string:session_id>/poll', methods=['GET'])
@login_required
def poll_call_status(session_id):
    """
    Retrieves current signaling data and participant status.
    """
    user: User = g.current_user
    session = VideoCallSession.query.filter_by(session_id=session_id).first()
    if not session:
        return error_response(code="NOT_FOUND", message="Call session not found", status_code=404)

    if session.buyer_id != user.id and session.farmer_id != user.id:
        return error_response(code="FORBIDDEN", message="Unauthorized call session", status_code=403)

    return success_response(
        data={"session": session.to_dict(), "iceServers": DEFAULT_ICE_SERVERS},
        message="Call session state retrieved"
    )


@call_bp.route('/<string:session_id>/end', methods=['POST'])
@login_required
def end_call(session_id):
    """Ends the video call session."""
    user: User = g.current_user
    session = VideoCallSession.query.filter_by(session_id=session_id).first()
    if not session:
        return error_response(code="NOT_FOUND", message="Call session not found", status_code=404)

    if session.buyer_id != user.id and session.farmer_id != user.id and user.role != 'admin':
        return error_response(code="FORBIDDEN", message="Unauthorized to terminate this call", status_code=403)

    session.status = 'ended'
    session.ended_at = datetime.utcnow()
    db.session.commit()

    return success_response(data={"session": session.to_dict()}, message="Call ended successfully")
