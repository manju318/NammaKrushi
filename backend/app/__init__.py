"""
Flask Application Factory for ESYKRUSHI
Initializes extensions, registers modular Blueprints, and handles centralized errors.
"""

import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
from app.utils.response import error_response

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)

    # Ensure upload & reports directories exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['REPORTS_FOLDER'], exist_ok=True)

    # Static file serving for uploads & reports
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/reports/download/<path:filename>')
    def serve_report(filename):
        return send_from_directory(app.config['REPORTS_FOLDER'], filename, as_attachment=True)

    # Register Blueprints
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
    from app.routes.call_routes import call_bp
    from app.routes.request_routes import request_bp
    from app.routes.mandi_routes import mandi_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    app.register_blueprint(crop_bp, url_prefix='/api/crop')
    app.register_blueprint(farm_bp, url_prefix='/api/farm')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(journal_bp, url_prefix='/api/journal')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(expense_bp, url_prefix='/api/expenses')
    app.register_blueprint(marketplace_bp, url_prefix='/api/products')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(call_bp, url_prefix='/api/calls')
    app.register_blueprint(request_bp, url_prefix='/api/requests')
    app.register_blueprint(mandi_bp, url_prefix='/api/mandis')

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return error_response(code="BAD_REQUEST", message=str(e), status_code=400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response(code="UNAUTHORIZED", message="Authentication credentials missing or invalid", status_code=401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response(code="FORBIDDEN", message="You do not have permission to access this resource", status_code=403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response(code="NOT_FOUND", message="Requested endpoint or resource was not found", status_code=404)

    @app.errorhandler(500)
    def internal_error(e):
        return error_response(code="INTERNAL_SERVER_ERROR", message="An unexpected server error occurred. Please try again later.", status_code=500)

    return app
