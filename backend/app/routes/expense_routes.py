"""
Expense Management Routes (/api/expenses)
Provides spending logging, categorical breakdown, and monthly cash outflow aggregations for Recharts.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.farm import Expense
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

expense_bp = Blueprint('expenses', __name__)

@expense_bp.route('', methods=['GET'])
@login_required
def list_expenses():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Expenses belong to farmer profiles", status_code=400)

    farms = user.farmer_profile.farms.all()
    farm_ids = [f.id for f in farms]

    expenses = Expense.query.filter(Expense.farm_id.in_(farm_ids)).order_by(Expense.expense_date.desc()).all()
    
    total_spent = sum(e.amount for e in expenses)

    # Category Breakdown for Pie Chart
    cat_breakdown = {}
    # Monthly Breakdown for Bar Chart
    month_breakdown = {}

    for e in expenses:
        cat_breakdown[e.category] = cat_breakdown.get(e.category, 0) + e.amount
        m_key = e.expense_date.strftime('%b %Y') if e.expense_date else 'Unknown'
        month_breakdown[m_key] = month_breakdown.get(m_key, 0) + e.amount

    formatted_categories = [{"name": cat, "value": round(amt, 2)} for cat, amt in cat_breakdown.items()]
    formatted_monthly = [{"month": m, "amount": round(amt, 2)} for m, amt in month_breakdown.items()]

    return success_response(
        data={
            "expenses": [e.to_dict() for e in expenses],
            "total_spent": round(total_spent, 2),
            "category_breakdown": formatted_categories,
            "monthly_trend": formatted_monthly
        },
        message="Expenses and analytics retrieved"
    )


@expense_bp.route('', methods=['POST'])
@login_required
def create_expense():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Farmer profile required", status_code=400)

    farm = user.farmer_profile.farms.first()
    if not farm:
        return error_response(code="NO_FARM", message="Farm required to log expense", status_code=404)

    data = request.get_json() or {}
    category = data.get('category')
    amount = data.get('amount')

    if not category or amount is None:
        return error_response(code="MISSING_DATA", message="Category and amount are required", status_code=400)

    exp_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data.get('expense_date') else datetime.utcnow().date()

    expense = Expense(
        farm_id=farm.id,
        crop_id=data.get('crop_id'),
        category=category,
        amount=float(amount),
        expense_date=exp_date,
        payment_method=data.get('payment_method', 'Cash'),
        notes=data.get('notes', '')
    )
    db.session.add(expense)
    db.session.commit()

    return success_response(data={"expense": expense.to_dict()}, message="Expense recorded successfully", status_code=201)


@expense_bp.route('/<int:expense_id>', methods=['PUT'])
@login_required
def update_expense(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense:
        return error_response(code="NOT_FOUND", message="Expense not found", status_code=404)

    data = request.get_json() or {}
    if 'category' in data: expense.category = data['category']
    if 'amount' in data: expense.amount = float(data['amount'])
    if 'payment_method' in data: expense.payment_method = data['payment_method']
    if 'notes' in data: expense.notes = data['notes']
    if 'expense_date' in data and data['expense_date']:
        expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()

    db.session.commit()
    return success_response(data={"expense": expense.to_dict()}, message="Expense updated")


@expense_bp.route('/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense:
        return error_response(code="NOT_FOUND", message="Expense not found", status_code=404)

    db.session.delete(expense)
    db.session.commit()
    return success_response(message="Expense deleted successfully")
