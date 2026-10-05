"""
Pydantic Request Validation Schemas for ESYKRUSHI
Ensures strict type-checking, bounds validation, and sanitary inputs across all endpoints.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: str = Field('farmer', pattern='^(farmer|buyer|admin)$')
    
    # Farmer specific
    state: Optional[str] = 'Karnataka'
    district: Optional[str] = 'Bengaluru Rural'
    total_acreage: Optional[float] = 5.0
    soil_type: Optional[str] = 'Red Loam'

    # Buyer specific
    business_name: Optional[str] = None
    delivery_address: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CropPredictRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200, description="Nitrogen content in soil (mg/kg)")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus content in soil (mg/kg)")
    potassium: float = Field(..., ge=0, le=250, description="Potassium content in soil (mg/kg)")
    ph: float = Field(..., ge=3.0, le=10.0, description="Soil pH value")
    temperature: Optional[float] = Field(None, ge=-10, le=60, description="Temperature in Celsius")
    humidity: Optional[float] = Field(None, ge=5, le=100, description="Relative humidity in %")
    rainfall: Optional[float] = Field(None, ge=0, le=1000, description="Rainfall in mm")
    location_name: Optional[str] = "Bengaluru Rural"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    category: str = Field('General', pattern='^(Sowing|Irrigation|Fertilization|Pesticide|Harvesting|Land Prep|General)$')
    priority: str = Field('Medium', pattern='^(Low|Medium|High|Critical)$')
    due_date: str
    crop_id: Optional[int] = None
    farm_id: Optional[int] = None


class JournalCreateRequest(BaseModel):
    activity_type: str = Field(..., min_length=2, max_length=80)
    observations: str = Field(..., min_length=5)
    entry_date: Optional[str] = None
    crop_id: Optional[int] = None
    weather_notes: Optional[str] = None
    cost_involved: Optional[float] = 0.0
    image_url: Optional[str] = None


class InventoryCreateRequest(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=100)
    category: str = Field('Seeds', pattern='^(Seeds|Fertilizers|Pesticides|Tools|Equipment|Other)$')
    quantity: float = Field(..., ge=0)
    unit: str = Field('kg', max_length=20)
    min_threshold: Optional[float] = 5.0
    unit_cost: Optional[float] = 0.0
    expiry_date: Optional[str] = None


class ExpenseCreateRequest(BaseModel):
    category: str = Field(..., pattern='^(Seeds|Fertilizer|Labor|Equipment|Irrigation|Transport|Pesticides|Other)$')
    amount: float = Field(..., gt=0)
    expense_date: Optional[str] = None
    crop_id: Optional[int] = None
    payment_method: Optional[str] = 'Cash'
    notes: Optional[str] = None


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    category: str = Field(..., pattern='^(Grains|Pulses|Fruits|Vegetables|Spices|Oilseeds|Other)$')
    price_per_unit: float = Field(..., gt=0)
    unit: str = Field('kg', max_length=20)
    available_quantity: float = Field(..., gt=0)
    description: Optional[str] = None
    farm_location: Optional[str] = None
    image_url: Optional[str] = None


class OrderItemSchema(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


class OrderCreateRequest(BaseModel):
    items: List[OrderItemSchema] = Field(..., min_length=1)
    shipping_address: str = Field(..., min_length=10)
    contact_phone: str = Field(..., min_length=8, max_length=20)
    payment_method: str = Field('UPI', pattern='^(UPI|Card|NetBanking|COD)$')


class PaymentVerifyRequest(BaseModel):
    order_id: int
    transaction_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=2)
    conversation_id: Optional[int] = None
    current_crop: Optional[str] = None
    crop_stage: Optional[str] = None
    soil_type: Optional[str] = None
    location: Optional[str] = None
