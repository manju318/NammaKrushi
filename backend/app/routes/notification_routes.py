"""
Notification Routes (/api/notifications)
Allows users to view in-app alerts, acknowledge reminders, and clear notification queues.
"""

from flask import Blueprint, request, g
from app.models.user import User
from app.services.notification_service import get_user_notifications, mark_notification_read, mark_all_notifications_read
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response

notification_bp = Blueprint('notifications', __name__)

@notification_bp.route('', methods=['GET'])
@login_required
def list_notifications():
    user: User = g.current_user
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    notifs = get_user_notifications(user.id, unread_only=unread_only)
    return success_response(
        data={"notifications": [n.to_dict() for n in notifs]},
        message="Notifications retrieved"
    )

@notification_bp.route('/<int:notif_id>/read', methods=['POST'])
@login_required
def read_one(notif_id):
    user: User = g.current_user
    success = mark_notification_read(notif_id, user.id)
    if not success:
        return error_response(code="NOT_FOUND", message="Notification not found", status_code=404)
    return success_response(message="Notification marked as read")

@notification_bp.route('/read-all', methods=['POST'])
@login_required
def read_all():
    user: User = g.current_user
    mark_all_notifications_read(user.id)
    return success_response(message="All notifications marked as read")
