"""
Weather Routes (/api/weather)
Provides current climate conditions, 7-day forecast, and geocoding.
"""

from flask import Blueprint, request
from app.services.weather_service import get_current_weather, get_weather_forecast, geocode_location, reverse_geocode
from app.utils.response import success_response, error_response

weather_bp = Blueprint('weather', __name__)

@weather_bp.route('/reverse', methods=['GET'])
def reverse():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    if lat is None or lon is None:
        return error_response(code="MISSING_COORDINATES", message="lat and lon parameters are required", status_code=400)
    loc_name = reverse_geocode(lat, lon)
    return success_response(data={"name": loc_name, "latitude": lat, "longitude": lon}, message="Reverse geocoding successful")

@weather_bp.route('/current', methods=['GET'])
def current():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    loc_name = request.args.get('location', default=None)

    # Defaults to Bengaluru Rural if coordinates omitted
    if lat is None or lon is None:
        lat, lon = 13.0827, 77.5877
        loc_name = loc_name or "Bengaluru Rural, Karnataka"

    data = get_current_weather(lat, lon, loc_name)
    return success_response(data=data, message="Current weather retrieved successfully")


@weather_bp.route('/forecast', methods=['GET'])
def forecast():
    lat = request.args.get('lat', type=float, default=13.0827)
    lon = request.args.get('lon', type=float, default=77.5877)

    data = get_weather_forecast(lat, lon)
    return success_response(data=data, message="7-day agricultural weather forecast retrieved")


@weather_bp.route('/geocode', methods=['GET'])
def geocode():
    q = request.args.get('query', default='').strip()
    if not q:
        return error_response(code="EMPTY_QUERY", message="Location query string cannot be empty", status_code=400)

    results = geocode_location(q)
    return success_response(data={"results": results}, message=f"Found {len(results)} matching location(s)")
