"""
ESYKRUSHI Server Entry Point
Runs the Flask application on port 5000 with CORS and blueprint routing.
"""

import os
from app import create_app, db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Ensure database tables exist
        db.create_all()
        # Auto-seed if running fresh
        from seed import seed
        try:
            seed()
        except Exception as e:
            print(f"[Startup] Seeding notice: {e}")

    port = int(os.environ.get('PORT', 5000))
    print(f"\n========================================================")
    print(f"  🌱 ESYKRUSHI AgriTech Platform Backend Server")
    print(f"  API Listening on: http://127.0.0.1:{port}")
    print(f"  Demo Farmer:      farmer@esykrushi.com / Farmer@123")
    print(f"  Demo Buyer:       buyer@esykrushi.com  / Buyer@123")
    print(f"  Demo Admin:       admin@esykrushi.com  / Admin@123")
    print(f"========================================================\n")
    app.run(host='0.0.0.0', port=port, debug=True)
