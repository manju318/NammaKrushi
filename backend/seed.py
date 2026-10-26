"""
ESYKRUSHI Database Seed Script
Populates verified demo accounts, farms, crops, marketplace products, tasks, and journals
for flawless college viva demonstrations and examiner testing.
"""

from datetime import date, datetime, timedelta
from app import create_app, db
from app.models.user import User, FarmerProfile, BuyerProfile, VerifiedSeller
from app.models.farm import Farm, Crop, Task, Journal, Inventory, Expense
from app.models.marketplace import Product, Order, OrderItem, Payment, FarmerPaymentDestination
from app.models.notification import Notification

def seed():
    app = create_app()
    with app.app_context():
        print("[Seed] Creating all database tables...")
        db.create_all()

        # Check if already seeded
        if User.query.filter_by(email="farmer@esykrushi.com").first():
            print("[Seed] Database already seeded. Skipping duplicate seeding.")
            return

        print("[Seed] Seeding Users and Profiles...")

        # 1. Admin
        admin = User(
            email="admin@esykrushi.com",
            full_name="System Administrator",
            phone="+91 9880011223",
            role="admin"
        )
        admin.set_password("Admin@123")
        db.session.add(admin)

        # 2. Demo Farmer: Ramesh Gowda
        farmer_user = User(
            email="farmer@esykrushi.com",
            full_name="Ramesh Gowda",
            phone="+91 9448822334",
            role="farmer"
        )
        farmer_user.set_password("Farmer@123")
        db.session.add(farmer_user)
        db.session.flush()

        farmer_profile = FarmerProfile(
            user_id=farmer_user.id,
            state="Karnataka",
            district="Mandya",
            taluk="Pandavapura",
            pincode="571434",
            total_acreage=5.5,
            soil_type="Red Sandy Loam",
            farming_experience_years=12
        )
        db.session.add(farmer_profile)
        db.session.flush()

        # Verified Seller KYC
        seller_kyc = VerifiedSeller(
            farmer_id=farmer_profile.id,
            id_proof_type="Kisan Credit Card & RTC",
            id_proof_number="KCC-KA-MDY-2024-8891",
            verification_status="Verified",
            admin_remarks="Land ownership verified via Bhoomi RTC portal. Approved for direct marketplace.",
            verified_at=datetime.utcnow()
        )
        db.session.add(seller_kyc)

        # 3. Demo Buyer: Bangalore Agri Trade
        buyer_user = User(
            email="buyer@esykrushi.com",
            full_name="Suresh Kumar",
            phone="+91 9845012345",
            role="buyer"
        )
        buyer_user.set_password("Buyer@123")
        db.session.add(buyer_user)
        db.session.flush()

        buyer_profile = BuyerProfile(
            user_id=buyer_user.id,
            business_name="GreenGrocers Wholesale APMC",
            business_type="Wholesaler",
            delivery_address="Shop #42, APMC Yard, Yeshwanthpur, Bengaluru - 560022",
            gst_number="29AABCU9603R1ZM"
        )
        db.session.add(buyer_profile)

        # 4. Farm Record
        farm = Farm(
            farmer_id=farmer_profile.id,
            farm_name="Sannidhi Organic Farms",
            location_name="Mandya, Karnataka",
            latitude=12.5230,
            longitude=76.8967,
            size_in_acres=5.5,
            irrigation_source="Borewell & Drip"
        )
        db.session.add(farm)
        db.session.flush()

        # 5. Cultivated Crops
        today = date.today()
        crop1 = Crop(
            farm_id=farm.id,
            crop_name="Rice",
            variety="Sona Masoori (BPT 5204)",
            sowing_date=today - timedelta(days=45),
            expected_harvest_date=today + timedelta(days=75),
            current_stage="Vegetative / Tillering",
            acreage=3.0,
            status="Active"
        )
        crop2 = Crop(
            farm_id=farm.id,
            crop_name="Maize",
            variety="Hybrid CP 818",
            sowing_date=today - timedelta(days=25),
            expected_harvest_date=today + timedelta(days=65),
            current_stage="Flowering / Tasseling",
            acreage=2.5,
            status="Active"
        )
        db.session.add_all([crop1, crop2])
        db.session.flush()

        # 6. Tasks
        task1 = Task(
            farm_id=farm.id,
            crop_id=crop1.id,
            title="Drip Fertigation - 19:19:19 Formulation",
            description="Inject 5kg water-soluble NPK through venturi injector into drip line for rice plot.",
            category="Fertilization",
            priority="High",
            due_date=today + timedelta(days=1),
            status="Pending"
        )
        task2 = Task(
            farm_id=farm.id,
            crop_id=crop2.id,
            title="Install Fall Armyworm Pheromone Traps",
            description="Erect 4 pheromone lure traps per acre in the maize field for pest monitoring.",
            category="Pesticide",
            priority="Medium",
            due_date=today + timedelta(days=3),
            status="Pending"
        )
        task3 = Task(
            farm_id=farm.id,
            crop_id=crop1.id,
            title="Basal Land Preparation & Green Manuring",
            description="Incorporated sunhemp green manure with 2 rotavator passes before nursery transplant.",
            category="Land Prep",
            priority="High",
            due_date=today - timedelta(days=40),
            status="Completed"
        )
        db.session.add_all([task1, task2, task3])

        # 7. Journal Entries
        j1 = Journal(
            farm_id=farm.id,
            crop_id=crop1.id,
            entry_date=today - timedelta(days=3),
            activity_type="Pest Scouting & Health Inspection",
            observations="Inspected rice leaf edges. Slight leaf folder webbing observed in North corner. Sprayed organic NSKE (Neem Seed Kernel Extract 5%). Crop foliage is deep green.",
            weather_notes="Humid morning (78% humidity), light breeze, 27°C.",
            cost_involved=450.0
        )
        j2 = Journal(
            farm_id=farm.id,
            crop_id=crop2.id,
            entry_date=today - timedelta(days=14),
            activity_type="Inter-cultivation & Weeding",
            observations="Conducted manual weeding between maize rows. Soil moisture is optimal after last weekend's shower.",
            weather_notes="Sunny and clear sky, 31°C.",
            cost_involved=2400.0
        )
        db.session.add_all([j1, j2])

        # 8. Inventory
        inv1 = Inventory(
            farm_id=farm.id,
            item_name="Bio-NPK Consortium",
            category="Fertilizers",
            quantity=15.0,
            unit="L",
            min_threshold=5.0,
            unit_cost=320.0,
            expiry_date=today + timedelta(days=240)
        )
        inv2 = Inventory(
            farm_id=farm.id,
            item_name="Neem Oil (10,000 PPM)",
            category="Pesticides",
            quantity=2.0,
            unit="L",
            min_threshold=4.0,  # Below threshold -> triggers low-stock alert!
            unit_cost=580.0,
            expiry_date=today + timedelta(days=300)
        )
        inv3 = Inventory(
            farm_id=farm.id,
            item_name="Pheromone Lure Funnel Traps",
            category="Tools",
            quantity=10.0,
            unit="count",
            min_threshold=2.0,
            unit_cost=150.0
        )
        db.session.add_all([inv1, inv2, inv3])

        # 9. Expenses
        exp1 = Expense(farm_id=farm.id, crop_id=crop1.id, category="Seeds", amount=3600.0, expense_date=today - timedelta(days=48), payment_method="UPI", notes="Certified BPT-5204 seeds")
        exp2 = Expense(farm_id=farm.id, crop_id=crop1.id, category="Labor", amount=5400.0, expense_date=today - timedelta(days=42), payment_method="Cash", notes="Transplanting labor (6 workers)")
        exp3 = Expense(farm_id=farm.id, crop_id=crop2.id, category="Fertilizer", amount=4200.0, expense_date=today - timedelta(days=20), payment_method="UPI", notes="DAP and Potash basal bag")
        exp4 = Expense(farm_id=farm.id, crop_id=crop2.id, category="Irrigation", amount=1500.0, expense_date=today - timedelta(days=10), payment_method="Cash", notes="Drip lateral repair and dripper cleaning")
        db.session.add_all([exp1, exp2, exp3, exp4])

        # 9.5 Farmer Payment Destination
        dest1 = FarmerPaymentDestination(
            farmer_id=farmer_profile.id,
            destination_type="upi",
            upi_id="ramesh.gowda@okaxis",
            account_number_masked="******4589",
            ifsc_code="SBIN0001234",
            account_holder_name="Ramesh Gowda",
            bank_name="State Bank of India - Mandya Main Branch",
            is_verified=True,
            verification_status="Verified"
        )
        db.session.add(dest1)

        # 10. Direct Marketplace Products with GPS Evidence
        p1 = Product(
            seller_id=farmer_profile.id,
            name="Organic Sona Masoori Rice (Aged 1 Year)",
            category="Grains",
            description="Naturally grown with bio-fertilizers in Mandya's Cauvery belt. Unpolished, pesticide-free, rich in aroma and nutrition.",
            price_per_unit=68.0,
            unit="kg",
            available_quantity=850.0,
            harvest_date=today - timedelta(days=60),
            farm_location="Pandavapura, Mandya, Karnataka",
            image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
            approval_status="Approved",
            is_approved=True,
            is_active=True,
            crop_quality="Grade A - Premium",
            delivery_options="Farm Pickup, Mandi Transport",
            location_latitude=12.5230,
            location_longitude=76.8967,
            location_source="exif",
            location_accuracy=5.0,
            location_distance_km=0.2,
            location_status="Verified"
        )
        p2 = Product(
            seller_id=farmer_profile.id,
            name="Farm-Fresh Sweet Corn (Tender Cobs)",
            category="Vegetables",
            description="Harvested fresh at morning dawn. Juicy, sweet kernels suitable for restaurants, retail, and wholesale.",
            price_per_unit=28.0,
            unit="kg",
            available_quantity=450.0,
            harvest_date=today - timedelta(days=2),
            farm_location="Mandya, Karnataka",
            image_url="https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
            approval_status="Approved",
            is_approved=True,
            is_active=True,
            crop_quality="Grade A - Premium",
            delivery_options="Farm Pickup, Local Delivery",
            location_latitude=12.5245,
            location_longitude=76.8980,
            location_source="exif",
            location_accuracy=5.0,
            location_distance_km=0.3,
            location_status="Verified"
        )
        p3 = Product(
            seller_id=farmer_profile.id,
            name="Bangalore Blue Grapes (GI Tagged)",
            category="Fruits",
            description="Authentic Bangalore Blue grapes grown on organic trellis. High brix sweetness, firm skin, ideal for table consumption and juices.",
            price_per_unit=85.0,
            unit="kg",
            available_quantity=200.0,
            harvest_date=today - timedelta(days=1),
            farm_location="Bengaluru Rural / Channapatna",
            image_url="https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80",
            approval_status="Approved",
            is_approved=True,
            is_active=True,
            crop_quality="Organic Certified",
            delivery_options="Farm Pickup, Express Cold-Chain",
            location_latitude=12.8210,
            location_longitude=77.3450,
            location_source="browser_device",
            location_accuracy=18.0,
            location_distance_km=4.5,
            location_status="Warning",
            location_flags='["Coordinates captured via device browser geolocation (no embedded EXIF)"]'
        )
        p4 = Product(
            seller_id=farmer_profile.id,
            name="Desi Chickpea / Brown Bengal Gram",
            category="Pulses",
            description="Sun-dried desi chana harvested this season. High protein content, unadulterated, directly from farmer threshing yard.",
            price_per_unit=92.0,
            unit="kg",
            available_quantity=320.0,
            harvest_date=today - timedelta(days=25),
            farm_location="Dharwad, Karnataka",
            image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80",
            approval_status="Approved",
            is_approved=True,
            is_active=True,
            crop_quality="Grade A - Premium",
            delivery_options="Mandi Transport",
            location_latitude=15.4589,
            location_longitude=75.0078,
            location_source="exif",
            location_accuracy=6.0,
            location_distance_km=1.2,
            location_status="Verified"
        )
        # 10.1 Product Pending Admin Review
        p5_pending = Product(
            seller_id=farmer_profile.id,
            name="Byadagi Dried Red Chillies (New Crop)",
            category="Spices",
            description="Authentic deep-red Byadagi chillies with low pungency and high color value. Sun dried on clean tarpaulins.",
            price_per_unit=275.0,
            unit="kg",
            available_quantity=150.0,
            harvest_date=today - timedelta(days=5),
            farm_location="Byadagi, Haveri, Karnataka",
            image_url="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80",
            approval_status="Pending Review",
            is_approved=False,
            is_active=True,
            crop_quality="Grade A - Premium",
            delivery_options="Mandi Transport",
            location_latitude=14.6782,
            location_longitude=75.4879,
            location_source="browser_device",
            location_accuracy=12.0,
            location_status="Warning",
            location_flags='["Coordinates recorded via device browser geolocation. Awaiting admin review."]'
        )
        db.session.add_all([p1, p2, p3, p4, p5_pending])
        db.session.flush()

        # 11. Sample Verified Order
        order1 = Order(
            buyer_id=buyer_profile.id,
            order_number="ORD-DEMO-2026-001",
            total_amount=3400.0,
            shipping_address="Shop #42, APMC Yard, Yeshwanthpur, Bengaluru - 560022",
            contact_phone="+91 9845012345",
            order_status="Confirmed"
        )
        db.session.add(order1)
        db.session.flush()

        oi1 = OrderItem(
            order_id=order1.id,
            product_id=p1.id,
            seller_id=farmer_profile.id,
            product_name=p1.name,
            quantity=50.0,
            unit_price=68.0,
            subtotal=3400.0
        )
        db.session.add(oi1)

        pay1 = Payment(
            order_id=order1.id,
            transaction_id="TXN-DEMO-99881122",
            payment_method="UPI",
            amount=3400.0,
            payment_status="Paid",
            gateway_order_id="order_demo_mock_001",
            gateway_signature="SIMULATED_VERIFIED_SIGNATURE"
        )
        db.session.add(pay1)

        # 12. In-App Notifications
        n1 = Notification(
            user_id=farmer_user.id,
            title="Weather Advisory for Mandya",
            message="Moderate rain forecast (35% probability) over the next 48 hours. Consider postponing heavy pesticide spraying.",
            type="Weather",
            action_url="/weather"
        )
        n2 = Notification(
            user_id=farmer_user.id,
            title="Low Inventory Alert",
            message="Item 'Neem Oil (10,000 PPM)' has only 2.0 L remaining (threshold: 4.0 L). Replenish soon.",
            type="Inventory",
            action_url="/inventory"
        )
        n3 = Notification(
            user_id=farmer_user.id,
            title="New Order Received!",
            message="Buyer GreenGrocers Wholesale placed Order #ORD-DEMO-2026-001 for 50 kg Organic Sona Masoori Rice (Rs. 3,400). Payment confirmed.",
            type="Order",
            action_url="/orders"
        )
        db.session.add_all([n1, n2, n3])

        db.session.commit()
        print("[Seed] Successfully seeded all accounts, farms, crops, products, tasks, and notifications!")

if __name__ == '__main__':
    seed()
