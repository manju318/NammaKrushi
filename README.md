# ESYKRUSHI: AI-Powered Farm Management & Direct Marketplace Platform

> **Final-Year Engineering Capstone Project**  
> **Academic Specification:** VTU / Indian Engineering Format Compliant  
> **Architecture:** Decoupled Full-Stack SaaS (React + Vite + Flask + Scikit-Learn + ReportLab + PostgreSQL/SQLite)  
> **Version:** 1.0.0 (Production-Ready)

---

## 1. Project Overview & Problem Statement

Modern Indian agriculture faces two persistent structural bottlenecks:
1. **Uninformed Crop Selection:** Farmers rely on traditional habits or localized intuition rather than empirical soil composition ($N, P, K, \text{pH}$) and microclimatic weather variables, leading to sub-optimal yields and soil degradation.
2. **Intermediary Exploitation (Middlemen):** Fragmented supply chains and asymmetric price discovery force marginal farmers to sell produce to aggregators at steep markdowns, forfeiting up to 40% of wholesale market value.

**ESYKRUSHI** solves both challenges on a unified digital platform by combining:
- A dedicated **Random Forest Classifier** trained on 2,200 agricultural samples predicting the top 3 optimal crops with confidence and agronomic reasoning.
- Real-time **Meteorological Telemetry** (precipitation probabilities, temperature, humidity, 7-day forecast).
- A **Digital Farm Lifecycle Suite** (Crop Stage Tracking, Farm Task Calendar, Digital Field Journal, Inventory with Low-Stock Alerts, Expense Accounting with Recharts).
- A **Grounded AI Agricultural Advisor** leveraging a modular RAG (Retrieval-Augmented Generation) vector index with cited extension sources.
- A **Direct Farmer-to-Buyer Marketplace** featuring verified seller KYC badges, cart/checkout, and server-side payment verification.
- Automated **ReportLab PDF Generation** for end-of-season agronomic performance reviews.

---

## 2. Technology Stack

| Layer | Technologies Used | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6, Axios | Ultra-fast SPA, mobile-responsive, modern AgriTech UI palette, declarative state. |
| **Backend** | Python 3.11, Flask, Flask Blueprints, SQLAlchemy ORM, SQLite / PostgreSQL | Modular micro-service architecture, clean separation of concerns, easy viva defense. |
| **Machine Learning** | Scikit-Learn, Pandas, NumPy, StandardScaler, Joblib, Matplotlib | Supervised Random Forest Classifier handling nonlinear agronomic distributions with explainable feature importance. |
| **AI & RAG** | Gemini / OpenAI provider abstraction + Offline Agronomic Expert System | Zero API key vulnerability; TF-IDF vector index retrieval with document citations. |
| **PDF Engine** | ReportLab 5.0 | Dynamic tabular PDF compilation for seasonal farm audits and offline downloads. |
| **Security** | PyJWT (HS256), Bcrypt, HMAC-SHA256 Payment Verification, RBAC | Industry-grade authentication and strict server-side state machines. |
| **Testing** | Pytest, Pytest-Flask (25 test cases, 100% pass rate) | Isolated in-memory database test fixtures for all critical user and payment flows. |

---

## 3. System Architecture & Component Design

```
esykrushi/
├── frontend/                     # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/           # Reusable UI widgets
│   │   ├── contexts/             # AuthContext (JWT) & CartContext
│   │   ├── layouts/              # MainLayout (collapsible sidebar, live weather mini-chip)
│   │   ├── pages/                # 14 Full Pages (Dashboard, CropPlanner, Weather, Marketplace, etc.)
│   │   ├── services/             # Axios API client & endpoints
│   │   ├── index.css             # Tailwind CSS directives
│   │   ├── App.jsx               # Route definitions & ProtectedRoute guards
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                      # Python Flask REST API
│   ├── app/
│   │   ├── auth/                 # JWT handlers & role decorators (@login_required, @role_required)
│   │   ├── models/               # SQLAlchemy ORM (User, Farm, Crop, Task, Journal, Inventory, Expense, Product, Order, Payment)
│   │   ├── routes/               # 15 Blueprints (/auth, /crop, /weather, /farm, /tasks, /journal, /products, etc.)
│   │   ├── schemas/              # Pydantic validation models
│   │   ├── services/             # Weather, Crop, AI Assistant, RAG, Payments, PDF Report services
│   │   ├── utils/                # Standardized JSON response envelope
│   │   └── __init__.py           # Application Factory
│   ├── ml/                       # Machine Learning Pipeline
│   │   ├── dataset/              # 2,200 benchmark agricultural samples (22 crops)
│   │   ├── model/                # crop_model.joblib, preprocessing_pipeline.joblib, label_encoder.joblib
│   │   ├── metrics/              # metrics.json, feature_importance.png
│   │   ├── preprocessing.py      # Input validation & StandardScaler
│   │   ├── train.py              # Random Forest training & evaluation
│   │   ├── evaluate.py           # Model metrics extractor for Admin dashboard
│   │   └── predict.py            # Top-3 inference & agronomic explainability engine
│   ├── tests/                    # 25 Automated Pytest test cases
│   ├── seed.py                   # Verified demo seeder
│   ├── config.py                 # SQLite / PostgreSQL configuration
│   ├── run.py                    # Server runner (port 5000)
│   └── requirements.txt
│
├── knowledge/                    # RAG Agricultural Knowledge Base
│   └── documents/                # Soil health, pest protection, irrigation, and season guides
├── uploads/                      # Media uploads directory
├── reports/                      # Generated ReportLab PDF seasonal files
├── docker-compose.yml            # Multi-container orchestration
├── .env.example                  # Environment configuration template
└── README.md
```

---

## 4. Machine Learning Methodology

### Algorithm Selection: Random Forest Classifier
- **Why Random Forest over Deep Learning / LLMs?**  
  Agricultural soil and climate data is strictly tabular with bounded physical ranges ($N, P, K, \text{pH}$, temperature, humidity, rainfall). Decision tree ensembles prevent overfitting on medium datasets, tolerate nonlinear interactions between humidity and rainfall, provide exact class probabilities, and output verifiable **Feature Importance (Mean Decrease in Impurity - MDI)**.
- **Input Features:**
  1. Nitrogen ($N$): $0 - 140\text{ mg/kg}$
  2. Phosphorus ($P$): $5 - 145\text{ mg/kg}$
  3. Potassium ($K$): $5 - 205\text{ mg/kg}$
  4. Soil pH: $3.5 - 9.9$
  5. Ambient Temperature: $8^\circ\text{C} - 45^\circ\text{C}$
  6. Relative Humidity: $10\% - 100\%$
  7. Rainfall: $20\text{mm} - 350\text{mm}$
- **Target Crops (22 Classes):**
  Apple, Banana, Blackgram, Chickpea, Coconut, Coffee, Cotton, Grapes, Jute, Kidneybeans, Lentil, Maize, Mango, Mothbeans, Mungbean, Muskmelon, Orange, Papaya, Pigeonpeas, Pomegranate, Rice, Watermelon.
- **Measured Evaluation Metrics (Unseen Test Set - 20% Stratified Split):**
  - **Accuracy:** `99.55%`
  - **Weighted Precision:** `99.57%`
  - **Weighted Recall:** `99.55%`
  - **Weighted F1-Score:** `99.55%`
  - **Top Feature Contributors:** Rainfall ($22.4\%$), Relative Humidity ($22.3\%$), Potassium ($16.2\%$), Phosphorus ($13.8\%$), Nitrogen ($11.3\%$).

---

## 5. Quick-Start Installation & Setup

### Prerequisites:
- Python 3.11+
- Node.js 18+ & npm
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/esykrushi.git
cd esykrushi
```

### Step 2: Backend Setup
```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train the ML Crop Model & Generate Artifacts
python ml/train.py

# Seed the Database with verified demo accounts and products
python seed.py

# Start Backend Server (Listening on port 5000)
python run.py
```

### Step 3: Frontend Setup (in a separate terminal)
```bash
cd frontend

# Install node packages
npm install

# Start Vite Development Server (Port 5173)
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## 6. Pre-Configured Demo Credentials (For Viva Demonstration)

The login screen features **1-click quick-fill buttons** for immediate evaluator inspection:

| Role | Email | Password | Pre-loaded Context |
|---|---|---|---|
| **🌾 Farmer** | `farmer@esykrushi.com` | `Farmer@123` | Ramesh Gowda, Mandya (5.5 Acres, Rice & Maize plots, Tasks, Expenses, Verified Seller Badge) |
| **🛒 Buyer** | `buyer@esykrushi.com` | `Buyer@123` | Suresh Kumar, GreenGrocers Wholesale APMC, Active Orders |
| **🛡️ Admin** | `admin@esykrushi.com` | `Admin@123` | System Administrator, Moderation Queue, ML Performance Dashboard |

---

## 7. Viva Demonstration Walkthrough

When presenting EsyKrushi to your external examiner or evaluation committee, follow this logical flow:

1. **Landing Page (`/`)**:
   - Highlight the dual problem statement: lack of data-driven crop recommendations and heavy intermediary price gouging.
   - Point out the 99.55% ML test accuracy and direct APMC trade model.

2. **Farmer Dashboard (`/dashboard`)**:
   - Click "Farmer Demo" quick-fill on the Login page.
   - Show the dynamic hero greeting with live weather telemetry auto-fetched from Open-Meteo.
   - Explain the "AI Agricultural Insight" banner which advises postponing sprays when rain is forecasted.
   - Show active crop stage progress meters and expense charts.

3. **Crop Planner & ML Recommendation (`/crop-planner`)**:
   - Click one of the soil presets (e.g. "🌾 High-N Clay (Paddy)" or "🍇 High-K Horticulture").
   - Click "Run Crop ML Prediction". Notice the loading state: *"Analyzing your farm conditions..."*.
   - Point out the Top 3 Cards: Rice (92% confidence), Jute (8% confidence).
   - Explain the **Agronomic Explainability Layer**: it tells the farmer *why* the crop was recommended (e.g., high precipitation tolerance, neutral pH affinity, high nitrogen responsiveness).
   - Demonstrate the boundary validation: clear one field and click submit; show that missing parameters are highlighted with an explicit error instead of fabricating fake measurements.

4. **Farm Calendar & Tasks (`/calendar`)**:
   - Show task filtering by status and priority color-coding.
   - Click "Mark Done" on a pending task; observe the instant state update.

5. **Farm Journal (`/journal`)**:
   - Walk through chronological field observations. Explain how journal entries feed into the contextual AI assistant and seasonal reports.

6. **Inventory & Low-Stock Alerts (`/inventory`)**:
   - Point out the red warning badge on *"Neem Oil"* because current quantity ($2.0\text{ L}$) is below the safe threshold ($4.0\text{ L}$).

7. **Expense Accounting (`/expenses`)**:
   - Showcase interactive Recharts: Pie Chart breakdown by category and Bar Chart of monthly cash outflows.

8. **AI Agricultural Assistant (`/assistant`)**:
   - Show the active farm context chips (Crop: Rice, Soil: Red Loam, Weather: Live).
   - Click the quick prompt: *"My tomato crop is showing yellow leaves."*
   - Point out the **Grounded Citations Chip**: `[Crop Protection - 2. Common Crop Symptoms and Remedies]`. Explain that advice is rooted in extension literature via RAG instead of hallucinating.

9. **Direct Marketplace & Orders (`/marketplace`, `/cart`, `/checkout`)**:
   - Showcase produce cards featuring the **✓ Verified Seller** badge.
   - Add "Organic Sona Masoori Rice" to cart.
   - Navigate to `/checkout`. Select "UPI Instant Payment".
   - Click "Confirm & Pay". Explain to the examiner that the payment is validated **strictly server-side** with state machine transitions (`Pending` $\rightarrow$ `Initiated` $\rightarrow$ `Paid`).

10. **Seasonal AI Report & PDF Download (`/reports`)**:
    - Select Kharif season.
    - Click **"Download PDF Report"**.
    - Open the downloaded PDF in the browser: demonstrate the ReportLab compilation featuring operational highlights, pest logs, cost audits, and next-season cropping strategies.

11. **Admin Portal (`/admin`)**:
    - Log in as `admin@esykrushi.com`.
    - Show the **Machine Learning Performance Audit Card** containing genuine Scikit-Learn metrics (Accuracy, Precision, Recall, F1, and MDI Feature Importances).
    - Review the Seller KYC queue and demonstrate the approval action.

---

## 8. Automated Test Suite (Pytest)

The project includes an automated test suite with **100% pass rate across 25 unit and integration tests**:

```bash
cd backend
.\venv\Scripts\pytest.exe tests -v
```

### Coverage:
- `test_auth.py`: Farmer & Buyer registration, token issuance, invalid credentials rejection, profile access.
- `test_ml_prediction.py`: Random Forest artifact loading, boundary validation, top-3 class probabilities, missing field handling, evaluation metrics extraction.
- `test_weather.py`: Live weather telemetry, 7-day agricultural forecasts, geocoding.
- `test_farm_modules.py`: Task scheduling, journal logging, inventory low-stock alerts, expense categorizations.
- `test_marketplace_orders.py`: Product listing, cart-to-order conversion, stock decrement, cryptographic payment verification.
- `test_ai_assistant.py`: Context-aware prompt generation and grounded RAG citation checking.
- `test_admin.py`: Role-based access control (RBAC) denial for unauthorized roles and KYC approval actions.

---

## 9. Comprehensive Oral Viva Questions & Answers

### Q1: Why did you choose Random Forest instead of a Deep Neural Network or an LLM for crop prediction?
> **Answer:** "Agricultural tabular data has distinct bounded numerical ranges ($N, P, K$, pH, temperature, humidity, rainfall). Random Forest builds 100 orthogonal decision trees with bootstrap aggregation (bagging), which effectively mitigates variance and avoids overfitting on tabular datasets. Deep Learning networks require large uncalibrated parameter spaces and are prone to overfitting on small datasets. Furthermore, Random Forest calculates Mean Decrease in Impurity (MDI), allowing us to explain the exact feature importances to the farmer and examiner, whereas LLMs are prone to numerical hallucinations."

### Q2: How does your RAG system prevent hallucinations in the AI assistant?
> **Answer:** "Our AI system parses vetted agricultural extension guides stored in `knowledge/documents/` into semantic sections. When a user asks a query, our vector retrieval engine calculates TF-IDF cosine similarity against the chunk embeddings and retrieves the top-2 most relevant documents. These verified excerpts are injected into the prompt along with the farmer's real-time farm context (current weather, active crop, and soil type). The response explicitly displays grounded citation chips referencing the exact source guide."

### Q3: How do you secure financial transactions and prevent fraud on the marketplace?
> **Answer:** "We follow the principle of zero trust towards the frontend. The client cannot set payment status to 'Paid'. When checkout starts, the backend creates an order in 'Pending' state and initiates a payment with a unique server transaction token. Upon payment completion, the backend verifies the HMAC-SHA256 signature against the gateway secret key before transitioning the payment status to 'Paid' and the order to 'Confirmed', decrementing inventory stock atomically."

### Q4: How is the database architected to handle multi-role separation?
> **Answer:** "We use a clean polymorphic schema in SQLAlchemy ORM. The core `User` model stores authentication credentials, salted bcrypt hashes, and role designations (`farmer`, `buyer`, `admin`). This links via one-to-one foreign keys with cascade deletion to either `FarmerProfile` (with acreage, soil type, and farms) or `BuyerProfile` (with business name, GSTIN, and delivery address). Verified seller badges are tied to `VerifiedSeller` KYC records which can only be marked as verified by an authenticated admin."

---

## 10. Future Enhancements

1. **Edge IoT Soil Sensors:** Direct LoRaWAN / ESP32 sensor integration for real-time in-situ NPK and capacitance-based soil moisture readings.
2. **Computer Vision Leaf Pathology:** Mobile camera leaf scanning using a Convolutional Neural Network (CNN / MobileNetV3) for instant pest diagnosis.
3. **Smart Contracts on Hyperledger / Polygon:** Decentralized escrow payment release tied to digital goods delivery confirmation via APMC logistics tracking.
4. **Vernacular Voice Interface:** Multilingual speech-to-text (STT) and text-to-speech (TTS) in Kannada, Hindi, Telugu, and Tamil.

---

## 11. Authors & Academic Acknowledgments

- **Project Title:** ESYKRUSHI: AI-Powered Farm Management & Direct Marketplace Platform
- **Degree:** Bachelor of Engineering (B.E.) in Computer Science & Engineering / Information Science
- **Developed by:** Final Year Engineering Project Team
- **Platform License:** Open-Source for Academic Evaluation & AgriTech Research (MIT License)
