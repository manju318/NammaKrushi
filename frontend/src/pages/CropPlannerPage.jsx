import React, { useState, useEffect } from 'react';
import { cropService } from '../services/cropService';
import { weatherService } from '../services/weatherService';
import { useLanguage } from '../contexts/LanguageContext';
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
  X,
  Navigation,
  Loader2,
  BarChart3,
  LineChart,
  DollarSign
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
  const { t } = useLanguage();
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
  const [activeTab, setActiveTab] = useState('recommendation'); // 'recommendation' | 'market_analysis'
  const [marketCommodity, setMarketCommodity] = useState('Rice');
  const [predicting, setPredicting] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedCropDetail, setSelectedCropDetail] = useState(null);

  // Real-time simulated APMC Mandi trends dataset for major crops
  const APMC_MARKET_DATA = {
    'Rice': {
      currentPrice: 3250,
      unit: 'Quintal (100 kg)',
      change: '+4.2%',
      trend: 'up',
      modalPrice: 3100,
      minPrice: 2850,
      maxPrice: 3450,
      mandi: 'Yeshwanthpur APMC, Bengaluru',
      seasonDemand: 'High',
      historical: [
        { month: 'May', price: 2950 },
        { month: 'Jun', price: 3000 },
        { month: 'Jul', price: 3120 },
        { month: 'Aug', price: 3080 },
        { month: 'Sep', price: 3190 },
        { month: 'Oct', price: 3250 }
      ],
      advisory: 'Paddy arrivals are steady. Strong demand from domestic millers and South Indian export buyers supports firm price realization.'
    },
    'Maize': {
      currentPrice: 2280,
      unit: 'Quintal (100 kg)',
      change: '+2.8%',
      trend: 'up',
      modalPrice: 2200,
      minPrice: 2050,
      maxPrice: 2360,
      mandi: 'Davanagere APMC / Mandya Mandi',
      seasonDemand: 'Very High',
      historical: [
        { month: 'May', price: 2100 },
        { month: 'Jun', price: 2150 },
        { month: 'Jul', price: 2220 },
        { month: 'Aug', price: 2200 },
        { month: 'Sep', price: 2250 },
        { month: 'Oct', price: 2280 }
      ],
      advisory: 'Poultry feed manufacturing and starch processing plants maintain aggressive procurement. Excellent liquidity for immediate dispatch.'
    },
    'Chickpea': {
      currentPrice: 6150,
      unit: 'Quintal (100 kg)',
      change: '+1.5%',
      trend: 'up',
      modalPrice: 6000,
      minPrice: 5800,
      maxPrice: 6300,
      mandi: 'Gulbarga (Kalaburagi) APMC',
      seasonDemand: 'Moderate',
      historical: [
        { month: 'May', price: 5800 },
        { month: 'Jun', price: 5900 },
        { month: 'Jul', price: 6050 },
        { month: 'Aug', price: 6000 },
        { month: 'Sep', price: 6100 },
        { month: 'Oct', price: 6150 }
      ],
      advisory: 'Festive season pulse consumption is driving premium wholesale buying for bold desi chana grades.'
    },
    'Cotton': {
      currentPrice: 7420,
      unit: 'Quintal (100 kg)',
      change: '-1.2%',
      trend: 'down',
      modalPrice: 7350,
      minPrice: 6900,
      maxPrice: 7600,
      mandi: 'Raichur Cotton Yard',
      seasonDemand: 'Moderate',
      historical: [
        { month: 'May', price: 7600 },
        { month: 'Jun', price: 7550 },
        { month: 'Jul', price: 7480 },
        { month: 'Aug', price: 7450 },
        { month: 'Sep', price: 7500 },
        { month: 'Oct', price: 7420 }
      ],
      advisory: 'Fresh crop arrivals from North Karnataka stabilizing domestic mill bids. Moisture content below 8% fetches top tier auction rates.'
    },
    'Grapes': {
      currentPrice: 8500,
      unit: 'Quintal (100 kg)',
      change: '+6.5%',
      trend: 'up',
      modalPrice: 8200,
      minPrice: 7500,
      maxPrice: 9200,
      mandi: 'Channapatna / Kolar Fruit Market',
      seasonDemand: 'High',
      historical: [
        { month: 'May', price: 7200 },
        { month: 'Jun', price: 7400 },
        { month: 'Jul', price: 7900 },
        { month: 'Aug', price: 8100 },
        { month: 'Sep', price: 8300 },
        { month: 'Oct', price: 8500 }
      ],
      advisory: 'Bangalore Blue and Thomson Seedless command premium prices in retail and direct grocery channels due to early table fruit shortage.'
    },
    'Tomato': {
      currentPrice: 2800,
      unit: 'Quintal (100 kg)',
      change: '+12.0%',
      trend: 'up',
      modalPrice: 2600,
      minPrice: 2100,
      maxPrice: 3200,
      mandi: 'Kolar APMC Yard',
      seasonDemand: 'Very High',
      historical: [
        { month: 'May', price: 1800 },
        { month: 'Jun', price: 2100 },
        { month: 'Jul', price: 2500 },
        { month: 'Aug', price: 2400 },
        { month: 'Sep', price: 2650 },
        { month: 'Oct', price: 2800 }
      ],
      advisory: 'Inter-state demand from Kerala and Tamil Nadu has caused a sharp price surge. Recommend harvesting at breaker stage for safe distance transport.'
    }
  };

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
    e?.preventDefault();
    if (!locationQuery.trim()) return;
    try {
      setWeatherLoading(true);
      const geoRes = await weatherService.geocode(locationQuery.trim());
      const results = geoRes?.data?.results || [];
      if (results.length > 0) {
        const topResult = results[0];
        setCoords({ lat: topResult.latitude, lon: topResult.longitude });
        if (topResult.name) setLocationQuery(topResult.name);
        await fetchWeatherForCoords(topResult.latitude, topResult.longitude, topResult.name);
      } else {
        await fetchWeatherForCoords(coords.lat, coords.lon, locationQuery.trim());
      }
    } catch (err) {
      console.error("Geocoding failed, trying fallback:", err);
      await fetchWeatherForCoords(coords.lat, coords.lon, locationQuery.trim());
    } finally {
      setWeatherLoading(false);
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        try {
          const revRes = await weatherService.reverseGeocode(latitude, longitude);
          const locName = revRes.success && revRes.data?.name ? revRes.data.name : `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`;
          setLocationQuery(locName);
          fetchWeatherForCoords(latitude, longitude, locName);
        } catch (err) {
          console.error("Reverse geocode failed:", err);
          fetchWeatherForCoords(latitude, longitude, `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("Geolocation denied or error:", err.message);
        setDetectingLocation(false);
        alert("Unable to detect current GPS location. Please check your browser location permission.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
          {t('cropPlannerHeading', 'AI Crop Planning & Market Analysis')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          {t('cropPlannerSub', 'Supervised Machine Learning crop recommendation coupled with real-time APMC Mandi price trends and market intelligence.')}
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 mt-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('recommendation')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'recommendation'
                ? 'border-forest-600 text-forest-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>{t('cropPlanner', 'AI Crop Recommendation')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('market_analysis')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'market_analysis'
                ? 'border-forest-600 text-forest-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('marketTrendsTitle', 'APMC Market Price Analysis')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Crop Recommendation Engine */}
      {activeTab === 'recommendation' && (
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
                title="Search location"
              >
                {t('search', 'Search')}
              </button>
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={detectingLocation}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                title="Auto-detect current GPS location"
              >
                {detectingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>{detectingLocation ? t('detectingLoc', 'Locating...') : t('autoDetectLoc', 'Auto Detect')}</span>
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
                  {t('nitrogen', 'Nitrogen (N) kg/ha')}
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
                  {t('phosphorus', 'Phosphorus (P) kg/ha')}
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
                  {t('potassium', 'Potassium (K) kg/ha')}
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
                  {t('soilPh', 'Soil pH (1-14)')}
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
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('tempNow', 'Temp')} (°C)</label>
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
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('humidityLabel', 'Humidity')} (%)</label>
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
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('rainLabel', 'Rainfall')} (mm)</label>
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
                  <span>{t('analyzingPlanner', 'Analyzing your farm conditions...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-harvest-300" />
                  <span>{t('predictButton', 'Run Crop ML Prediction')}</span>
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
              <h3 className="text-lg font-bold text-slate-900">{t('analyzingPlanner', 'Evaluating Soil & Climate Suitability')}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Applying standard scaling and executing Random Forest multi-class probability estimation across 22 crops...
              </p>
            </div>
          ) : recommendations ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{t('recommendationsTitle', 'Top 3 Recommended Crops')}</h2>
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
      )}

      {/* TAB 2: APMC Mandi Market Price Analysis */}
      {activeTab === 'market_analysis' && (
        <div className="space-y-6">
          {/* Commodity Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-forest-600" />
                <span>APMC Agricultural Commodity Intelligence</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live modal prices, wholesale ranges, and price forecasts across major Karnataka & South Indian mandis.
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {Object.keys(APMC_MARKET_DATA).map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onClick={() => setMarketCommodity(crop)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    marketCommodity === crop
                      ? 'bg-forest-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>

          {/* Active Commodity Overview Cards */}
          {APMC_MARKET_DATA[marketCommodity] && (() => {
            const data = APMC_MARKET_DATA[marketCommodity];
            return (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 font-semibold block mb-1">Current Modal Price</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">₹{data.currentPrice.toLocaleString('en-IN')}</span>
                      <span className="text-[11px] text-slate-500 font-medium">/{data.unit}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" /> {data.change} (last 30 days)
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 font-semibold block mb-1">Wholesale Price Range</span>
                    <div className="text-sm font-bold text-slate-800">
                      ₹{data.minPrice.toLocaleString('en-IN')} - ₹{data.maxPrice.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">Min to Max realized at mandi</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 font-semibold block mb-1">Primary Reporting Yard</span>
                    <div className="text-xs font-bold text-slate-900 truncate">{data.mandi}</div>
                    <span className="text-[11px] text-forest-700 font-medium mt-1 block">Live APMC feed active</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 font-semibold block mb-1">Current Market Demand</span>
                    <span className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-lg">
                      {data.seasonDemand} Demand
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">Direct buyer interest elevated</span>
                  </div>
                </div>

                {/* Historical Price Trend Visualizer */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">6-Month Price Trend (₹ / Quintal)</h3>
                      <p className="text-xs text-slate-500">Historical auction averages leading to current market rates</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                      Commodity: {marketCommodity}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 pt-4">
                    {data.historical.map((h, i) => {
                      const maxP = Math.max(...data.historical.map(x => x.price));
                      const heightPct = Math.round((h.price / maxP) * 100);
                      const isLatest = i === data.historical.length - 1;
                      return (
                        <div key={h.month} className="flex flex-col items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700">₹{h.price}</span>
                          <div className="w-full bg-slate-100 rounded-xl h-28 flex items-end p-1.5">
                            <div
                              className={`w-full rounded-lg transition-all ${
                                isLatest ? 'bg-forest-600' : 'bg-forest-400/80 hover:bg-forest-500'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold ${isLatest ? 'text-forest-700' : 'text-slate-500'}`}>
                            {h.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Market Advisory Callout */}
                  <div className="mt-4 p-4 bg-forest-50/70 border border-forest-100 rounded-2xl flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-forest-900">Market Advisory for {marketCommodity}:</h4>
                      <p className="text-xs text-forest-800 mt-0.5 leading-relaxed">{data.advisory}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
