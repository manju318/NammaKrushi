"""
AI Conversation and Crop Recommendation Models
Persists historical chats, grounding citations, and ML crop prediction outputs.
"""

from datetime import datetime
from app import db

class CropRecommendation(db.Model):
    __tablename__ = 'crop_recommendations'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    nitrogen = db.Column(db.Float, nullable=False)
    phosphorus = db.Column(db.Float, nullable=False)
    potassium = db.Column(db.Float, nullable=False)
    ph = db.Column(db.Float, nullable=False)
    temperature = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)
    rainfall = db.Column(db.Float, nullable=False)
    location_name = db.Column(db.String(100), nullable=True)
    top_crop = db.Column(db.String(50), nullable=False)
    top_confidence = db.Column(db.Float, nullable=False)
    recommendations_json = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'nitrogen': self.nitrogen,
            'phosphorus': self.phosphorus,
            'potassium': self.potassium,
            'ph': self.ph,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'rainfall': self.rainfall,
            'location_name': self.location_name,
            'top_crop': self.top_crop,
            'top_confidence': self.top_confidence,
            'recommendations': self.recommendations_json,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AIConversation(db.Model):
    __tablename__ = 'ai_conversations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(150), default='Crop Consultation')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    messages = db.relationship('AIMessage', backref='conversation', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'messages': [m.to_dict() for m in self.messages]
        }


class AIMessage(db.Model):
    __tablename__ = 'ai_messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    message_text = db.Column(db.Text, nullable=False)
    sources_cited = db.Column(db.JSON, nullable=True)  # List of citations/documents referenced
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'message_text': self.message_text,
            'sources_cited': self.sources_cited or [],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
