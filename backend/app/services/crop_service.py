"""
Crop Recommendation Service
Bridges Flask controller layer to ML inference and database history persistence.
"""

from app.models.ai_models import CropRecommendation
from app.models.farm import Crop
from app import db
from ml.predict import recommender

def predict_crop_recommendations(farmer_id: int, payload: dict):
    """
    Executes ML prediction, saves record to DB, and returns structured recommendations.
    """
    prediction_result = recommender.predict(payload)
    if "error" in prediction_result:
        return False, prediction_result

    recs = prediction_result.get("recommendations", [])
    if not recs:
        return False, {"error": "NO_PREDICTION", "message": "Could not determine crop recommendation for these parameters."}

    top_crop = recs[0]["crop"]
    top_conf = recs[0]["confidence"]

    # Persist in DB
    record = CropRecommendation(
        farmer_id=farmer_id,
        nitrogen=float(payload['N']),
        phosphorus=float(payload['P']),
        potassium=float(payload['K']),
        ph=float(payload['ph']),
        temperature=float(payload['temperature']),
        humidity=float(payload['humidity']),
        rainfall=float(payload['rainfall']),
        location_name=payload.get('location_name', 'Bengaluru Rural'),
        top_crop=top_crop,
        top_confidence=top_conf,
        recommendations_json=recs
    )
    db.session.add(record)
    db.session.commit()

    return True, {
        "id": record.id,
        "recommendations": recs,
        "created_at": record.created_at.isoformat()
    }

def get_crop_history(farmer_id: int):
    """
    Fetches logged historical crop recommendations for the farmer.
    """
    history = CropRecommendation.query.filter_by(farmer_id=farmer_id).order_by(CropRecommendation.created_at.desc()).limit(10).all()
    return [h.to_dict() for h in history]
