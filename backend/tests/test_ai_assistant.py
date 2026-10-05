"""
Unit and Integration Tests for AI Agricultural Assistant and RAG Citations
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

def test_ai_chat_history(client, farmer_token):
    res = client.get('/api/ai/history', headers={'Authorization': f'Bearer {farmer_token}'})
    assert res.status_code == 200
    assert isinstance(res.json['data']['conversations'], list)
