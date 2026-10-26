"""
ML Crop Recommendation Routes (/api/crop)
Handles soil/climate inference, top-3 crop ranking, explanations, and model evaluation metrics.
"""

from flask import Blueprint, request, g
from app.auth.jwt_handler import login_required
from app.services.crop_service import predict_crop_recommendations, get_crop_history
from app.services.weather_service import get_current_weather
from ml.evaluate import get_model_evaluation_metrics
from app.utils.response import success_response, error_response

crop_bp = Blueprint('crop', __name__)

@crop_bp.route('/predict', methods=['POST'])
@login_required
def predict():
    user = g.current_user

    data = request.get_json() or {}

    # Extract parameters
    n = data.get('N') or data.get('nitrogen')
    p = data.get('P') or data.get('phosphorus')
    k = data.get('K') or data.get('potassium')
    ph = data.get('ph')

    # Climate values: check if supplied or fetch from coordinates
    temp = data.get('temperature')
    hum = data.get('humidity')
    rain = data.get('rainfall')

    # If climate missing but coordinates available, retrieve live weather
    lat = data.get('latitude')
    lon = data.get('longitude')
    if (temp is None or hum is None) and lat is not None and lon is not None:
        weather_info = get_current_weather(float(lat), float(lon))
        temp = temp or weather_info.get('temperature')
        hum = hum or weather_info.get('humidity')
        rain = rain or (weather_info.get('precipitation', 0.0) * 10 + 60.0) # Estimate seasonal mm

    # Check for missing values
    missing = []
    if n is None: missing.append("Nitrogen (N)")
    if p is None: missing.append("Phosphorus (P)")
    if k is None: missing.append("Potassium (K)")
    if ph is None: missing.append("Soil pH")
    if temp is None: missing.append("Temperature")
    if hum is None: missing.append("Humidity")
    if rain is None: missing.append("Rainfall")

    if missing:
        return error_response(
            code="MISSING_AGRICULTURAL_PARAMETERS",
            message=f"Please provide the missing parameter(s): {', '.join(missing)}.",
            details={"missing_fields": missing},
            status_code=400
        )

    farmer_id = user.farmer_profile.id if user.farmer_profile else 1

    payload = {
        'N': float(n),
        'P': float(p),
        'K': float(k),
        'ph': float(ph),
        'temperature': float(temp),
        'humidity': float(hum),
        'rainfall': float(rain),
        'location_name': data.get('location_name', 'Bengaluru Rural')
    }

    success, result = predict_crop_recommendations(farmer_id, payload)
    if not success:
        return error_response(code="PREDICTION_FAILED", message=result.get("message", "Prediction failed"), status_code=500)

    return success_response(
        data=result,
        message="Top 3 crop recommendations generated with agronomic reasoning"
    )


@crop_bp.route('/history', methods=['GET'])
@login_required
def history():
    user = g.current_user
    farmer_id = user.farmer_profile.id if user.farmer_profile else 1
    recs = get_crop_history(farmer_id)
    return success_response(data={"history": recs}, message="Crop recommendation history retrieved")


@crop_bp.route('/metrics', methods=['GET'])
def metrics():
    """
    Returns authentic Scikit-Learn training evaluation metrics and feature importances for viva demonstration.
    """
    eval_metrics = get_model_evaluation_metrics()
    return success_response(data=eval_metrics, message="Model evaluation metrics retrieved successfully")
