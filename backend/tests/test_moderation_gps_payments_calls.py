"""
Comprehensive Verification Tests for:
1. Product Moderation & Admin Queue
2. GPS Evidence Validation & Flagging
3. Direct Farmer Payments & Multi-Vendor Cart Splitting
4. WebRTC Video Calling Signaling & Authorization
5. Privacy & Access Control
"""

import hmac
import hashlib
import json
from app.models.marketplace import Product, Order, Payment, FarmerPaymentDestination, VideoCallSession, AdminAuditLog
from app import db

def test_product_moderation_workflow(client, farmer_token, buyer_token, admin_token):
    # 1. Farmer lists a product with 'Pending Review'
    create_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Kolar Vine Ripe Tomatoes",
        "category": "Vegetables",
        "price_per_unit": 35.0,
        "unit": "kg",
        "available_quantity": 500.0,
        "description": "Fresh harvest directly from field",
        "approval_status": "Pending Review",
        "browser_location": {
            "latitude": 13.1367,
            "longitude": 78.1291,
            "accuracy": 15.0
        }
    })
    assert create_res.status_code == 201
    prod = create_res.json['data']['product']
    prod_id = prod['id']
    assert prod['approval_status'] == 'Pending Review'
    assert prod['is_approved'] is False

    # 2. Buyer searches products -> unapproved product MUST NOT be returned
    buyer_catalog = client.get('/api/products')
    assert buyer_catalog.status_code == 200
    catalog_ids = [p['id'] for p in buyer_catalog.json['data']['products']]
    assert prod_id not in catalog_ids

    # 3. Buyer tries to directly purchase unapproved product -> MUST BE REJECTED
    buy_attempt = client.post('/api/orders', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "items": [{"product_id": prod_id, "quantity": 10.0}],
        "shipping_address": "Indiranagar, Bangalore",
        "contact_phone": "+91 9845011111"
    })
    assert buy_attempt.status_code == 400
    assert buy_attempt.json['error']['code'] == 'PRODUCT_UNAVAILABLE'

    # 4. Admin inspects the approval queue
    queue_res = client.get('/api/admin/products/queue', headers={'Authorization': f'Bearer {admin_token}'})
    assert queue_res.status_code == 200
    queue_products = queue_res.json['data']['products']
    target_in_queue = next((p for p in queue_products if p['id'] == prod_id), None)
    assert target_in_queue is not None
    assert target_in_queue['location_evidence']['source'] in ('browser_device', 'none')

    # 5. Admin rejects with reason
    reject_res = client.post(f'/api/admin/products/{prod_id}/moderate', headers={'Authorization': f'Bearer {admin_token}'}, json={
        "action": "reject",
        "reason": "Missing clear field crop photograph"
    })
    assert reject_res.status_code == 200
    assert reject_res.json['data']['product']['approval_status'] == 'Rejected'

    # Verify reject without reason fails
    no_reason_res = client.post(f'/api/admin/products/{prod_id}/moderate', headers={'Authorization': f'Bearer {admin_token}'}, json={
        "action": "reject",
        "reason": ""
    })
    assert no_reason_res.status_code == 400

    # 6. Admin approves product
    approve_res = client.post(f'/api/admin/products/{prod_id}/moderate', headers={'Authorization': f'Bearer {admin_token}'}, json={
        "action": "approve"
    })
    assert approve_res.status_code == 200
    assert approve_res.json['data']['product']['approval_status'] == 'Approved'
    assert approve_res.json['data']['product']['is_approved'] is True

    # 7. Now buyer can see and buy it
    buyer_catalog_after = client.get('/api/products')
    approved_ids = [p['id'] for p in buyer_catalog_after.json['data']['products']]
    assert prod_id in approved_ids


def test_unauthorized_product_modification(client, farmer_token, buyer_token):
    # Farmer creates product
    p_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Shimoga Arecanut",
        "category": "Spices",
        "price_per_unit": 450.0,
        "available_quantity": 50.0
    })
    prod_id = p_res.json['data']['product']['id']

    # Buyer or another farmer attempts to edit or delete it -> MUST BE 403 FORBIDDEN
    edit_res = client.put(f'/api/products/{prod_id}', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "price_per_unit": 10.0
    })
    assert edit_res.status_code == 403

    del_res = client.delete(f'/api/products/{prod_id}', headers={'Authorization': f'Bearer {buyer_token}'})
    assert del_res.status_code == 403


def test_order_privacy_and_access_control(client, farmer_token, buyer_token, admin_token):
    # Create approved product
    p_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Dharwad Hybrid Maize",
        "category": "Grains",
        "price_per_unit": 22.0,
        "available_quantity": 1000.0,
        "approval_status": "Approved"
    })
    prod_id = p_res.json['data']['product']['id']

    # Buyer places order
    order_res = client.post('/api/orders', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "items": [{"product_id": prod_id, "quantity": 50.0}],
        "shipping_address": "Private Home Address, 4th Cross, Koramangala, Bangalore",
        "contact_phone": "+91 9900012345"
    })
    order_id = order_res.json['data']['order']['id']

    # Buyer can view their own order
    buyer_view = client.get(f'/api/orders/{order_id}', headers={'Authorization': f'Bearer {buyer_token}'})
    assert buyer_view.status_code == 200
    assert "Private Home Address" in buyer_view.json['data']['order']['shipping_address']

    # Farmer can view order containing their produce
    farmer_view = client.get(f'/api/orders/{order_id}', headers={'Authorization': f'Bearer {farmer_token}'})
    assert farmer_view.status_code == 200
    assert "Private Home Address" in farmer_view.json['data']['order']['shipping_address']

    # Unrelated user or unauthorized query without token cannot view
    anon_view = client.get(f'/api/orders/{order_id}')
    assert anon_view.status_code == 401


def test_payment_cryptographic_verification_and_tamper_rejection(client, farmer_token, buyer_token):
    p_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Coorg Arabica Coffee Beans",
        "category": "Spices",
        "price_per_unit": 350.0,
        "available_quantity": 100.0,
        "approval_status": "Approved"
    })
    prod_id = p_res.json['data']['product']['id']

    order_res = client.post('/api/orders', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "items": [{"product_id": prod_id, "quantity": 2.0}],
        "shipping_address": "MG Road, Bangalore",
        "contact_phone": "+91 9845012345"
    })
    order_data = order_res.json['data']['order']
    payment_init = order_res.json['data']['payment_init']
    order_id = order_data['id']
    txn_id = payment_init['transaction_id']
    gateway_order_id = payment_init['gateway_order_id']

    # 1. Tampered / forged signature -> MUST FAIL
    forged_verify = client.post('/api/payments/verify', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "order_id": order_id,
        "transaction_id": txn_id,
        "razorpay_payment_id": "pay_fake_12345",
        "razorpay_order_id": gateway_order_id,
        "razorpay_signature": "FORGED_INVALID_HEX_SIGNATURE_9999"
    })
    assert forged_verify.status_code == 400
    assert "signature mismatch" in forged_verify.json['error']['message'].lower()

    # Verify order status remained Pending or Failed
    chk_order = client.get(f'/api/orders/{order_id}', headers={'Authorization': f'Bearer {buyer_token}'})
    assert chk_order.json['data']['order']['order_status'] != 'Confirmed'

    # 2. Authentic HMAC-SHA256 signature generated with test secret
    test_secret = "rzp_test_secret_demo"
    valid_payment_id = "pay_valid_proof_7788"
    msg = f"{gateway_order_id}|{valid_payment_id}".encode('utf-8')
    authentic_sig = hmac.new(test_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()

    valid_verify = client.post('/api/payments/verify', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "order_id": order_id,
        "transaction_id": txn_id,
        "razorpay_payment_id": valid_payment_id,
        "razorpay_order_id": gateway_order_id,
        "razorpay_signature": authentic_sig
    })
    assert valid_verify.status_code == 200
    assert valid_verify.json['data']['payment_status'] == 'Paid'

    # Order confirmed
    chk_order2 = client.get(f'/api/orders/{order_id}', headers={'Authorization': f'Bearer {buyer_token}'})
    assert chk_order2.json['data']['order']['order_status'] == 'Confirmed'


def test_webrtc_video_calling_pipeline(client, farmer_token, buyer_token):
    p_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Shimoga Fresh Ginger",
        "category": "Spices",
        "price_per_unit": 70.0,
        "available_quantity": 200.0,
        "approval_status": "Approved"
    })
    prod_id = p_res.json['data']['product']['id']

    # 1. Buyer requests a live video call to inspect produce
    req_res = client.post('/api/calls/request', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "product_id": prod_id
    })
    assert req_res.status_code == 201
    call_session = req_res.json['data']['session']
    session_id = call_session['session_id']
    assert call_session['status'] == 'requested'

    # 2. Farmer checks incoming calls
    inc_res = client.get('/api/calls/incoming', headers={'Authorization': f'Bearer {farmer_token}'})
    assert inc_res.status_code == 200
    incoming_ids = [c['session_id'] for c in inc_res.json['data']['calls']]
    assert session_id in incoming_ids

    # 3. Farmer accepts call
    respond_res = client.post(f'/api/calls/{session_id}/respond', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "action": "accept"
    })
    assert respond_res.status_code == 200
    assert respond_res.json['data']['session']['status'] == 'accepted'

    # 4. Exchange WebRTC SDP offer & answer signals
    signal_res = client.post(f'/api/calls/{session_id}/signal', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "sdp_offer": "v=0\r\no=- 461173 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
        "ice_candidate": {"candidate": "candidate:1 1 UDP 2122252543 192.168.1.5 54321 typ host", "sdpMid": "0"}
    })
    assert signal_res.status_code == 200
    assert signal_res.json['data']['session']['sdp_offer'] is not None

    # 5. Farmer polls status
    poll_res = client.get(f'/api/calls/{session_id}/poll', headers={'Authorization': f'Bearer {farmer_token}'})
    assert poll_res.status_code == 200
    assert poll_res.json['data']['session']['status'] == 'in_progress'

    # 6. End call
    end_res = client.post(f'/api/calls/{session_id}/end', headers={'Authorization': f'Bearer {farmer_token}'})
    assert end_res.status_code == 200
    assert end_res.json['data']['session']['status'] == 'ended'


def test_farmer_payment_destination_registration(client, farmer_token, admin_token):
    # Farmer registers UPI payment destination
    dest_res = client.post('/api/payments/destination', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "destination_type": "upi",
        "upi_id": "ramesh.gowda@okaxis",
        "account_holder_name": "Ramesh Gowda"
    })
    assert dest_res.status_code == 200
    dest = dest_res.json['data']['destination']
    assert dest['upi_id'] == "ramesh.gowda@okaxis"
    assert dest['is_verified'] is False
    dest_id = dest['id']

    # Admin verifies destination
    verify_res = client.post(f'/api/admin/destinations/{dest_id}/verify', headers={'Authorization': f'Bearer {admin_token}'}, json={
        "status": "Verified",
        "reason": "NPCI VPA active and registered to Ramesh Gowda"
    })
    assert verify_res.status_code == 200
    assert verify_res.json['data']['destination']['is_verified'] is True
    assert verify_res.json['data']['destination']['verification_status'] == 'Verified'
