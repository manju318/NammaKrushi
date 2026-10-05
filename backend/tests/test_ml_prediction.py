"""
Unit and Integration Tests for Random Forest Crop Recommendation Model
"""

from ml.predict import recommender
from ml.evaluate import get_model_evaluation_metrics

def test_ml_recommender_is_loaded():
    assert recommender.is_loaded is True
    assert recommender.model is not None
    assert recommender.scaler is not None
    assert recommender.label_encoder is not None

def test_ml_prediction_valid_inputs():
    inputs = {
        'N': 80.0,
        'P': 40.0,
        'K': 40.0,
        'ph': 6.5,
        'temperature': 25.0,
        'humidity': 80.0,
        'rainfall': 220.0
    }
    result = recommender.predict(inputs)
    assert 'error' not in result
    assert 'recommendations' in result
    recs = result['recommendations']
    assert len(recs) == 3
    assert recs[0]['crop'] in ['Rice', 'Jute']
    assert recs[0]['confidence'] > 50.0
    assert 'season' in recs[0]
    assert 'reason' in recs[0]

def test_ml_missing_features_error():
    # Only supply N, P, K; omit climate
    inputs = {
        'N': 90.0,
        'P': 45.0,
        'K': 45.0
    }
    result = recommender.predict(inputs)
    assert result.get('error') == 'MISSING_FEATURES'
    assert 'missing' in result
    assert 'rainfall' in result['missing']

def test_api_crop_predict_endpoint(client, farmer_token):
    res = client.post('/api/crop/predict', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        'nitrogen': 75,
        'phosphorus': 45,
        'potassium': 20,
        'ph': 6.8,
        'temperature': 24,
        'humidity': 65,
        'rainfall': 85
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert len(data['recommendations']) == 3

def test_api_crop_history_endpoint(client, farmer_token):
    res = client.get('/api/crop/history', headers={'Authorization': f'Bearer {farmer_token}'})
    assert res.status_code == 200
    assert res.json['success'] is True
    assert isinstance(res.json['data']['history'], list)

def test_ml_evaluation_metrics_reporting():
    metrics = get_model_evaluation_metrics()
    assert metrics['model_type'] == 'Random Forest Classifier'
    assert metrics['accuracy'] is not None
    assert metrics['accuracy'] > 95.0
    assert 'feature_importance' in metrics
