import sqlite3
import os
from datetime import datetime

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'esykrushi.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def check_cols(table):
    cursor.execute(f"PRAGMA table_info({table})")
    return [c[1] for c in cursor.fetchall()]

def table_exists(table):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None

print("Starting database schema migration...")

# 1. Update farmer_payment_destinations
if table_exists('farmer_payment_destinations'):
    fp_cols = check_cols('farmer_payment_destinations')
    new_fp_cols = [
        ('account_number_hash', 'VARCHAR(64)'),
        ('upi_qr_url', 'VARCHAR(255)'),
        ('registered_phone', 'VARCHAR(20)'),
        ('farm_address', 'TEXT'),
        ('preferred_payment_methods', "VARCHAR(100) DEFAULT 'UPI, Bank Transfer, Razorpay'"),
        ('verified_at', 'DATETIME')
    ]
    for col, col_type in new_fp_cols:
        if col not in fp_cols:
            cursor.execute(f"ALTER TABLE farmer_payment_destinations ADD COLUMN {col} {col_type}")
            print(f"Added {col} to farmer_payment_destinations")
else:
    cursor.execute("""
    CREATE TABLE farmer_payment_destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_id INTEGER NOT NULL,
        destination_type VARCHAR(20) DEFAULT 'upi',
        upi_id VARCHAR(100),
        account_number_masked VARCHAR(50),
        account_number_hash VARCHAR(64),
        ifsc_code VARCHAR(20),
        account_holder_name VARCHAR(120),
        bank_name VARCHAR(100),
        registered_phone VARCHAR(20),
        farm_address TEXT,
        upi_qr_url VARCHAR(255),
        preferred_payment_methods VARCHAR(100) DEFAULT 'UPI, Bank Transfer, Razorpay',
        is_verified BOOLEAN DEFAULT 0,
        verification_status VARCHAR(20) DEFAULT 'Pending',
        rejection_reason TEXT,
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE
    )
    """)
    print("Created farmer_payment_destinations table")

# 2. Update orders table
if table_exists('orders'):
    ord_cols = check_cols('orders')
    new_ord_cols = [
        ('purchase_request_id', 'INTEGER'),
        ('mandi_name', 'VARCHAR(150)'),
        ('mandi_address', 'VARCHAR(255)')
    ]
    for col, col_type in new_ord_cols:
        if col not in ord_cols:
            cursor.execute(f"ALTER TABLE orders ADD COLUMN {col} {col_type}")
            print(f"Added {col} to orders")

# 3. Create purchase_requests table
if not table_exists('purchase_requests'):
    cursor.execute("""
    CREATE TABLE purchase_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_number VARCHAR(36) NOT NULL UNIQUE,
        buyer_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name VARCHAR(120) NOT NULL,
        requested_quantity FLOAT NOT NULL DEFAULT 1.0,
        unit VARCHAR(20) DEFAULT 'kg',
        proposed_unit_price FLOAT NOT NULL,
        total_amount FLOAT NOT NULL,
        counter_unit_price FLOAT,
        counter_quantity FLOAT,
        buyer_name VARCHAR(120),
        buyer_phone VARCHAR(20),
        delivery_address TEXT NOT NULL,
        mandi_name VARCHAR(150),
        mandi_address VARCHAR(255),
        mandi_district VARCHAR(60),
        mandi_state VARCHAR(60) DEFAULT 'Karnataka',
        mandi_latitude FLOAT,
        mandi_longitude FLOAT,
        buyer_notes TEXT,
        farmer_notes TEXT,
        status VARCHAR(30) DEFAULT 'Pending',
        order_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (buyer_id) REFERENCES buyer_profiles (id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
    )
    """)
    cursor.execute("CREATE INDEX idx_purchase_requests_seller ON purchase_requests (seller_id)")
    cursor.execute("CREATE INDEX idx_purchase_requests_buyer ON purchase_requests (buyer_id)")
    cursor.execute("CREATE INDEX idx_purchase_requests_status ON purchase_requests (status)")
    print("Created purchase_requests table with indexes")

# 4. Create mandi_locations table
if not table_exists('mandi_locations'):
    cursor.execute("""
    CREATE TABLE mandi_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(30) UNIQUE,
        district VARCHAR(60) NOT NULL,
        state VARCHAR(60) DEFAULT 'Karnataka',
        address TEXT,
        latitude FLOAT,
        longitude FLOAT,
        market_type VARCHAR(40) DEFAULT 'APMC Yard',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX idx_mandis_district ON mandi_locations (district)")
    print("Created mandi_locations table")

# 5. Create payment_webhook_events table
if not table_exists('payment_webhook_events'):
    cursor.execute("""
    CREATE TABLE payment_webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id VARCHAR(80) NOT NULL UNIQUE,
        event_type VARCHAR(60) NOT NULL,
        order_id INTEGER,
        payment_id VARCHAR(64),
        payload TEXT,
        status VARCHAR(30) DEFAULT 'Processed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Created payment_webhook_events table")

# 6. Seed Mandi Locations
cursor.execute("SELECT COUNT(*) FROM mandi_locations")
if cursor.fetchone()[0] == 0:
    mandis = [
        ("Yeshwanthpur APMC Yard", "APMC-BLR-01", "Bengaluru Urban", "Karnataka", "APMC Yard, Yeshwanthpur, Bengaluru - 560022", 13.0232, 77.5501, "APMC Yard"),
        ("Kolar APMC Market", "APMC-KLR-01", "Kolar", "Karnataka", "Kolar APMC Vegetable Market Yard, Kolar - 563101", 13.1367, 78.1291, "APMC Yard"),
        ("Mandya APMC Yard", "APMC-MDY-01", "Mandya", "Karnataka", "Subhash Nagar APMC Yard, Mandya - 571401", 12.5230, 76.8967, "APMC Yard"),
        ("Davanagere APMC Market", "APMC-DVG-01", "Davanagere", "Karnataka", "Grain Market Yard, Davanagere - 577002", 14.4644, 75.9218, "APMC Yard"),
        ("Kalaburagi Pulse Mandi", "APMC-KLB-01", "Kalaburagi", "Karnataka", "Nehru Gunj APMC Market, Kalaburagi - 585104", 17.3297, 76.8343, "APMC Yard"),
        ("Raichur Cotton & Grain APMC", "APMC-RCH-01", "Raichur", "Karnataka", "Main Market Yard, Raichur - 584101", 16.2120, 77.3439, "APMC Yard"),
        ("Mysuru Bandipalya APMC", "APMC-MYS-01", "Mysuru", "Karnataka", "Bandipalya APMC Market Yard, Nanjangud Road, Mysuru - 570025", 12.2602, 76.6710, "APMC Yard"),
        ("Belagavi APMC Vegetable Market", "APMC-BLG-01", "Belagavi", "Karnataka", "APMC Market Yard, Belagavi - 590016", 15.8497, 74.4977, "APMC Yard"),
        ("Shivamogga APMC Yard", "APMC-SMG-01", "Shivamogga", "Karnataka", "Sagar Road APMC Yard, Shivamogga - 577204", 13.9299, 75.5681, "APMC Yard"),
        ("Hubballi Amargol APMC", "APMC-UBL-01", "Dharwad", "Karnataka", "Amargol APMC Yard, Hubballi - 580025", 15.3850, 75.0934, "APMC Yard")
    ]
    cursor.executemany("""
    INSERT INTO mandi_locations (name, code, district, state, address, latitude, longitude, market_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, mandis)
    print(f"Seeded {len(mandis)} APMC Mandi Locations")

# 7. Seed verified payment details for Farmer #1 (Ramesh Gowda) so produce stays valid
cursor.execute("SELECT id FROM farmer_payment_destinations WHERE farmer_id = 1")
f1_dest = cursor.fetchone()
if not f1_dest:
    cursor.execute("""
    INSERT INTO farmer_payment_destinations (
        farmer_id, destination_type, upi_id, account_number_masked, account_number_hash,
        ifsc_code, account_holder_name, bank_name, registered_phone, farm_address,
        preferred_payment_methods, is_verified, verification_status, verified_at
    ) VALUES (
        1, 'both', 'ramesh.farmer@okaxis', '••••••••4829', 'f4b321a4829hash',
        'SBIN0001234', 'Ramesh Gowda', 'State Bank of India', '9845012345',
        'Sy No. 42/B, Doddaballapura Taluk, Bengaluru Rural, Karnataka',
        'UPI, Bank Transfer, Razorpay', 1, 'Verified', CURRENT_TIMESTAMP
    )
    """)
    print("Seeded verified payment details for demo farmer Ramesh Gowda")
else:
    # Ensure farmer #1 is marked as Verified with complete details
    cursor.execute("""
    UPDATE farmer_payment_destinations SET
        is_verified = 1,
        verification_status = 'Verified',
        account_holder_name = COALESCE(account_holder_name, 'Ramesh Gowda'),
        bank_name = COALESCE(bank_name, 'State Bank of India'),
        account_number_masked = COALESCE(account_number_masked, '••••••••4829'),
        ifsc_code = COALESCE(ifsc_code, 'SBIN0001234'),
        upi_id = COALESCE(upi_id, 'ramesh.farmer@okaxis'),
        registered_phone = COALESCE(registered_phone, '9845012345'),
        farm_address = COALESCE(farm_address, 'Sy No. 42/B, Doddaballapura Taluk, Bengaluru Rural, Karnataka'),
        preferred_payment_methods = COALESCE(preferred_payment_methods, 'UPI, Bank Transfer, Razorpay')
    WHERE farmer_id = 1
    """)
    print("Updated farmer #1 payment details to Verified status")

conn.commit()
conn.close()
print("Migration completed successfully!")
