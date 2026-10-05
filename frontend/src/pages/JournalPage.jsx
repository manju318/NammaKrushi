import React, { useState, useEffect } from 'react';
import { farmService } from '../services/farmService';
import {
  BookOpen,
  Plus,
  Calendar,
  CloudSun,
  Coins,
  Trash2,
  X,
  FileText,
  Sparkles
} from 'lucide-react';

export default function JournalPage() {
  const [journals, setJournals] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('Pest Scouting & Health Inspection');
  const [observations, setObservations] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('Clear, 28°C, optimal soil moisture');
  const [costInvolved, setCostInvolved] = useState('0');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cropId, setCropId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, fRes] = await Promise.all([
        farmService.getJournal(),
        farmService.getFarmDetails(),
      ]);
      if (jRes.success) setJournals(jRes.data.journals || []);
      if (fRes.success && fRes.data.farms?.[0]) {
        setCrops(fRes.data.farms[0].crops || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        activity_type: activityType,
        observations,
        weather_notes: weatherNotes,
        cost_involved: parseFloat(costInvolved) || 0.0,
        entry_date: entryDate,
        crop_id: cropId ? parseInt(cropId) : null,
      };
      const res = await farmService.createJournal(payload);
      if (res.success) {
        setJournals((prev) => [res.data.journal, ...prev]);
        setModalOpen(false);
        setObservations('');
        setCostInvolved('0');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await farmService.deleteJournal(id);
      setJournals((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Digital Farm Field Journal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chronological agronomic logbook feeding into real-time AI contextual advice and seasonal performance reviews.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Timeline View */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading journal records...</div>
      ) : journals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No journal entries recorded</h3>
          <p className="text-xs text-slate-500 mt-1">Log field scouting, fertilization, or pest activities to build your digital history.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-forest-200 ml-4 sm:ml-6 space-y-8 py-2">
          {journals.map((entry) => (
            <div key={entry.id} className="relative pl-6 sm:pl-8 group">
              {/* Timeline Dot */}
              <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-forest-600 border-4 border-white shadow-xs" />

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-forest-700 uppercase tracking-wider block">
                      {entry.activity_type}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      Crop: {entry.crop_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {entry.entry_date}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  {entry.observations}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-harvest-500" />
                    <span>Weather: {entry.weather_notes || 'Mild conditions'}</span>
                  </div>

                  {entry.cost_involved > 0 && (
                    <div className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Input Cost: ₹{entry.cost_involved.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Journal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Log Field Activity & Observations</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Activity Type</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Pest Scouting & Health Inspection">Pest Scouting & Health Inspection</option>
                  <option value="Foliar Spray & Chemical Application">Foliar Spray & Chemical Application</option>
                  <option value="Soil Preparation & Basal Manuring">Soil Preparation & Basal Manuring</option>
                  <option value="Inter-cultivation & Manual Weeding">Inter-cultivation & Manual Weeding</option>
                  <option value="Drip Irrigation & Fertigation">Drip Irrigation & Fertigation</option>
                  <option value="Harvesting & Yield Collection">Harvesting & Yield Collection</option>
                  <option value="General Field Monitoring">General Field Monitoring</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Field Observations</label>
                <textarea
                  rows={3}
                  required
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Record symptoms (e.g. leaf yellowing, borer holes), pest count, crop vigor..."
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Weather Conditions</label>
                  <input
                    type="text"
                    value={weatherNotes}
                    onChange={(e) => setWeatherNotes(e.target.value)}
                    placeholder="e.g. 29°C, humid morning"
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Associated Plot</label>
                  <select
                    value={cropId}
                    onChange={(e) => setCropId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">General Farm</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>{c.crop_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Cost Involved (₹)</label>
                  <input
                    type="number"
                    step="50"
                    value={costInvolved}
                    onChange={(e) => setCostInvolved(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Entry Date</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 rounded-xl"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
