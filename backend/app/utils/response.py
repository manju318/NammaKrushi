"""
API Response Formatting Utility
Standardizes all REST responses with uniform success/error envelopes.
"""

from flask import jsonify

def success_response(data=None, message="Operation completed successfully", status_code=200):
    response = {
        "success": True,
        "data": data if data is not None else {},
        "message": message
    }
    return jsonify(response), status_code

def error_response(code="BAD_REQUEST", message="An error occurred", status_code=400, details=None):
    error_obj = {
        "code": code,
        "message": message
    }
    if details:
        error_obj["details"] = details
    response = {
        "success": False,
        "error": error_obj
    }
    return jsonify(response), status_code
