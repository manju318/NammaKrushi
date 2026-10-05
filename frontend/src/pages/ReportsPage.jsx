import React, { useState, useEffect } from 'react';
import { farmService } from '../services/farmService';
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sprout,
  Coins,
  Calendar
} from 'lucide-react';

export default function ReportsPage() {
  const [season, setSeason] = useState('Kharif');
  const [year, setYear] = useState(2026);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await farmService.getSeasonalReport(season, year);
      if (res.success) {
        setReport(res.data.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [season, year]);

  const handleDownloadPdf = () => {
    const url = farmService.getSeasonalPdfUrl(season, year);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-forest-600" />
            <span>Seasonal AI Farm Intelligence Report</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Holistic end-of-season review synthesizing journals, task completions, expenditures, and future cropping advisories.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="Kharif">Kharif Season</option>
            <option value="Rabi">Rabi Season</option>
            <option value="Zaid">Zaid / Summer</option>
          </select>

          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
          <div className="w-10 h-10 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Generating seasonal agronomic review...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <span className="text-xs font-bold text-forest-700 uppercase tracking-wider block">
                  Agronomic Audit: {report.season} {report.year}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Farm Operations Performance: {report.farmer_name}
                </h2>
                <span className="text-xs text-slate-500">{report.location} • {report.total_acreage} Acres Total</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Cultivated Plots</span>
                <span className="font-bold text-slate-800 text-sm">{report.crops_cultivated?.join(', ')}</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Expenditure</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  ₹{report.financial_summary?.total_expenditure?.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Task Completion</span>
                <span className="text-lg font-black text-forest-700 mt-1 block">
                  {report.operational_metrics?.completion_rate}%
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Journal Field Logs</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {report.operational_metrics?.journal_logs_count} Entries
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Pest Incidents Logged</span>
                <span className="text-lg font-black text-amber-700 mt-1 block">
                  {report.operational_metrics?.pest_disease_incidents}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: What Went Well */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>1. What Went Well (Operational Highlights)</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 pl-2">
              {report.analytical_review?.what_went_well?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Problems Observed */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>2. Challenges & Problems Observed</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 pl-2">
              {report.analytical_review?.problems_observed?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Financial Trends */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-forest-600" />
              <span>3. Financial Trends & Input Cost Review</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {report.analytical_review?.expense_trends}
            </p>
          </div>

          {/* Section 4: Corrective Actions */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-forest-600" />
              <span>4. Recommended Corrective Actions for Efficiency</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 pl-2">
              {report.analytical_review?.suggested_actions?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-600 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: Next-Season Strategy */}
          <div className="bg-gradient-to-r from-forest-800 to-forest-900 text-white p-6 sm:p-7 rounded-3xl shadow-md space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-harvest-300" />
              <span>5. Next Season Cropping Strategy & Recommendations</span>
            </h3>
            <ul className="space-y-2 text-xs text-forest-100 pl-2">
              {report.analytical_review?.next_season_recommendations?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-harvest-400 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
