"""
Weather Service for ESYKRUSHI
Integrates Open-Meteo (zero-key open access) and OpenWeatherMap APIs.
Features in-memory TTL caching, geocoding, and resilient agricultural demo fallback.
"""

import time
import requests
from flask import current_app

# Simple in-memory cache: { cache_key: { "timestamp": float, "data": dict } }
_WEATHER_CACHE = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

# Default Agro-climatic fallback coordinates (Bengaluru Rural, Mandya, etc.)
DEFAULT_LOCATIONS = {
    "bengaluru": {"lat": 12.9716, "lon": 77.5946, "name": "Bengaluru Rural, Karnataka"},
    "mandya": {"lat": 12.5230, "lon": 76.8967, "name": "Mandya, Karnataka"},
    "mysuru": {"lat": 12.2958, "lon": 76.6394, "name": "Mysuru, Karnataka"},
    "dharwad": {"lat": 15.4589, "lon": 75.0078, "name": "Dharwad, Karnataka"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "name": "Pune, Maharashtra"},
    "coimbatore": {"lat": 11.0168, "lon": 76.9558, "name": "Coimbatore, Tamil Nadu"},
    "delhi": {"lat": 28.6139, "lon": 77.2090, "name": "New Delhi, Delhi"}
}

def geocode_location(query: str):
    """
    Geocodes a location name to lat/lon using Open-Meteo Geocoding API.
    """
    clean_query = query.strip().lower()
    
    # Check default presets first
    for key, loc in DEFAULT_LOCATIONS.items():
        if key in clean_query or clean_query in key:
            return [{
                "name": loc["name"],
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "country": "India"
            }]

    url = f"https://geocoding-api.open-meteo.com/v1/search?name={requests.utils.quote(query)}&count=5&language=en&format=json"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            formatted = []
            for r in results:
                name_parts = [r.get("name")]
                if r.get("admin1"):
                    name_parts.append(r.get("admin1"))
                if r.get("country"):
                    name_parts.append(r.get("country"))
                formatted.append({
                    "name": ", ".join(name_parts),
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude"),
                    "country": r.get("country", "")
                })
            if formatted:
                return formatted
    except Exception as e:
        print(f"[WeatherService] Geocoding API exception: {e}")

    # Fallback to Bengaluru Rural
    default_loc = DEFAULT_LOCATIONS["bengaluru"]
    return [{
        "name": default_loc["name"] + " (Demo Fallback)",
        "latitude": default_loc["lat"],
        "longitude": default_loc["lon"],
        "country": "India",
        "is_demo": True
    }]


def get_current_weather(lat: float, lon: float, location_name: str = None):
    """
    Retrieves current weather conditions with 15-minute caching.
    """
    cache_key = f"curr_{round(lat, 3)}_{round(lon, 3)}"
    now = time.time()
    
    if cache_key in _WEATHER_CACHE:
        entry = _WEATHER_CACHE[cache_key]
        if now - entry["timestamp"] < CACHE_TTL_SECONDS:
            return entry["data"]

    # 1. Try Open-Meteo
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,"
            f"precipitation,rain,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,"
            f"precipitation_probability_max,sunrise,sunset&timezone=auto"
        )
        resp = requests.get(url, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            curr = data.get("current", {})
            daily = data.get("daily", {})
            
            code = curr.get("weather_code", 0)
            condition, icon = _interpret_wmo_code(code)
            
            weather_data = {
                "location": location_name or f"Lat: {lat:.2f}, Lon: {lon:.2f}",
                "latitude": lat,
                "longitude": lon,
                "temperature": curr.get("temperature_2m", 26.5),
                "humidity": curr.get("relative_humidity_2m", 68.0),
                "precipitation": curr.get("precipitation", 0.0),
                "rain": curr.get("rain", 0.0),
                "wind_speed": curr.get("wind_speed_10m", 8.2),
                "condition": condition,
                "icon": icon,
                "weather_code": code,
                "max_temp": daily.get("temperature_2m_max", [29.0])[0] if daily.get("temperature_2m_max") else 29.0,
                "min_temp": daily.get("temperature_2m_min", [21.0])[0] if daily.get("temperature_2m_min") else 21.0,
                "rain_probability": daily.get("precipitation_probability_max", [20])[0] if daily.get("precipitation_probability_max") else 20,
                "sunrise": daily.get("sunrise", ["06:10"])[0] if daily.get("sunrise") else "06:10",
                "sunset": daily.get("sunset", ["18:25"])[0] if daily.get("sunset") else "18:25",
                "is_demo": False,
                "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            _WEATHER_CACHE[cache_key] = {"timestamp": now, "data": weather_data}
            return weather_data
    except Exception as ex:
        print(f"[WeatherService] Live API call failed ({ex}), using demo fallback.")

    # 2. Resilient Agricultural Demo Data
    demo_data = {
        "location": location_name or "Bengaluru Rural (Demo Data)",
        "latitude": lat,
        "longitude": lon,
        "temperature": 27.4,
        "humidity": 72.0,
        "precipitation": 1.2,
        "rain": 1.2,
        "wind_speed": 11.5,
        "condition": "Scattered Clouds / Pleasant",
        "icon": "cloud-sun",
        "weather_code": 2,
        "max_temp": 30.5,
        "min_temp": 21.0,
        "rain_probability": 35,
        "sunrise": "06:12 AM",
        "sunset": "06:31 PM",
        "is_demo": True,
        "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    _WEATHER_CACHE[cache_key] = {"timestamp": now, "data": demo_data}
    return demo_data


def get_weather_forecast(lat: float, lon: float):
    """
    Returns a 7-day daily forecast with rain probabilities and agricultural recommendations.
    """
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,"
            f"precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto"
        )
        resp = requests.get(url, timeout=6)
        if resp.status_code == 200:
            data = resp.json().get("daily", {})
            days = []
            dates = data.get("time", [])
            for i in range(len(dates)):
                w_code = data.get("weather_code", [0])[i]
                cond, icon = _interpret_wmo_code(w_code)
                rain_prob = data.get("precipitation_probability_max", [0])[i]
                
                # Agricultural recommendation
                if rain_prob > 60:
                    ag_advice = "Heavy rainfall likely. Postpone chemical sprays and field irrigation."
                elif rain_prob > 30:
                    ag_advice = "Moderate rain chance. Keep field drainage channels clear."
                else:
                    ag_advice = "Optimal clear weather for harvesting, spraying, and drying produce."

                days.append({
                    "date": dates[i],
                    "max_temp": data.get("temperature_2m_max", [28.0])[i],
                    "min_temp": data.get("temperature_2m_min", [20.0])[i],
                    "condition": cond,
                    "icon": icon,
                    "precipitation_sum": data.get("precipitation_sum", [0.0])[i],
                    "rain_probability": rain_prob,
                    "wind_speed": data.get("wind_speed_10m_max", [10.0])[i],
                    "agricultural_advice": ag_advice
                })
            return {"forecast": days, "is_demo": False}
    except Exception as ex:
        print(f"[WeatherService] Forecast API error: {ex}")

    # Fallback 7-day demo
    from datetime import date, timedelta
    today = date.today()
    demo_days = []
    conditions = ["Partly Cloudy", "Sunny & Clear", "Light Showers", "Overcast", "Sunny", "Scattered Showers", "Clear Sky"]
    icons = ["cloud-sun", "sun", "cloud-drizzle", "cloud", "sun", "cloud-rain", "sun"]
    probs = [25, 10, 65, 45, 15, 70, 5]
    for i in range(7):
        d = today + timedelta(days=i)
        p = probs[i]
        advice = "Favorable conditions for farming activities."
        if p > 50:
            advice = "Rain expected. Delay fertilizer top-dressing and irrigation."
        demo_days.append({
            "date": d.isoformat(),
            "max_temp": 28.5 + (i % 3),
            "min_temp": 20.0 + (i % 2),
            "condition": conditions[i],
            "icon": icons[i],
            "precipitation_sum": 4.5 if p > 50 else 0.2,
            "rain_probability": p,
            "wind_speed": 10.0 + i,
            "agricultural_advice": advice
        })
    return {"forecast": demo_days, "is_demo": True}


def _interpret_wmo_code(code: int):
    """
    Interprets standard WMO weather codes into human-readable description and icon identifier.
    """
    if code == 0:
        return "Clear Sky", "sun"
    elif code in (1, 2):
        return "Partly Cloudy", "cloud-sun"
    elif code == 3:
        return "Overcast", "cloud"
    elif code in (45, 48):
        return "Foggy", "cloud-fog"
    elif code in (51, 53, 55):
        return "Drizzle", "cloud-drizzle"
    elif code in (61, 63, 65):
        return "Rain Showers", "cloud-rain"
    elif code in (80, 81, 82):
        return "Heavy Downpour", "cloud-lightning"
    elif code in (95, 96, 99):
        return "Thunderstorm", "cloud-lightning"
    else:
        return "Cloudy", "cloud"
