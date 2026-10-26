"""
Unit and Integration Tests for AI Agricultural Assistant and Multilingual RAG Citations
"""

def test_ai_chat_endpoint(client, farmer_token):
    res = client.post('/api/ai/chat', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "message": "My tomato crop is showing yellow leaves and brown spots."
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert 'reply' in data
    assert len(data['reply']) > 20
    assert 'citations' in data
    assert data['is_grounded'] is True
    assert any("Crop Protection" in c or "Soil" in c for c in data['citations'])


def test_ai_chat_multilingual_hindi(client, farmer_token):
    res = client.post('/api/ai/chat', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "message": "टमाटर की पत्तियों में पीलापन आ रहा है",
        "language": "hi",
        "current_crop": "Tomato"
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert data['language'] == 'hi'
    assert 'नाइट्रोजन' in data['reply'] or 'पत्तियां' in data['reply'] or 'पीले' in data['reply']
    assert 'citations' in data


def test_ai_chat_multilingual_kannada(client, farmer_token):
    res = client.post('/api/ai/chat', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "message": "ಟೊಮೆಟೊ ಎಲೆಗಳು ಹಳದಿಯಾಗುತ್ತಿವೆ",
        "language": "kn",
        "current_crop": "Tomato"
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert data['language'] == 'kn'
    assert 'ಹಳದಿ' in data['reply'] or 'ಸಾರಜನಕ' in data['reply'] or 'ಎಲೆ' in data['reply']
    assert 'citations' in data


def test_ai_chat_multilingual_telugu(client, farmer_token):
    res = client.post('/api/ai/chat', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "message": "టమోటా పంటలో ఆకులు పసుపు రంగులోకి మారుతున్నాయి",
        "language": "te",
        "current_crop": "Tomato"
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert data['language'] == 'te'
    assert 'పసుపు' in data['reply'] or 'నత్రజని' in data['reply']


def test_ai_chat_history(client, farmer_token):
    res = client.get('/api/ai/history', headers={'Authorization': f'Bearer {farmer_token}'})
    assert res.status_code == 200
    assert isinstance(res.json['data']['conversations'], list)
