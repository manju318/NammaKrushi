import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { farmService } from '../services/farmService';
import { weatherService } from '../services/weatherService';
import { useAuth } from '../contexts/AuthContext';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Info,
  Sprout,
  CloudSun,
  ShieldCheck,
  User,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

const QUICK_PROMPTS = [
  "My tomato crop is showing yellow leaves.",
  "Rain is forecast tomorrow. How should I adjust irrigation?",
  "What are the best organic treatments for sucking pests like whiteflies?",
  "How can I become a Verified Seller to get higher prices on the marketplace?",
  "What is the recommended N-P-K fertilizer schedule for vegetative maize?"
];

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user?.full_name?.split(' ')[0] || 'Farmer'}! I am your ESYKRUSHI AI Agricultural Advisor. I have synchronized with your current farm weather and active crop records. How can I assist your field operations today?`,
      citations: ['[ESYKRUSHI System Extension Guide]'],
      is_grounded: true,
      provider: 'EsyKrushi Agronomic Knowledge Engine',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [farmContext, setFarmContext] = useState(null);
  const messagesEndRef = useRef(null);

  // Load active farm context
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [fRes, wRes] = await Promise.all([
          farmService.getFarmDetails(),
          weatherService.getCurrent()
        ]);
        const ctx = {};
        if (fRes.success && fRes.data.farms?.[0]) {
          const farm = fRes.data.farms[0];
          const crop = farm.crops?.[0];
          ctx.location = farm.location_name;
          if (crop) {
            ctx.current_crop = crop.crop_name;
            ctx.crop_stage = crop.current_stage;
          }
          if (fRes.data.profile) {
            ctx.soil_type = fRes.data.profile.soil_type;
          }
        }
        if (wRes.success) {
          ctx.weather = `${wRes.data.temperature}°C, ${wRes.data.condition}`;
        }
        setFarmContext(ctx);
      } catch (err) {
        console.error("Context sync error:", err);
      }
    };
    loadContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageToSend) => {
    const text = messageToSend || inputMsg;
    if (!text.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMsg('');
    setLoading(true);

    try {
      const res = await aiService.chat(text, farmContext || {});
      if (res.success) {
        const assistantMessage = {
          role: 'assistant',
          text: res.data.reply,
          citations: res.data.citations || [],
          is_grounded: res.data.is_grounded,
          provider: res.data.provider,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'The AI consultation service is momentarily busy. Please verify your query or check back in a few moments.',
          citations: [],
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Header & Active Context Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-forest-600" />
            <span>AI Agricultural Assistant (RAG Grounded)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Context-aware crop diagnostics grounded in extension documentation with verified source citations.
          </p>
        </div>

        {/* Live Farm Context Indicator */}
        {farmContext && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            {farmContext.current_crop && (
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-forest-800">
                <Sprout className="w-3.5 h-3.5 text-forest-600" /> {farmContext.current_crop} ({farmContext.crop_stage})
              </span>
            )}
            {farmContext.soil_type && (
              <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                Soil: {farmContext.soil_type}
              </span>
            )}
            {farmContext.weather && (
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                <CloudSun className="w-3.5 h-3.5 text-harvest-500" /> {farmContext.weather}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chat Stream Window */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-forest-600 text-white shadow-xs'
                    : 'bg-forest-100 text-forest-700 border border-forest-200'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 text-xs leading-relaxed space-y-2.5 ${
                  isUser
                    ? 'bg-forest-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line font-medium leading-relaxed">
                  {m.text}
                </div>

                {/* Grounding & Citations Chip Bar (for Assistant) */}
                {!isUser && m.citations && m.citations.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-forest-600" /> Grounded Citations:
                    </span>
                    {m.citations.map((cite, cIdx) => (
                      <span
                        key={cIdx}
                        className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-semibold text-forest-800"
                      >
                        {cite}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[10px] text-right ${
                    isUser ? 'text-forest-200' : 'text-slate-400'
                  }`}
                >
                  {m.created_at} {!isUser && m.provider && `• ${m.provider}`}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
              <span>Querying agricultural RAG vector index & synthesizing guidance...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Suggestions:
        </span>
        {QUICK_PROMPTS.map((prompt, pIdx) => (
          <button
            key={pIdx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="text-[11px] font-medium text-slate-600 bg-white hover:bg-forest-50 hover:text-forest-700 border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap transition shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder="Ask anything about pests, fertilizers, crop rotation, irrigation, or market pricing..."
          className="flex-1 px-4 py-2 bg-transparent text-xs sm:text-sm focus:outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim() || loading}
          className="p-2.5 bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
