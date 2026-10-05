"""
JWT Authentication & Authorization Utilities
Provides token generation, decoding, and role-based access control decorators.
"""

from functools import wraps
from datetime import datetime, timedelta, timezone
import jwt
from flask import request, current_app, g
from app.utils.response import error_response
from app.models.user import User

def generate_access_token(user: User) -> str:
    payload = {
        'sub': str(user.id),
        'email': user.email,
        'role': user.role,
        'full_name': user.full_name,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(days=7))
    }
    secret = current_app.config.get('JWT_SECRET_KEY', 'default-jwt-secret')
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_access_token(token: str):
    secret = current_app.config.get('JWT_SECRET_KEY', 'default-jwt-secret')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return error_response(code="UNAUTHORIZED", message="Authorization token is missing or malformed", status_code=401)
        
        token = auth_header.split(' ')[1]
        payload = decode_access_token(token)
        if not payload:
            return error_response(code="TOKEN_EXPIRED", message="Token has expired or is invalid. Please log in again.", status_code=401)
        
        user_id = int(payload.get('sub'))
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return error_response(code="USER_NOT_FOUND", message="User account not found or deactivated", status_code=401)
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles):
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]

    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user: User = g.current_user
            if user.role not in allowed_roles and user.role != 'admin':
                return error_response(
                    code="FORBIDDEN",
                    message=f"Access denied. Required role: {', '.join(allowed_roles)}",
                    status_code=403
                )
            return f(*args, **kwargs)
        return decorated_function
    return decorator
