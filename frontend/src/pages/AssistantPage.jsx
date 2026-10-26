import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { farmService } from '../services/farmService';
import { weatherService } from '../services/weatherService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  HelpCircle,
  Languages,
  Check
} from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🌐' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🌾' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🌿' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🌱' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🚜' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' }
];

const LOCALIZED_DATA = {
  en: {
    welcome: (name) => `Hello ${name}! I am your ESYKRUSHI AI Agricultural Advisor. I have synchronized with your current farm weather and active crop records. How can I assist your field operations today?`,
    placeholder: "Ask anything about pests, fertilizers, crop rotation, irrigation, or market pricing...",
    suggestionsLabel: "Suggestions:",
    prompts: [
      "My tomato crop is showing yellow leaves.",
      "Rain is forecast tomorrow. How should I adjust irrigation?",
      "What are the best organic treatments for sucking pests like whiteflies?",
      "What is the recommended N-P-K fertilizer schedule for vegetative maize?",
      "How can I become a Verified Seller to get higher prices on the marketplace?"
    ]
  },
  hi: {
    welcome: (name) => `नमस्ते ${name}! मैं आपका ईसीकृषि AI कृषि सलाहकार हूँ। मैंने आपके खेत के वर्तमान मौसम और सक्रिय फसलों के विवरण को सिंक कर लिया है। आज मैं आपकी खेती में किस प्रकार सहायता कर सकता हूँ?`,
    placeholder: "कीट, रोग, खाद, सिंचाई, फसल योजना या बाजार मूल्य के बारे में पूछें...",
    suggestionsLabel: "सुझावित प्रश्न:",
    prompts: [
      "मेरी टमाटर की फसल में पत्तियां पीली पड़ रही हैं।",
      "कल बारिश का अनुमान है। मुझे सिंचाई कैसे समायोजित करनी चाहिए?",
      "सफेद मक्खी जैसे रस चूसक कीटों के लिए सर्वोत्तम जैविक उपचार क्या है?",
      "मक्के की फसल के लिए अनुशंसित N-P-K खाद का क्या समय है?",
      "मार्केटप्लेस पर बेहतर दाम पाने के लिए सत्यापित विक्रेता कैसे बनें?"
    ]
  },
  kn: {
    welcome: (name) => `ನಮಸ್ಕಾರ ${name}! ನಾನು ನಿಮ್ಮ ಈಸಿ ಕೃಷಿ AI ಕೃಷಿ ಸಲಹೆಗಾರ. ನಿಮ್ಮ ಹೊಲದ ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆಗಳ ವಿವರಗಳನ್ನು ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ. ಇವತ್ತು ನಿಮ್ಮ ಕೃಷಿ ಕೆಲಸಗಳಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`,
    placeholder: "ಕೀಟಗಳು, ರೋಗಗಳು, ಗೊಬ್ಬರ, ನೀರಾವರಿ ಅಥವಾ ಬೆಳೆ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...",
    suggestionsLabel: "ಸಲಹೆಗಳು:",
    prompts: [
      "ನನ್ನ ಟೊಮೆಟೊ ಬೆಳೆಯಲ್ಲಿ ಎಲೆಗಳು ಹಳದಿಯಾಗುತ್ತಿವೆ.",
      "ನಾಳೆ ಮಳೆಯಾಗುವ ಮುನ್ಸೂಚನೆ ಇದೆ. ನೀರಾವರಿಯನ್ನು ಹೇಗೆ ಹೊಂದಿಸಬೇಕು?",
      "ಬಿಳಿ ನೊಣಗಳಂತಹ ರಸ ಹೀರುವ ಕೀಟಗಳಿಗೆ ಉತ್ತಮ ಸಾವಯವ ಚಿಕಿತ್ಸೆ ಯಾವುದು?",
      "ಮೆಕ್ಕೆಜೋಳ ಬೆಳೆಗೆ ಶಿಫಾರಸು ಮಾಡಿದ N-P-K ಗೊಬ್ಬರದ ವೇಳಾಪಟ್ಟಿ ಯಾವುದು?",
      "ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಉತ್ತಮ ಬೆಲೆ ಪಡೆಯಲು ವೆರಿಫೈಡ್ ಮಾರಾಟಗಾರರಾಗುವುದು ಹೇಗೆ?"
    ]
  },
  te: {
    welcome: (name) => `నమస్కారం ${name}! నేను మీ ఈసీకృషి AI వ్యవసాయ సలహాదారుని. మీ పొలం వాతావరణం మరియు పంట వివరాలను సేకరించాను. ఈరోజు మీ పంట పనులలో ఎలా సహాయపడగలను?`,
    placeholder: "పురుగులు, తెగుళ్లు, ఎరువులు, నీటిపారుదల లేదా మార్కెట్ ధరల గురించి అడగండి...",
    suggestionsLabel: "సూచనలు:",
    prompts: [
      "నా టమోటా పంటలో ఆకులు పసుపు రంగులోకి మారుతున్నాయి.",
      "రేపు వర్షం పడే అవకాశం ఉంది. నీటిపారుదలని ఎలా సర్దుబాటు చేయాలి?",
      "తెల్లదోమల వంటి రసం పీల్చే పురుగులకు ఉత్తమ సేంద్రీయ నివారణ ఏది?",
      "మొక్కజొన్న పంటకు సిఫార్సు చేసిన N-P-K ఎరువుల సమయం ఏమిటి?",
      "మార్కెట్‌లో మంచి ధర పొందడానికి వెరిఫైడ్ విక్రేతగా ఎలా మారాలి?"
    ]
  },
  ta: {
    welcome: (name) => `வணக்கம் ${name}! நான் உங்கள் ஈசி கிருஷி AI வேளாண்மை ஆலோசகர். உங்கள் பண்ணை வானிலை மற்றும் பயிர் விவரங்கள் இணைக்கப்பட்டுள்ளன. இன்று உங்களுக்கு எவ்வாறு உதவ வேண்டும்?`,
    placeholder: "பூச்சிகள், நோய்கள், உரங்கள், பாசனம் அல்லது சந்தை விலை பற்றி கேளுங்கள்...",
    suggestionsLabel: "பரிந்துரைகள்:",
    prompts: [
      "என் தக்காளிப் பயிரில் இலைகள் மஞ்சள் நிறமாக மாறுகின்றன.",
      "நாளை மழை பெய்ய வாய்ப்புள்ளது. பாசனத்தை எவ்வாறு மாற்றுவது?",
      "வெள்ளை ஈக்கள் போன்ற சாறு உறிஞ்சும் பூச்சிகளுக்கு சிறந்த இயற்கை மருத்துவம் என்ன?",
      "மக்காச்சோளப் பயிருக்கு பரிந்துரைக்கப்படும் N-P-K உர அட்டவணை என்ன?",
      "சந்தையில் அதிக விலை பெற சரிபார்க்கப்பட்ட விற்பனையாளராக மாறுவது எப்படி?"
    ]
  },
  mr: {
    welcome: (name) => `नमस्कार ${name}! मी तुमचा इसीकृषी AI शेती सल्लागार आहे. मी तुमच्या शेताचे हवामान आणि पिकांची माहिती घेतली आहे. आज मी तुम्हाला कशी मदत करू?`,
    placeholder: "किडी, रोग, खते, सिंचन किंवा बाजारभावाबाबत कोणताही प्रश्न विचारा...",
    suggestionsLabel: "सुझाव:",
    prompts: [
      "माझ्या टोमॅटो पिकाची पाने पिवळी पडत आहेत.",
      "उद्या पावसाचा अंदाज आहे. सिंचनाचे नियोजन कसे करावे?",
      "पांढऱ्या माशीसारख्या रसशोषक किडींसाठी सर्वोत्तम सेंद्रिय उपाय कोणता?",
      "मका पिकासाठी N-P-K खताचे योग्य प्रमाण काय आहे?",
      "बाजारपेठेत चांगला भाव मिळवण्यासाठी पडताळणीकृत विक्रेता कसे बनावे?"
    ]
  },
  gu: {
    welcome: (name) => `નમસ્તે ${name}! હું તમારો ઇસીકૃષિ AI કૃષિ સલાહકાર છું. તમારા ખેતરનું હવામાન અને પાકની વિગતો સમન્વયિત થઈ ગઈ છે. આજે હું તમારી કેવી રીતે મદદ કરી શકું?`,
    placeholder: "જીવાત, રોગ, ખાતર, પિયત અથવા બજારભાવ વિશે પૂછો...",
    suggestionsLabel: "સૂચનો:",
    prompts: [
      "મારા ટામેટાના પાકમાં પાંદડા પીળા પડી રહ્યા છે.",
      "આવતીકાલે વરસાદની આગાહી છે. પિયતનું આયોજન કેવી રીતે કરવું?",
      "સફેદ માખી જેવી જીવાતો માટે શ્રેષ્ઠ જૈવિક ઉપાય કયો છે?",
      "મકાઈના પાક માટે ભલામણ કરેલ N-P-K ખાતરનું સમયપત્રક શું છે?",
      "માર્કેટપ્લેસમાં વધુ સારા ભાવ મેળવવા માટે ચકાસાયેલ વિક્રેતા કેવી રીતે બનવું?"
    ]
  },
  pa: {
    welcome: (name) => `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name}! ਮੈਂ ਤੁਹਾਡਾ ਈਸੀਕ੍ਰਿਸ਼ੀ AI ਖੇਤੀਬਾੜੀ ਸਲਾਹਕਾਰ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੇ ਖੇਤ ਦੇ ਮੌਸਮ ਅਤੇ ਫਸਲਾਂ ਦੇ ਵੇਰਵਿਆਂ ਨੂੰ ਸਿੰਕ ਕਰ ਲਿਆ ਹੈ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?`,
    placeholder: "ਕੀੜੇ, ਬਿਮਾਰੀਆਂ, ਖਾਦਾਂ, ਸਿੰਚਾਈ ਜਾਂ ਮੰਡੀ ਦੇ ਭਾਅ ਬਾਰੇ ਪੁੱਛੋ...",
    suggestionsLabel: "ਸੁਝਾਅ:",
    prompts: [
      "ਮੇਰੀ ਟਮਾਟਰ ਦੀ ਫਸਲ ਦੇ ਪੱਤੇ ਪੀਲੇ ਹੋ ਰਹੇ ਹਨ।",
      "ਕੱਲ੍ਹ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਸਿੰਚਾਈ ਦਾ ਪ੍ਰਬੰਧ ਕਿਵੇਂ ਕਰੀਏ?",
      "ਚਿੱਟੀ ਮੱਖੀ ਵਰਗੇ ਕੀੜਿਆਂ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਜੈਵਿਕ ਇਲਾਜ ਕੀ ਹੈ?",
      "ਮੱਕੀ ਦੀ ਫਸਲ ਲਈ ਸਿਫ਼ਾਰਸ਼ ਕੀਤੀ N-P-K ਖਾਦ ਦਾ ਸਮਾਂ ਕੀ ਹੈ?",
      "ਮੰਡੀ ਵਿੱਚ ਵਧੀਆ ਭਾਅ ਲੈਣ ਲਈ ਤਸਦੀਕਸ਼ੁਦਾ ਵਿਕਰੇਤਾ ਕਿਵੇਂ ਬਣੀਏ?"
    ]
  },
  bn: {
    welcome: (name) => `নমস্কার ${name}! আমি আপনার ইসি কৃষি AI কৃষি উপদেষ্টা। আমি আপনার খামারের বর্তমান আবহাওয়া এবং ফসলের তথ্য সংযুক্ত করেছি। আজ আমি কীভাবে আপনাকে সাহায্য করতে পারি?`,
    placeholder: "কীটপতঙ্গ, সার, সেচ বা বাজার দর সম্পর্কে যে কোনও প্রশ্ন জিজ্ঞাসা করুন...",
    suggestionsLabel: "পরামর্শ:",
    prompts: [
      "আমার টমেটো ফসলের পাতা হলুদ হয়ে যাচ্ছে।",
      "আগামীকাল বৃষ্টির পূর্বাভাস রয়েছে। সেচ কীভাবে সমন্বয় করব?",
      "সাদা মাছির মতো পোকা দমনের জন্য সেরা জৈব প্রতিকার কী?",
      "ভুট্টা ফসলের জন্য প্রস্তাবিত N-P-K সারের সময়সূচী কী?",
      "মার্কেটপ্লেসে ভালো দাম পেতে কীভাবে যাচাইকৃত বিক্রেতা হবেন?"
    ]
  }
};

// Simple markdown renderer for Gemini agricultural advisory responses
function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### '))
      return <div key={i} className="font-extrabold text-forest-800 text-xs mt-3 mb-1 border-b border-forest-100 pb-1">{parseInline(line.slice(4))}</div>;
    if (line.startsWith('## '))
      return <div key={i} className="font-extrabold text-slate-900 text-sm mt-3 mb-1">{parseInline(line.slice(3))}</div>;
    if (line.startsWith('- ') || line.startsWith('* '))
      return <div key={i} className="flex items-start gap-1.5 ml-2"><span className="text-forest-500 mt-0.5 shrink-0">•</span><span>{parseInline(line.slice(2))}</span></div>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <div key={i}>{parseInline(line)}</div>;
  });
}

export default function AssistantPage() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const selectedLanguage = language || 'en';

  const currentLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
  const langStrings = LOCALIZED_DATA[selectedLanguage] || LOCALIZED_DATA.en;

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: langStrings.welcome(user?.full_name?.split(' ')[0] || 'Farmer'),
      citations: ['[ESYKRUSHI System Extension Guide]'],
      is_grounded: true,
      provider: `EsyKrushi Agronomic Knowledge Engine (${currentLangMeta.name} - ${currentLangMeta.native})`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [farmContext, setFarmContext] = useState(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
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

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setIsLangMenuOpen(false);

    const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
    const targetStrings = LOCALIZED_DATA[langCode] || LOCALIZED_DATA.en;

    // Add a system welcome update in newly selected language
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: targetStrings.welcome(user?.full_name?.split(' ')[0] || 'Farmer'),
        citations: ['[ESYKRUSHI Multilingual Extension System]'],
        is_grounded: true,
        provider: `Language switched to ${targetLangMeta.name} (${targetLangMeta.native})`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const [conversationId, setConversationId] = useState(null);

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
      const res = await aiService.chat(text, {
        ...(farmContext || {}),
        language: selectedLanguage,
        conversation_id: conversationId
      });

      if (res.success) {
        if (res.data.conversation_id) {
          setConversationId(res.data.conversation_id);
        }
        const assistantMessage = {
          role: 'assistant',
          text: res.data.reply,
          citations: res.data.citations || [],
          is_grounded: res.data.is_grounded,
          provider: res.data.provider,
          language: res.data.language,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errMsg = err?.message || 'The AI consultation service is momentarily busy. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: errMsg,
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
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-forest-600" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              AI Agricultural Assistant
            </h1>
            <span className="bg-forest-50 text-forest-700 border border-forest-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
              RAG + Multilingual
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Context-aware crop diagnostics grounded in extension documentation with verified source citations.
          </p>
        </div>

        {/* Right Controls: Language Selector & Live Farm Context */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-2 rounded-2xl shadow-2xs transition"
              title="Select Agricultural Advisory Language"
            >
              <Languages className="w-4 h-4 text-forest-600" />
              <span>{currentLangMeta.flag} {currentLangMeta.native}</span>
              <span className="text-[10px] text-slate-400 font-normal">({currentLangMeta.name})</span>
            </button>

            {isLangMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Select Advisory Language
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = lang.code === selectedLanguage;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition ${
                            isSelected
                              ? 'bg-forest-50 text-forest-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span className="font-medium text-slate-900">{lang.native}</span>
                            <span className="text-[11px] text-slate-400">({lang.name})</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-forest-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Farm Context Indicator */}
          {farmContext && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {farmContext.current_crop && (
                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-forest-800">
                  <Sprout className="w-3.5 h-3.5 text-forest-600" /> {farmContext.current_crop}
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
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 text-xs leading-relaxed space-y-2.5 ${
                  isUser
                    ? 'bg-forest-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                }`}
              >
                <div className="space-y-0.5 leading-relaxed">
                  {isUser ? m.text : renderMarkdown(m.text)}
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
                  className={`text-[10px] text-right flex items-center justify-end gap-1.5 ${
                    isUser ? 'text-forest-200' : 'text-slate-400'
                  }`}
                >
                  <span>{m.created_at}</span>
                  {!isUser && m.provider && (
                    <>
                      <span>•</span>
                      <span>{m.provider}</span>
                    </>
                  )}
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
              <span>
                Querying agricultural RAG knowledge base & formulating advice in {currentLangMeta.name} ({currentLangMeta.native})...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar Localized */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> {langStrings.suggestionsLabel}
        </span>
        {langStrings.prompts.map((prompt, pIdx) => (
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
          placeholder={langStrings.placeholder}
          className="flex-1 px-4 py-2 bg-transparent text-xs sm:text-sm focus:outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim() || loading}
          className="p-2.5 bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1"
          title="Send Query"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
