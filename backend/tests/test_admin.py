"""
Unit and Integration Tests for Admin Dashboard and Seller KYC Moderation
"""

def test_admin_dashboard_access_authorized(client, admin_token):
    res = client.get('/api/admin/dashboard', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    assert res.json['success'] is True
    stats = res.json['data']['stats']
    assert 'total_users' in stats
    assert 'ml_model_accuracy' in stats

def test_admin_dashboard_access_denied_for_farmer(client, farmer_token):
    res = client.get('/api/admin/dashboard', headers={'Authorization': f'Bearer {farmer_token}'})
    assert res.status_code == 403
    assert res.json['success'] is False

def test_admin_verify_seller_action(client, admin_token):
    # Retrieve sellers
    s_res = client.get('/api/admin/sellers', headers={'Authorization': f'Bearer {admin_token}'})
    assert s_res.status_code == 200
    sellers = s_res.json['data']['sellers']
    assert len(sellers) > 0
    seller_id = sellers[0]['id']

    # Update verification status
    v_res = client.post(f'/api/admin/sellers/{seller_id}/verify', headers={'Authorization': f'Bearer {admin_token}'}, json={
        "status": "Verified",
        "remarks": "Land records verified"
    })
    assert v_res.status_code == 200
    assert v_res.json['data']['seller']['verification_status'] == "Verified"
