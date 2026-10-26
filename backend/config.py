"""
ESYKRUSHI Configuration Settings
Handles SQLite fallback, PostgreSQL configuration, JWT secrets, and demo mode.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from backend root or parent
backend_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(backend_dir, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv(os.path.join(os.path.dirname(backend_dir), '.env'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'esykrushi-final-year-engineering-secret-key-2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'esykrushi-jwt-token-signing-key-secure')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    # Database: Default to SQLite file if DATABASE_URL is not set or empty
    raw_db_url = os.getenv('DATABASE_URL')
    if not raw_db_url or raw_db_url.strip() == '':
        default_db = os.path.join(backend_dir, 'esykrushi.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{default_db}"
    else:
        # PostgreSQL support (handle postgres:// legacy scheme if used)
        if raw_db_url.startswith("postgres://"):
            raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = raw_db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # External APIs
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
    WEATHER_PROVIDER = os.getenv('WEATHER_PROVIDER', 'openmeteo')
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'gemini')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

    # Payments
    PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY', 'simulated')
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_esykrushi_demo')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'rzp_test_secret_demo')
    RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')

    # Uploads & Reports
    UPLOAD_FOLDER = os.path.join(os.path.dirname(backend_dir), 'uploads')
    REPORTS_FOLDER = os.path.join(os.path.dirname(backend_dir), 'reports')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'pdf'}

    # Demonstration mode
    DEMO_MODE = os.getenv('DEMO_MODE', 'true').lower() in ('true', '1', 't')
