"""
Farm Calendar & Task Management Routes (/api/tasks)
Supports scheduling, priority assignment, deadlines, and task lifecycle tracking.
"""

from datetime import datetime
from flask import Blueprint, request, g
from app.models.user import User
from app.models.farm import Task
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response
from app import db

task_bp = Blueprint('tasks', __name__)

@task_bp.route('', methods=['GET'])
@login_required
def list_tasks():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Tasks belong to farmer profiles", status_code=400)

    farms = user.farmer_profile.farms.all()
    farm_ids = [f.id for f in farms]
    status = request.args.get('status')

    query = Task.query.filter(Task.farm_id.in_(farm_ids))
    if status:
        query = query.filter_by(status=status)

    tasks = query.order_by(Task.due_date.asc()).all()
    return success_response(data={"tasks": [t.to_dict() for t in tasks]}, message="Tasks retrieved")


@task_bp.route('', methods=['POST'])
@login_required
def create_task():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Tasks belong to farmer profiles", status_code=400)

    farm = user.farmer_profile.farms.first()
    if not farm:
        return error_response(code="NO_FARM", message="Farm required to create tasks", status_code=404)

    data = request.get_json() or {}
    title = data.get('title')
    if not title:
        return error_response(code="MISSING_TITLE", message="Task title is required", status_code=400)

    due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data.get('due_date') else datetime.utcnow().date()

    task = Task(
        farm_id=farm.id,
        crop_id=data.get('crop_id'),
        title=title,
        description=data.get('description', ''),
        category=data.get('category', 'General'),
        priority=data.get('priority', 'Medium'),
        due_date=due_date,
        status=data.get('status', 'Pending')
    )
    db.session.add(task)
    db.session.commit()

    return success_response(data={"task": task.to_dict()}, message="Task created successfully", status_code=201)


@task_bp.route('/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response(code="NOT_FOUND", message="Task not found", status_code=404)

    data = request.get_json() or {}
    if 'status' in data: task.status = data['status']
    if 'priority' in data: task.priority = data['priority']
    if 'title' in data: task.title = data['title']
    if 'description' in data: task.description = data['description']
    if 'due_date' in data and data['due_date']:
        task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()

    db.session.commit()
    return success_response(data={"task": task.to_dict()}, message="Task updated")


@task_bp.route('/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response(code="NOT_FOUND", message="Task not found", status_code=404)

    db.session.delete(task)
    db.session.commit()
    return success_response(message="Task deleted successfully")
