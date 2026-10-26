import React, { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CloudSun,
  Search,
  MapPin,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  AlertTriangle,
  Calendar,
  CloudRain,
  Sun,
  Navigation,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const QUICK_DISTRICTS = [
  { name: 'Mandya, Karnataka', lat: 12.5230, lon: 76.8967 },
  { name: 'Bengaluru Rural, Karnataka', lat: 13.0827, lon: 77.5877 },
  { name: 'Kolar, Karnataka', lat: 13.1367, lon: 78.1291 },
  { name: 'Shivamogga, Karnataka', lat: 13.9299, lon: 75.5681 },
  { name: 'Belagavi, Karnataka', lat: 15.8497, lon: 74.4977 },
  { name: 'Davanagere, Karnataka', lat: 14.4644, lon: 75.9218 },
];

export default function WeatherPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('Mandya, Karnataka');
  const [coords, setCoords] = useState({ lat: 12.5230, lon: 76.8967 });
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const fetchWeather = async (lat, lon, name) => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, fRes] = await Promise.all([
        weatherService.getCurrent(lat, lon, name),
        weatherService.getForecast(lat, lon),
      ]);
      if (cRes.success) setCurrent(cRes.data);
      if (fRes.success) setForecast(fRes.data.forecast || []);
    } catch (e) {
      console.error("Weather error:", e);
      setError(e.message || "Failed to load weather data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(coords.lat, coords.lon, query);
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const geoRes = await weatherService.geocode(query.trim());
      const results = geoRes?.data?.results || [];
      if (results.length > 0) {
        const topResult = results[0];
        setCoords({ lat: topResult.latitude, lon: topResult.longitude });
        if (topResult.name) setQuery(topResult.name);
        await fetchWeather(topResult.latitude, topResult.longitude, topResult.name);
      } else {
        await fetchWeather(coords.lat, coords.lon, query.trim());
      }
    } catch (err) {
      console.error("Geocoding failed, trying fallback:", err);
      await fetchWeather(coords.lat, coords.lon, query.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (district) => {
    setQuery(district.name);
    setCoords({ lat: district.lat, lon: district.lon });
    fetchWeather(district.lat, district.lon, district.name);
  };

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
          setQuery(locName);
          fetchWeather(latitude, longitude, locName);
        } catch (err) {
          console.error("Reverse geocode failed:", err);
          fetchWeather(latitude, longitude, `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`);
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

  const getWeatherIcon = (iconName) => {
    switch (iconName) {
      case 'sun':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'cloud-sun':
        return <CloudSun className="w-5 h-5 text-amber-500" />;
      case 'cloud-rain':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'cloud-drizzle':
        return <Droplets className="w-5 h-5 text-cyan-500" />;
      default:
        return <CloudSun className="w-5 h-5 text-forest-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CloudSun className="w-8 h-8 text-forest-600" />
            <span>{t('weatherHeading', 'Agricultural Weather Intelligence')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('weatherSub', 'Real-time microclimate monitoring and 7-day farm forecasting with agricultural action advisories.')}
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Indian district..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            {t('search', 'Search')}
          </button>
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            disabled={detectingLocation}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-60 shrink-0 shadow-2xs"
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
      </div>

      {/* Quick District Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-500 shrink-0">Popular Districts:</span>
        {QUICK_DISTRICTS.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => handleSelectPreset(d)}
            className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap border ${
              query.includes(d.name.split(',')[0])
                ? 'bg-forest-700 text-white border-forest-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            📍 {d.name.split(',')[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-10 h-10 border-3 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Retrieving meteorological telemetry for {query}...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Weather Telemetry Notice</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
          <button
            onClick={() => fetchWeather(coords.lat, coords.lon, query)}
            className="mt-4 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : current ? (
        <>
          {/* Current Conditions Card */}
          <div className="bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-forest-200 text-xs font-semibold mb-2">
                  <MapPin className="w-4 h-4 text-harvest-400" />
                  <span>{current.location}</span>
                  {current.is_demo && (
                    <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">Demo Telemetry</span>
                  )}
                </div>
                <div className="text-5xl sm:text-6xl font-black">{Math.round(current.temperature)}°C</div>
                <div className="text-lg text-forest-100 font-semibold mt-1 capitalize">{current.condition}</div>
                <div className="text-xs text-forest-300 mt-2">
                  High: {current.max_temp}°C • Low: {current.min_temp}°C
                </div>
              </div>

              {/* Climate Metrics Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <Droplets className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">{t('humidityLabel', 'Humidity')}</div>
                  <div className="text-lg font-bold">{Math.round(current.humidity)}%</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <CloudRain className="w-5 h-5 text-cyan-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">{t('rainLabel', 'Rain Prob.')}</div>
                  <div className="text-lg font-bold">{current.rain_probability}%</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <Wind className="w-5 h-5 text-teal-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">{t('windLabel', 'Wind Speed')}</div>
                  <div className="text-lg font-bold">{current.wind_speed} km/h</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <Sunrise className="w-5 h-5 text-harvest-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">Sunrise</div>
                  <div className="text-sm font-bold mt-1">{current.sunrise}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Precision Agro Forecast Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-forest-600" />
                <span>{t('sevenDayForecast', '7-Day Precision Agro Forecast')}</span>
              </h2>
              <span className="text-xs text-forest-700 bg-forest-50 border border-forest-200 font-semibold px-2.5 py-1 rounded-full">
                7 Days Live Telemetry
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {forecast.map((day, idx) => {
                const dateObj = new Date(day.date);
                const dayName = idx === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <div
                    key={day.date}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">{dayName}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {Math.round(day.max_temp)}° / {Math.round(day.min_temp)}°
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                        {getWeatherIcon(day.icon)}
                        <span className="truncate font-medium">{day.condition}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-xl">
                        <span>Rain: <b>{day.rain_probability}%</b></span>
                        <span>Wind: <b>{Math.round(day.wind_speed)} km/h</b></span>
                      </div>
                    </div>

                    <p className={`text-[11px] p-2.5 rounded-xl border leading-relaxed ${
                      day.rain_probability > 50
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-forest-50 text-forest-900 border-forest-100'
                    }`}>
                      💡 {day.agricultural_advice}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
