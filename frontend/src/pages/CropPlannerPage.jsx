import React, { useState, useEffect } from 'react';
import { cropService } from '../services/cropService';
import { weatherService } from '../services/weatherService';
import {
  Sprout,
  MapPin,
  CloudSun,
  Beaker,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info,
  Droplets,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';

const CROP_IMAGES = {
  "Rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  "Maize": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
  "Chickpea": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80",
  "Cotton": "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=600&q=80",
  "Grapes": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80",
  "Banana": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80",
  "Coffee": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  "Pomegranate": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80",
  "Watermelon": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
  "Default": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80"
};

export default function CropPlannerPage() {
  const [locationQuery, setLocationQuery] = useState('Bengaluru Rural, Karnataka');
  const [coords, setCoords] = useState({ lat: 13.0827, lon: 77.5877 });
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Soil parameters
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('42');
  const [potassium, setPotassium] = useState('43');
  const [ph, setPh] = useState('6.5');

  // Climate inputs
  const [temperature, setTemperature] = useState('26.0');
  const [humidity, setHumidity] = useState('78.0');
  const [rainfall, setRainfall] = useState('210.0');

  // Inference state
  const [predicting, setPredicting] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedCropDetail, setSelectedCropDetail] = useState(null);

  // Auto fetch weather on location
  const fetchWeatherForCoords = async (lat, lon, locName) => {
    setWeatherLoading(true);
    try {
      const res = await weatherService.getCurrent(lat, lon, locName);
      if (res.success) {
        setWeatherData(res.data);
        setTemperature(res.data.temperature.toFixed(1));
        setHumidity(res.data.humidity.toFixed(1));
        // Estimated regional seasonal rainfall
        const estRain = (res.data.precipitation || 0) * 12 + 120.0;
        setRainfall(estRain.toFixed(1));
      }
    } catch (e) {
      console.error("Weather fetch failed:", e);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCoords(coords.lat, coords.lon, locationQuery);
  }, []);

  const handleLocationSearch = async (e) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    try {
      const res = await weatherService.geocode(locationQuery);
      if (res.success && res.data.results.length > 0) {
        const top = res.data.results[0];
        setCoords({ lat: top.latitude, lon: top.longitude });
        fetchWeatherForCoords(top.latitude, top.longitude, top.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applySoilPreset = (preset) => {
    if (preset === 'paddy') {
      setNitrogen('90'); setPhosphorus('45'); setPotassium('40'); setPh('6.5'); setRainfall('240');
    } else if (preset === 'cotton') {
      setNitrogen('120'); setPhosphorus('48'); setPotassium('20'); setPh('7.2'); setRainfall('85');
    } else if (preset === 'chickpea') {
      setNitrogen('35'); setPhosphorus('68'); setPotassium('80'); setPh('7.4'); setRainfall('75');
    } else if (preset === 'grapes') {
      setNitrogen('25'); setPhosphorus('135'); setPotassium('200'); setPh('6.2'); setRainfall('70');
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setPredicting(true);

    try {
      const payload = {
        N: parseFloat(nitrogen),
        P: parseFloat(phosphorus),
        K: parseFloat(potassium),
        ph: parseFloat(ph),
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        rainfall: parseFloat(rainfall),
        location_name: locationQuery,
        latitude: coords.lat,
        longitude: coords.lon,
      };

      const res = await cropService.predictCrop(payload);
      if (res.success) {
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Crop recommendation failed. Please check that all numeric parameters are provided.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-forest-600" />
          <span>Random Forest Supervised ML Inference</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Crop Recommendation Engine
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          Enter your soil chemical analysis (N-P-K, pH) and synchronize with live meteorological forecasts to evaluate the top 3 high-yield crop matches with explainable agronomic reasoning.
        </p>
      </div>

      {/* Main Grid: Form Inputs vs Recommendations */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Input Parameters Column */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Section A: Location & Climate Auto-Fetch */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-forest-600" />
              <span>1. Location & Climate Zone</span>
            </h3>

            <form onSubmit={handleLocationSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Enter district or city..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Sync
              </button>
            </form>

            {weatherData && (
              <div className="mt-3 p-3 bg-forest-50/70 border border-forest-100 rounded-xl flex items-center justify-between text-xs text-forest-900">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-forest-600" />
                  <div>
                    <span className="font-bold">{weatherData.temperature}°C</span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="capitalize">{weatherData.condition}</span>
                  </div>
                </div>
                <span className="text-[11px] text-forest-700 font-medium">Auto-Synchronized</span>
              </div>
            )}
          </div>

          {/* Quick Soil Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Quick Soil Presets (Viva Demo)</label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applySoilPreset('paddy')}
                className="p-2 text-left rounded-xl bg-slate-50 hover:bg-forest-50 border border-slate-200 transition font-medium"
              >
                🌾 High-N Clay (Paddy)
              </button>
              <button
                type="button"
                onClick={() => applySoilPreset('cotton')}
                className="p-2 text-left rounded-xl bg-slate-50 hover:bg-forest-50 border border-slate-200 transition font-medium"
              >
                🌱 Black Cotton Soil
              </button>
              <button
                type="button"
                onClick={() => applySoilPreset('chickpea')}
                className="p-2 text-left rounded-xl bg-slate-50 hover:bg-forest-50 border border-slate-200 transition font-medium"
              >
                🫘 High-P Rabi Loam
              </button>
              <button
                type="button"
                onClick={() => applySoilPreset('grapes')}
                className="p-2 text-left rounded-xl bg-slate-50 hover:bg-forest-50 border border-slate-200 transition font-medium"
              >
                🍇 High-K Horticulture
              </button>
            </div>
          </div>

          {/* Section B: Soil Nutrients Form */}
          <form onSubmit={handlePredict} className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pt-2 border-t border-slate-100">
              <Beaker className="w-4 h-4 text-forest-600" />
              <span>2. Soil Chemical Composition (mg/kg)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nitrogen (N)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={nitrogen}
                  onChange={(e) => setNitrogen(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Phosphorus (P)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Potassium (K)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Soil pH (3.5 - 9.9)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
            </div>

            {/* Section C: Weather Data Inputs */}
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pt-2 border-t border-slate-100">
              <CloudSun className="w-4 h-4 text-forest-600" />
              <span>3. Climatic Parameters</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Humidity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Rainfall (mm)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={predicting}
              className="w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-forest-600 hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {predicting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing your farm conditions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-harvest-300" />
                  <span>Run Crop ML Prediction</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recommendations Output Column */}
        <div className="lg:col-span-7 space-y-6">
          {predicting ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center mx-auto mb-4 text-forest-600 animate-pulse">
                <Sprout className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Evaluating Soil & Climate Suitability</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Applying standard scaling and executing Random Forest multi-class probability estimation across 22 crops...
              </p>
            </div>
          ) : recommendations ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Top 3 Recommended Crops</h2>
                  <p className="text-xs text-slate-500">Ranked by class probability distribution</p>
                </div>
                <span className="text-xs bg-forest-50 text-forest-700 border border-forest-200 font-semibold px-3 py-1 rounded-full">
                  Model: Random Forest (100 Trees)
                </span>
              </div>

              {recommendations.map((item, index) => {
                const img = CROP_IMAGES[item.crop] || CROP_IMAGES["Default"];
                return (
                  <div
                    key={item.crop}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col sm:flex-row"
                  >
                    <div className="sm:w-48 h-40 sm:h-auto relative overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={img}
                        alt={item.crop}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs text-forest-900">
                        #{index + 1} Match
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-extrabold text-slate-900">{item.crop}</h3>
                            <span className="text-xs text-slate-500 font-medium">{item.season}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-forest-700">{item.confidence}%</span>
                            <div className="text-[10px] text-slate-400 font-medium">Confidence</div>
                          </div>
                        </div>

                        {/* Suitability Meter Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-slate-700">{item.suitability}</span>
                            <span className="text-slate-400">Match Metric</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-forest-600 h-2.5 rounded-full"
                              style={{ width: `${Math.min(item.confidence, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Agronomic Explainability Reason */}
                        <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          <b>Why Recommended:</b> {item.reason}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          💧 {item.water_requirement}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCropDetail(item)}
                          className="text-xs font-bold text-forest-700 hover:text-forest-800 flex items-center gap-1 hover:underline"
                        >
                          View Agronomic Specs <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <b>Academic Note:</b> ML confidence scores indicate pattern correlation with historical agro-climatic clusters. Yield outcomes also depend on seed purity, weed eradication, and timely fertigation.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center mx-auto mb-4 text-forest-600">
                <Sprout className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Awaiting Farm Input Parameters</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Fill in your soil parameters on the left or select a quick preset to launch the Random Forest inference engine.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCropDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{selectedCropDetail.crop} Specifications</h3>
              <button
                onClick={() => setSelectedCropDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Agronomic Description:</span>
                {selectedCropDetail.description}
              </div>
              <div>
                <span className="font-bold text-slate-900">Ideal Cropping Season:</span> {selectedCropDetail.season}
              </div>
              <div>
                <span className="font-bold text-slate-900">Water Requirement:</span> {selectedCropDetail.water_requirement}
              </div>
              <div>
                <span className="font-bold text-slate-900">Soil Preference:</span> {selectedCropDetail.soil_preference}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCropDetail(null)}
                className="px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
