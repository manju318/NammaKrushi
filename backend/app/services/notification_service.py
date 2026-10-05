"""
Notification Service
Handles multi-channel notification dispatch (In-App, Email, and modular SMS hooks).
"""

from app.models.notification import Notification
from app import db

def create_notification(user_id: int, title: str, message: str, notif_type: str = "System", action_url: str = None) -> Notification:
    """
    Creates an in-app notification record and initiates modular dispatch hooks.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        action_url=action_url
    )
    db.session.add(notif)
    db.session.commit()

    # Modular hook: Can trigger async email or SMS here
    _send_email_mock(user_id, title, message)
    return notif

def get_user_notifications(user_id: int, unread_only: bool = False, limit: int = 20):
    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)
    return query.order_by(Notification.created_at.desc()).limit(limit).all()

def mark_notification_read(notification_id: int, user_id: int):
    notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if notif:
        notif.is_read = True
        db.session.commit()
        return True
    return False

def mark_all_notifications_read(user_id: int):
    Notification.query.filter_by(user_id=user_id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return True

def _send_email_mock(user_id: int, title: str, message: str):
    """
    Modular email hook. In production, connects with smtplib / SendGrid / SES.
    """
    # print(f"[NotificationService] Dispatched email notification to user {user_id}: {title}")
    pass
