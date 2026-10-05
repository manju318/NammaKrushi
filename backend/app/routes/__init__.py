"""
Routes Package Initialization
Exports all application blueprints.
"""

from app.routes.auth_routes import auth_bp
from app.routes.weather_routes import weather_bp
from app.routes.crop_routes import crop_bp
from app.routes.farm_routes import farm_bp
from app.routes.task_routes import task_bp
from app.routes.journal_routes import journal_bp
from app.routes.inventory_routes import inventory_bp
from app.routes.expense_routes import expense_bp
from app.routes.marketplace_routes import marketplace_bp
from app.routes.order_routes import order_bp
from app.routes.payment_routes import payment_bp
from app.routes.ai_routes import ai_bp
from app.routes.report_routes import report_bp
from app.routes.admin_routes import admin_bp
from app.routes.notification_routes import notification_bp

__all__ = [
    'auth_bp', 'weather_bp', 'crop_bp', 'farm_bp', 'task_bp',
    'journal_bp', 'inventory_bp', 'expense_bp', 'marketplace_bp',
    'order_bp', 'payment_bp', 'ai_bp', 'report_bp', 'admin_bp', 'notification_bp'
]
