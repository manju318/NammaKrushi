"""
Inference Engine for Agricultural Crop Recommendation
Takes soil and climate measurements, executes Random Forest inference,
computes top 3 predictions with probabilities, and synthesizes agronomic explanations.
"""

import os
import joblib
import pandas as pd
import numpy as np

# Agronomic knowledge dictionary for explainability
CROP_AGRONOMIC_PROFILES = {
    "Rice": {
        "season": "Kharif (Monsoon)",
        "water_req": "High (180-300mm)",
        "soil_pref": "Clayey loam, fertile alluvium, high water retention",
        "description": "Requires warm, humid conditions with abundant standing water or assured irrigation."
    },
    "Maize": {
        "season": "Kharif & Rabi",
        "water_req": "Moderate (60-110mm)",
        "soil_pref": "Well-drained deep loamy soil rich in organic matter",
        "description": "Excellent cash crop requiring moderate rainfall, good soil aeration, and balanced nitrogen."
    },
    "Chickpea": {
        "season": "Rabi (Winter)",
        "water_req": "Low to Moderate (65-95mm)",
        "soil_pref": "Well-drained sandy loam or clay loam, high phosphorus",
        "description": "Leguminous pulse crop that fixes atmospheric nitrogen, thriving in cool, dry post-monsoon weather."
    },
    "Kidneybeans": {
        "season": "Rabi / Mild Kharif",
        "water_req": "Moderate (60-150mm)",
        "soil_pref": "Slightly acidic to neutral fertile loam",
        "description": "High market value legume requiring cool ambient temperatures and consistent moisture."
    },
    "Pigeonpeas": {
        "season": "Kharif",
        "water_req": "Moderate (90-200mm)",
        "soil_pref": "Deep well-drained loamy to black cotton soils",
        "description": "Drought-hardy long duration pulse with deep taproot architecture."
    },
    "Mothbeans": {
        "season": "Kharif / Zaid",
        "water_req": "Low (30-75mm)",
        "soil_pref": "Light sandy to arid loamy soils",
        "description": "Exceptionally drought-tolerant desert legume, ideal for arid and semi-arid tracts."
    },
    "Mungbean": {
        "season": "Zaid & Kharif",
        "water_req": "Low (35-60mm)",
        "soil_pref": "Well-drained loam or alluvial soil",
        "description": "Short duration 60-day catch crop that improves soil fertility."
    },
    "Blackgram": {
        "season": "Kharif & Summer",
        "water_req": "Moderate (60-75mm)",
        "soil_pref": "Heavy clay loam to black cotton soils",
        "description": "Nutrient-rich pulse favoring warm, humid climates and moisture-retentive soils."
    },
    "Lentil": {
        "season": "Rabi",
        "water_req": "Low (35-55mm)",
        "soil_pref": "Medium loams to heavy clay soils",
        "description": "Cool-season legume requiring minimal rainfall and modest nitrogen supply."
    },
    "Pomegranate": {
        "season": "Perennial (Ambe / Mrig Bahar)",
        "water_req": "Low to Moderate (100-115mm)",
        "soil_pref": "Deep well-drained light loams, slightly alkaline tolerant",
        "description": "High-value horticultural crop favoring semi-arid warm dry conditions during ripening."
    },
    "Banana": {
        "season": "Perennial / Year-round",
        "water_req": "High (90-120mm regular)",
        "soil_pref": "Deep, rich alluvial soil with high potassium",
        "description": "Heavy feeder requiring high humidity, warm temperature, and abundant potassium nutrition."
    },
    "Mango": {
        "season": "Perennial (Harvest in Summer)",
        "water_req": "Moderate (89-101mm)",
        "soil_pref": "Well-drained deep alluvial or red loamy soil",
        "description": "Needs warm dry winter period for flowering and hot dry climate for fruit development."
    },
    "Grapes": {
        "season": "Perennial",
        "water_req": "Moderate (65-75mm)",
        "soil_pref": "Sandy to clay loam with high potassium and phosphorus",
        "description": "Requires warm, dry days and cool nights with excellent soil drainage."
    },
    "Watermelon": {
        "season": "Zaid / Summer",
        "water_req": "Moderate (40-60mm)",
        "soil_pref": "Sandy loam, rich in organic matter",
        "description": "Warm-season cucurbit needing long hot dry days and well-drained soils."
    },
    "Muskmelon": {
        "season": "Zaid / Summer",
        "water_req": "Low (20-30mm)",
        "soil_pref": "Sandy loam with pH 6.0-6.8",
        "description": "Fast-maturing summer crop demanding high sunshine, dry air, and warm nights."
    },
    "Apple": {
        "season": "Temperate Perennial",
        "water_req": "Moderate (100-125mm)",
        "soil_pref": "Well-drained loamy soil with rich organic content",
        "description": "Demands temperate mountain climate with winter chilling hours."
    },
    "Orange": {
        "season": "Sub-tropical Perennial",
        "water_req": "Moderate (100-120mm)",
        "soil_pref": "Light well-drained sandy loam",
        "description": "Citrus crop needing distinct dry spells to induce profuse flowering."
    },
    "Papaya": {
        "season": "Tropical Perennial",
        "water_req": "Moderate to High (140-250mm)",
        "soil_pref": "Well-aerated rich loamy soil, sensitive to waterlogging",
        "description": "Quick-yielding tropical fruit flourishing in warm, humid microclimates."
    },
    "Coconut": {
        "season": "Coastal Perennial",
        "water_req": "High (130-225mm)",
        "soil_pref": "Coastal sands, red loams, alluvial soils",
        "description": "Flourishes in tropical coastal belts with high relative humidity and warm sun."
    },
    "Cotton": {
        "season": "Kharif",
        "water_req": "Moderate (60-100mm)",
        "soil_pref": "Deep black cotton soils (regur) with high water retention",
        "description": "Major commercial fiber crop requiring long frost-free periods, warm days, and sunshine."
    },
    "Jute": {
        "season": "Kharif",
        "water_req": "High (150-200mm)",
        "soil_pref": "New alluvial soils with good moisture retention",
        "description": "Fiber crop demanding warm, humid monsoon climate and standing water for retting."
    },
    "Coffee": {
        "season": "Hill Plantation Perennial",
        "water_req": "High (115-200mm)",
        "soil_pref": "Deep fertile forest loams, rich in humus, acidic pH 6.0-6.5",
        "description": "Shade-loving plantation crop thriving in Western Ghats hilly terrain with cool elevation."
    }
}

class CropRecommender:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.is_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(current_dir, 'model')
        model_path = os.path.join(model_dir, 'crop_model.joblib')
        scaler_path = os.path.join(model_dir, 'preprocessing_pipeline.joblib')
        encoder_path = os.path.join(model_dir, 'label_encoder.joblib')

        if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(encoder_path):
            try:
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                self.label_encoder = joblib.load(encoder_path)
                self.is_loaded = True
                print("[CropRecommender] Model and preprocessors loaded successfully.")
            except Exception as e:
                print(f"[CropRecommender] Error loading models: {e}")
                self.is_loaded = False
        else:
            print("[CropRecommender] Artifacts not yet found. Retraining or waiting for training step.")
            self.is_loaded = False

    def predict(self, input_features: dict) -> dict:
        """
        Runs ML prediction and builds explanation cards.
        """
        if not self.is_loaded:
            # Try reloading once in case training just completed
            self._load_artifacts()
            if not self.is_loaded:
                raise RuntimeError("Crop recommendation model is not loaded. Please train the model first.")

        feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        missing_features = [f for f in feature_names if f not in input_features or input_features[f] is None]
        if missing_features:
            return {
                "error": "MISSING_FEATURES",
                "missing": missing_features,
                "message": f"Missing agricultural parameters: {', '.join(missing_features)}. Please provide or auto-fetch weather data."
            }

        input_data = pd.DataFrame([{
            'N': float(input_features['N']),
            'P': float(input_features['P']),
            'K': float(input_features['K']),
            'temperature': float(input_features['temperature']),
            'humidity': float(input_features['humidity']),
            'ph': float(input_features['ph']),
            'rainfall': float(input_features['rainfall'])
        }])

        scaled_features = self.scaler.transform(input_data)
        probabilities = self.model.predict_proba(scaled_features)[0]

        # Get top 3 indices sorted descending
        top_indices = np.argsort(probabilities)[::-1][:3]

        recommendations = []
        for idx in top_indices:
            crop_name = self.label_encoder.inverse_transform([idx])[0]
            confidence = round(float(probabilities[idx]) * 100, 1)
            
            # Retrieve agronomic explanation
            profile = CROP_AGRONOMIC_PROFILES.get(crop_name, {
                "season": "Flexible Season",
                "water_req": "Standard requirement",
                "soil_pref": "Well-drained arable soil",
                "description": "Suitable based on soil and climatic conditions."
            })

            # Explainable reasoning synthesis
            reasons = []
            if input_features['rainfall'] > 150:
                reasons.append("high rainfall tolerance")
            elif input_features['rainfall'] < 60:
                reasons.append("low water demand / drought resilience")
            else:
                reasons.append("optimal precipitation compatibility")

            if input_features['humidity'] > 75:
                reasons.append("high humidity compatibility")
            
            if input_features['N'] > 80:
                reasons.append("high nitrogen responsiveness")
            elif input_features['N'] < 40:
                reasons.append("nitrogen-fixing or low-N suitability")

            if 6.0 <= input_features['ph'] <= 7.5:
                reasons.append("neutral pH affinity")
            elif input_features['ph'] < 6.0:
                reasons.append("tolerance for slightly acidic soil")

            reason_str = f"Strong alignment for {profile['season']}. Features {', '.join(reasons[:3])}."

            suitability = "Highly Suitable" if confidence >= 70 else ("Moderately Suitable" if confidence >= 40 else "Marginally Suitable")

            recommendations.append({
                "crop": crop_name,
                "confidence": confidence,
                "suitability": suitability,
                "reason": reason_str,
                "season": profile["season"],
                "water_requirement": profile["water_req"],
                "soil_preference": profile["soil_pref"],
                "description": profile["description"]
            })

        return {
            "recommendations": recommendations,
            "input_features": {k: float(input_features[k]) for k in feature_names}
        }

# Global singleton recommender
recommender = CropRecommender()
