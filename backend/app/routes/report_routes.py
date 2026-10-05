"""
Seasonal Report and PDF Export Routes (/api/reports)
Generates end-of-season farm performance reviews and ReportLab PDF downloads.
"""

import os
from flask import Blueprint, request, g, send_file, current_app
from app.models.user import User
from app.services.report_service import generate_seasonal_insights, generate_seasonal_pdf
from app.auth.jwt_handler import login_required
from app.utils.response import success_response, error_response

report_bp = Blueprint('reports', __name__)

@report_bp.route('/seasonal', methods=['GET'])
@login_required
def get_seasonal_report():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Seasonal reports are generated for farmers", status_code=400)

    season = request.args.get('season', 'Kharif')
    year = request.args.get('year', 2026, type=int)

    insights = generate_seasonal_insights(user.farmer_profile, season=season, year=year)
    return success_response(data={"report": insights}, message="Seasonal report generated successfully")


@report_bp.route('/seasonal/pdf', methods=['GET'])
@login_required
def download_seasonal_pdf():
    user: User = g.current_user
    if not user.farmer_profile:
        return error_response(code="NOT_A_FARMER", message="Seasonal reports are generated for farmers", status_code=400)

    season = request.args.get('season', 'Kharif')
    year = request.args.get('year', 2026, type=int)

    insights = generate_seasonal_insights(user.farmer_profile, season=season, year=year)
    
    filename = f"EsyKrushi_Report_Farmer_{user.id}_{season}_{year}.pdf"
    reports_dir = current_app.config['REPORTS_FOLDER']
    output_path = os.path.join(reports_dir, filename)

    generate_seasonal_pdf(insights, output_path)

    return send_file(
        output_path,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )
