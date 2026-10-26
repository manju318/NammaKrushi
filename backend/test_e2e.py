import requests

BASE = "http://127.0.0.1:5000/api"
roles = [
    ("Farmer", "farmer@esykrushi.com", "Farmer@123"),
    ("Buyer", "buyer@esykrushi.com", "Buyer@123"),
    ("Admin", "admin@esykrushi.com", "Admin@123")
]

tokens = {}
for label, email, password in roles:
    res = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"{label} login failed: {res.text}"
    data = res.json()["data"]
    tokens[label] = data["token"]
    user = data["user"]
    print(f"[{label}] Logged in successfully: {user['full_name']} (Role: {user['role']})")

# Farmer Crop Prediction
res = requests.post(
    f"{BASE}/crop/predict",
    headers={"Authorization": f"Bearer {tokens['Farmer']}"},
    json={"N": 80, "P": 42, "K": 43, "ph": 6.5, "temperature": 26.0, "humidity": 78.0, "rainfall": 210.0}
)
assert res.status_code == 200, f"Crop prediction failed: {res.text}"
crops = [c['crop'] for c in res.json()['data']['recommendations']]
print(f"[Crop Planner ML] Recommendations: {crops}")

# Buyer Marketplace
res = requests.get(f"{BASE}/products", headers={"Authorization": f"Bearer {tokens['Buyer']}"})
assert res.status_code == 200, f"Marketplace fetch failed: {res.text}"
print(f"[Marketplace] Retrieved {len(res.json()['data']['products'])} approved products")

# Admin Dashboard Stats
res = requests.get(f"{BASE}/admin/dashboard", headers={"Authorization": f"Bearer {tokens['Admin']}"})
assert res.status_code == 200, f"Admin stats failed: {res.text}"
stats = res.json()['data']['stats']
print(f"[Admin Portal] Stats retrieved: {stats['total_users']} total users, {stats['active_products']} active products, {stats['paid_orders_count']} paid orders")

print(">>> ALL VERIFICATIONS COMPLETED SUCCESSFULLY! <<<")
