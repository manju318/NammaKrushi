"""
Unit and Integration Tests for Farm Management Modules
Covers: Tasks, Digital Journal, Inventory, and Expenses
"""

def test_task_crud(client, farmer_token):
    # 1. Create Task
    c_res = client.post('/api/tasks', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "title": "Irrigate Rice Field",
        "description": "2 hours drip irrigation",
        "category": "Irrigation",
        "priority": "High",
        "due_date": "2026-10-15"
    })
    assert c_res.status_code == 201
    task_id = c_res.json['data']['task']['id']

    # 2. List Tasks
    l_res = client.get('/api/tasks', headers={'Authorization': f'Bearer {farmer_token}'})
    assert l_res.status_code == 200
    assert any(t['id'] == task_id for t in l_res.json['data']['tasks'])

    # 3. Update Task Status
    u_res = client.put(f'/api/tasks/{task_id}', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "status": "Completed"
    })
    assert u_res.status_code == 200
    assert u_res.json['data']['task']['status'] == "Completed"

    # 4. Delete Task
    d_res = client.delete(f'/api/tasks/{task_id}', headers={'Authorization': f'Bearer {farmer_token}'})
    assert d_res.status_code == 200


def test_journal_crud(client, farmer_token):
    # 1. Create Entry
    c_res = client.post('/api/journal', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "activity_type": "Pest Scouting",
        "observations": "Minor aphids noticed on border plants. Sprayed neem oil.",
        "weather_notes": "Sunny, 28°C",
        "cost_involved": 350.0,
        "entry_date": "2026-10-05"
    })
    assert c_res.status_code == 201
    j_id = c_res.json['data']['journal']['id']

    # 2. List
    l_res = client.get('/api/journal', headers={'Authorization': f'Bearer {farmer_token}'})
    assert l_res.status_code == 200
    assert any(j['id'] == j_id for j in l_res.json['data']['journals'])

    # 3. Delete
    d_res = client.delete(f'/api/journal/{j_id}', headers={'Authorization': f'Bearer {farmer_token}'})
    assert d_res.status_code == 200


def test_inventory_crud_and_low_stock_alert(client, farmer_token):
    # 1. Create item with quantity below min_threshold
    c_res = client.post('/api/inventory', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "item_name": "Neem Biocide 10000 PPM",
        "category": "Pesticides",
        "quantity": 2.0,
        "unit": "L",
        "min_threshold": 5.0,
        "unit_cost": 450.0
    })
    assert c_res.status_code == 201
    item = c_res.json['data']['item']
    assert item['is_low_stock'] is True

    # 2. List
    l_res = client.get('/api/inventory', headers={'Authorization': f'Bearer {farmer_token}'})
    assert l_res.status_code == 200
    assert l_res.json['data']['low_stock_items_count'] >= 1


def test_expense_crud_and_analytics(client, farmer_token):
    # 1. Create Expense
    c_res = client.post('/api/expenses', headers={'Authorization': f'Bearer {farmer_token}'}, json={
        "category": "Seeds",
        "amount": 4200.0,
        "expense_date": "2026-10-01",
        "payment_method": "UPI",
        "notes": "Certified Paddy seeds"
    })
    assert c_res.status_code == 201

    # 2. List and check aggregations
    l_res = client.get('/api/expenses', headers={'Authorization': f'Bearer {farmer_token}'})
    assert l_res.status_code == 200
    data = l_res.json['data']
    assert data['total_spent'] >= 4200.0
    assert len(data['category_breakdown']) > 0
