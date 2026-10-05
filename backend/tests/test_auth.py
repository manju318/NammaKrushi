"""
Tests for Authentication & Authorization
"""

def test_register_farmer(client):
    res = client.post('/api/auth/register', json={
        "email": "newfarmer@test.com",
        "password": "Password@123",
        "full_name": "New Farmer",
        "phone": "+91 9900112233",
        "role": "farmer",
        "state": "Karnataka",
        "district": "Mysuru",
        "total_acreage": 6.5,
        "soil_type": "Red Loam"
    })
    assert res.status_code == 201
    assert res.json['success'] is True
    assert 'token' in res.json['data']
    assert res.json['data']['user']['role'] == 'farmer'

def test_register_buyer(client):
    res = client.post('/api/auth/register', json={
        "email": "newbuyer@test.com",
        "password": "Password@123",
        "full_name": "New Buyer",
        "role": "buyer",
        "business_name": "Mysore Retail"
    })
    assert res.status_code == 201
    assert res.json['success'] is True
    assert res.json['data']['user']['role'] == 'buyer'

def test_login_success(client):
    res = client.post('/api/auth/login', json={
        "email": "farmer@test.com",
        "password": "Farmer@123"
    })
    assert res.status_code == 200
    assert res.json['success'] is True
    assert 'token' in res.json['data']

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        "email": "farmer@test.com",
        "password": "WrongPassword"
    })
    assert res.status_code == 401
    assert res.json['success'] is False

def test_duplicate_registration_rejected(client):
    res = client.post('/api/auth/register', json={
        "email": "farmer@test.com",
        "password": "Farmer@123",
        "full_name": "Duplicate"
    })
    assert res.status_code == 409
    assert res.json['success'] is False

def test_auth_me_endpoint(client, farmer_token):
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {farmer_token}'})
    assert res.status_code == 200
    assert res.json['data']['user']['email'] == "farmer@test.com"
    assert res.json['data']['user']['is_verified_seller'] is True
