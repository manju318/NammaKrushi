"""
Media and GPS Verification Pipeline
Extracts embedded EXIF GPS metadata from original images and videos.
Performs cryptographic SHA-256 duplicate detection, file signature checking,
and validates distance against declared farm coordinates using the Haversine formula.
"""

import os
import math
import hashlib
from datetime import datetime
from PIL import Image, ExifTags

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'}
ALLOWED_MIME_TYPES = {
    'image/jpeg': b'\xff\xd8\xff',
    'image/png': b'\x89PNG\r\n\x1a\n',
    'image/webp': b'RIFF',
    'video/mp4': b'ftyp',
    'video/quicktime': b'ftyp'
}

def compute_file_hash(file_bytes: bytes) -> str:
    """Computes SHA-256 cryptographic checksum to identify duplicate media."""
    return hashlib.sha256(file_bytes).hexdigest()

def validate_media_signature(file_bytes: bytes, filename: str) -> tuple[bool, str]:
    """Validates file extension and magic byte signatures."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    if len(file_bytes) < 12:
        return False, "File is truncated or corrupted."

    # Validate image signatures
    if ext in ('jpg', 'jpeg'):
        if not file_bytes.startswith(b'\xff\xd8\xff'):
            return False, "Invalid JPEG file header signature."
    elif ext == 'png':
        if not file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            return False, "Invalid PNG file header signature."
    elif ext == 'webp':
        if not (file_bytes.startswith(b'RIFF') and b'WEBP' in file_bytes[:16]):
            return False, "Invalid WebP file header signature."
    elif ext in ('mp4', 'mov'):
        if b'ftyp' not in file_bytes[:32] and b'moov' not in file_bytes[:64]:
            return False, "Invalid MP4/MOV video file header signature."

    return True, ext

def _convert_to_degrees(value) -> float:
    """Helper to convert the GPS coordinates stored in the EXIF to degrees in float format."""
    try:
        # Check if value is a tuple of (degrees, minutes, seconds)
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        try:
            return float(value)
        except Exception:
            return 0.0

def extract_image_exif_gps(image_path: str) -> dict:
    """
    Extracts embedded EXIF GPS coordinates, capture timestamp, and device model from image.
    Never fabricates coordinates if EXIF is missing.
    """
    result = {
        "has_gps": False,
        "latitude": None,
        "longitude": None,
        "capture_timestamp": None,
        "device_make": None,
        "device_model": None,
        "raw_exif_found": False
    }

    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()
            if not exif_data:
                return result

            result["raw_exif_found"] = True

            # Extract basic EXIF tags
            named_exif = {}
            for tag_id, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                named_exif[tag_name] = value

            # Device metadata
            result["device_make"] = str(named_exif.get("Make", "")).strip() or None
            result["device_model"] = str(named_exif.get("Model", "")).strip() or None

            # Capture timestamp
            dt_str = named_exif.get("DateTimeOriginal") or named_exif.get("DateTimeDigitized") or named_exif.get("DateTime")
            if dt_str:
                try:
                    result["capture_timestamp"] = datetime.strptime(str(dt_str)[:19], "%Y:%m:%d %H:%M:%S")
                except Exception:
                    pass

            # Extract GPS info
            gps_info = named_exif.get("GPSInfo")
            if gps_info:
                gps_tags = {}
                for key, val in gps_info.items():
                    sub_name = ExifTags.GPSTAGS.get(key, key)
                    gps_tags[sub_name] = val

                lat_val = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef")
                lon_val = gps_tags.get("GPSLongitude")
                lon_ref = gps_tags.get("GPSLongitudeRef")

                if lat_val and lon_val:
                    lat = _convert_to_degrees(lat_val)
                    if lat_ref and lat_ref.upper() == 'S':
                        lat = -lat

                    lon = _convert_to_degrees(lon_val)
                    if lon_ref and lon_ref.upper() == 'W':
                        lon = -lon

                    # Valid GPS bounds
                    if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0 and not (lat == 0.0 and lon == 0.0):
                        result["has_gps"] = True
                        result["latitude"] = round(lat, 6)
                        result["longitude"] = round(lon, 6)

    except Exception as e:
        print(f"[MediaVerifier] EXIF extraction error: {e}")

    return result

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two GPS coordinates in kilometers.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    r = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)

def evaluate_media_verification(
    exif_result: dict,
    browser_location: dict = None,
    declared_farm_lat: float = None,
    declared_farm_lon: float = None,
    max_allowed_dist_km: float = 25.0
) -> dict:
    """
    Synthesizes layered location evidence.
    Distinguishes embedded EXIF GPS from separately captured browser geolocation.
    Flags weak, missing, or inconsistent evidence for admin moderation.
    """
    warnings = []
    lat = None
    lon = None
    source = 'none'
    accuracy = None
    capture_time = exif_result.get("capture_timestamp")

    if exif_result.get("has_gps"):
        lat = exif_result["latitude"]
        lon = exif_result["longitude"]
        source = 'exif'
        accuracy = 5.0  # Standard GPS chip estimated accuracy in meters
    elif browser_location and browser_location.get("latitude") and browser_location.get("longitude"):
        lat = float(browser_location["latitude"])
        lon = float(browser_location["longitude"])
        source = 'browser_device'
        accuracy = float(browser_location.get("accuracy", 20.0))
        if not capture_time and browser_location.get("capture_timestamp"):
            try:
                capture_time = datetime.fromisoformat(browser_location["capture_timestamp"])
            except Exception:
                capture_time = datetime.utcnow()
        warnings.append("No embedded EXIF GPS in media; coordinates captured separately via device geolocation.")
    else:
        source = 'unverified'
        warnings.append("No location evidence provided or extracted. Product requires manual admin inspection.")

    # Compare distance against declared farm location
    distance_km = None
    if lat is not None and lon is not None and declared_farm_lat is not None and declared_farm_lon is not None:
        distance_km = calculate_haversine_distance(lat, lon, declared_farm_lat, declared_farm_lon)
        if distance_km > max_allowed_dist_km:
            warnings.append(
                f"Location is {distance_km} km away from declared farm location ({declared_farm_lat}, {declared_farm_lon}). Threshold: {max_allowed_dist_km} km."
            )

    # Determine verification status
    if source == 'exif' and (distance_km is None or distance_km <= max_allowed_dist_km):
        status = 'Verified'
    elif source == 'browser_device' and (distance_km is None or distance_km <= max_allowed_dist_km):
        status = 'Warning'
    elif distance_km is not None and distance_km > max_allowed_dist_km:
        status = 'Flagged'
    else:
        status = 'Unverified'

    return {
        "latitude": lat,
        "longitude": lon,
        "location_source": source,
        "accuracy_meters": accuracy,
        "capture_timestamp": capture_time,
        "distance_to_farm_km": distance_km,
        "verification_status": status,
        "verification_warnings": warnings,
        "device_make": exif_result.get("device_make"),
        "device_model": exif_result.get("device_model")
    }
