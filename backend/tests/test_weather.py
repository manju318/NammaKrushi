"""
Unit and Integration Tests for Weather Service and Cache
"""

def test_current_weather_endpoint(client):
    res = client.get('/api/weather/current?lat=12.52&lon=76.89')
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert 'temperature' in data
    assert 'humidity' in data
    assert 'condition' in data
    assert 'rain_probability' in data

def test_weather_forecast_endpoint(client):
    res = client.get('/api/weather/forecast?lat=12.52&lon=76.89')
    assert res.status_code == 200
    assert res.json['success'] is True
    data = res.json['data']
    assert 'forecast' in data
    assert len(data['forecast']) == 7

def test_weather_geocoding(client):
    res = client.get('/api/weather/geocode?query=Bengaluru')
    assert res.status_code == 200
    assert res.json['success'] is True
    assert len(res.json['data']['results']) > 0
    first = res.json['data']['results'][0]
    assert 'latitude' in first
    assert 'longitude' in first
