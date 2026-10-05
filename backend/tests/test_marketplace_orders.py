"""
Unit and Integration Tests for Marketplace, Orders, and Payment Verification
"""

def test_marketplace_and_payment_flow(client, farmer_token, buyer_token):
    # 1. Farmer lists produce
    p_res = client.post('/api/products', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "name": "Organic Mandya Rice",
        "category": "Grains",
        "price_per_unit": 60.0,
        "unit": "kg",
        "available_quantity": 200.0,
        "description": "Naturally grown"
    })
    assert p_res.status_code == 201
    product = p_res.json['data']['product']
    prod_id = product['id']

    # 2. Buyer views catalog and sees verified seller badge
    l_res = client.get('/api/products')
    assert l_res.status_code == 200
    listed_prod = next(p for p in l_res.json['data']['products'] if p['id'] == prod_id)
    assert listed_prod['is_verified_seller'] is True

    # 3. Buyer places order for 25 kg
    o_res = client.post('/api/orders', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "items": [{"product_id": prod_id, "quantity": 25.0}],
        "shipping_address": "APMC Yard, Bangalore",
        "contact_phone": "+91 9845012345",
        "payment_method": "UPI"
    })
    assert o_res.status_code == 201
    order = o_res.json['data']['order']
    payment_init = o_res.json['data']['payment_init']
    assert order['total_amount'] == 1500.0  # 25 * 60
    assert order['order_status'] == 'Pending'
    assert payment_init['payment_status'] == 'Initiated'

    # 4. Check that product stock was properly decremented from 200 to 175
    chk_prod = client.get(f'/api/products/{prod_id}')
    assert chk_prod.json['data']['product']['available_quantity'] == 175.0

    # 5. Server-side payment verification
    v_res = client.post('/api/payments/verify', headers={'Authorization': f'Bearer {buyer_token}'}, json={
        "order_id": order['id'],
        "transaction_id": payment_init['transaction_id'],
        "razorpay_payment_id": "pay_test_9988",
        "razorpay_order_id": payment_init['gateway_order_id'],
        "razorpay_signature": "SIMULATED_VERIFIED_SIGNATURE"
    })
    assert v_res.status_code == 200
    assert v_res.json['data']['payment_status'] == 'Paid'

    # 6. Verify order status transitioned to Confirmed
    ord_chk = client.get(f'/api/orders/{order["id"]}', headers={'Authorization': f'Bearer {buyer_token}'})
    assert ord_chk.json['data']['order']['order_status'] == 'Confirmed'
