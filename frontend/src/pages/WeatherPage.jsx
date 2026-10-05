import React, { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';
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
  Sun
} from 'lucide-react';

export default function WeatherPage() {
  const [query, setQuery] = useState('Mandya, Karnataka');
  const [coords, setCoords] = useState({ lat: 12.5230, lon: 76.8967 });
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async (lat, lon, name) => {
    setLoading(true);
    try {
      const [cRes, fRes] = await Promise.all([
        weatherService.getCurrent(lat, lon, name),
        weatherService.getForecast(lat, lon),
      ]);
      if (cRes.success) setCurrent(cRes.data);
      if (fRes.success) setForecast(fRes.data.forecast || []);
    } catch (e) {
      console.error("Weather error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(coords.lat, coords.lon, query);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await weatherService.geocode(query);
      if (res.success && res.data.results.length > 0) {
        const top = res.data.results[0];
        setCoords({ lat: top.latitude, lon: top.longitude });
        fetchWeather(top.latitude, top.longitude, top.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Agricultural Weather Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time microclimate monitoring and 7-day farm forecasting with agricultural action advisories.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Indian district..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <div className="w-10 h-10 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving meteorological telemetry...</p>
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
                  <div className="text-xs text-forest-200">Humidity</div>
                  <div className="text-lg font-bold">{Math.round(current.humidity)}%</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <CloudRain className="w-5 h-5 text-cyan-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">Rain Prob.</div>
                  <div className="text-lg font-bold">{current.rain_probability}%</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <Wind className="w-5 h-5 text-teal-300 mx-auto mb-1" />
                  <div className="text-xs text-forest-200">Wind Speed</div>
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

          {/* 7-Day Forecast Grid */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-forest-600" />
              <span>7-Day Agricultural Forecast & Spraying Advisories</span>
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {forecast.map((day, idx) => {
                const dateObj = new Date(day.date);
                const dayName = idx === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <div
                    key={day.date}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">{dayName}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {Math.round(day.max_temp)}° / {Math.round(day.min_temp)}°
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                        <CloudSun className="w-4 h-4 text-harvest-500" />
                        <span className="truncate">{day.condition}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-xl">
                        <span>Rain: <b>{day.rain_probability}%</b></span>
                        <span>Wind: <b>{Math.round(day.wind_speed)} km/h</b></span>
                      </div>
                    </div>

                    <p className={`text-[11px] p-2 rounded-xl border leading-tight ${
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
