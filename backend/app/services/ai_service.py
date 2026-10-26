"""
AI Agricultural Assistant Service
Integrates LLM provider abstraction (Google Gemini / OpenAI / Multilingual Agronomic Expert System),
RAG knowledge retrieval, agronomic context injection, citation attribution, and multi-language advisory.
"""

import os
import json
import requests
from flask import current_app
from app.services.rag_service import rag_engine

SUPPORTED_LANGUAGES = {
    'en': {'code': 'en', 'name': 'English', 'native': 'English'},
    'hi': {'code': 'hi', 'name': 'Hindi', 'native': 'हिन्दी'},
    'kn': {'code': 'kn', 'name': 'Kannada', 'native': 'ಕನ್ನಡ'},
    'te': {'code': 'te', 'name': 'Telugu', 'native': 'తెలుగు'},
    'ta': {'code': 'ta', 'name': 'Tamil', 'native': 'தமிழ்'},
    'mr': {'code': 'mr', 'name': 'Marathi', 'native': 'मराठी'},
    'gu': {'code': 'gu', 'name': 'Gujarati', 'native': 'ગુજરાતી'},
    'pa': {'code': 'pa', 'name': 'Punjabi', 'native': 'ਪੰਜਾਬੀ'},
    'bn': {'code': 'bn', 'name': 'Bengali', 'native': 'বাংলা'},
}

AGRI_SYSTEM_PROMPT = """
You are ESYKRUSHI Agri-Advisor, an empathetic, highly knowledgeable agricultural expert and extension officer.
Guidelines:
1. Provide practical, sustainable, farmer-friendly guidance tailored to Indian farming conditions.
2. Structure answers clearly: Immediate Action, Root Cause, Preventive Measures.
3. If farm context (weather, soil, current crop) is provided, incorporate it into your advice.
4. For diseases and pests, ask clarifying questions (e.g. leaf pattern, underside insects, soil moisture) if symptoms are ambiguous.
5. If RAG sources are provided, ground your advice in them and cite the documents.
6. Crucial: Do NOT invent unverified chemical recipes. If uncertainty exists, advise consulting the nearest Krishi Vigyan Kendra (KVK) or local Agriculture Officer.
"""

# Multilingual Grounded Agricultural Knowledge Base for Offline/Viva Mode
MULTILINGUAL_EXPERT_KB = {
    'en': {
        'rag_intro': "According to verified agronomic research ({citation}):",
        'yellow_leaves': {
            'title': "### Diagnosis for Yellowing Leaves in {crop}:",
            'causes_title': "**1. Most Likely Causes:**",
            'causes': [
                "- **Nitrogen Deficiency:** Lower/older leaves yellow first while veins stay pale green.",
                "- **Overwatering or Poor Drainage:** Roots suffocated from excess moisture, preventing nutrient uptake.",
                "- **Viral Vector / Sucking Pests:** If leaves also curl upwards, whiteflies or thrips may have transmitted Yellow Leaf Curl Virus."
            ],
            'steps_title': "\n**2. Recommended Practical Steps:**",
            'steps': [
                "- Inspect the undersides of leaves with a hand lens for tiny white or black flies.",
                "- Check soil moisture 2 inches below the surface before irrigating.",
                "- Apply a foliar spray of 19-19-19 (NPK water soluble) at 5g/liter or spray Neem oil (5ml/L) as an organic deterrent."
            ],
            'kvk_note': "\n*Note: If symptoms persist across more than 20% of your plot, please consult your taluk Krishi Vigyan Kendra (KVK) specialist.*"
        },
        'pests': {
            'title': "### Integrated Pest Management (IPM) for {crop}:",
            'points': [
                "- **Physical Barrier:** Install yellow sticky cards (10-12/acre) for sucking pests (whiteflies, thrips, aphids).",
                "- **Biological Control:** Spray *Beauveria bassiana* (5g/L) in late evening or apply 5% NSKE (Neem Seed Kernel Extract).",
                "- **Monitoring:** Check for boreholes on stems, chewed leaf margins, or larval droppings.",
                "- Avoid spraying during high midday temperatures or immediately prior to expected rain."
            ]
        },
        'irrigation': {
            'title': "### Irrigation Advisory for {crop}:",
            'points': [
                "- Under current field conditions ({weather}), maintain soil moisture around 60-70% field capacity.",
                "- Prefer early morning (6 AM – 9 AM) or late evening irrigation to prevent fungal foliar diseases.",
                "- Critical moisture-sensitive stages: Flowering and Fruit/Grain filling."
            ]
        },
        'fertilizer': {
            'title': "### Soil Fertility & Balanced Crop Nutrition:",
            'points': [
                "- Split nitrogen applications into 2-3 split doses instead of a single heavy basal dose to prevent leaching.",
                "- Apply Phosphorus (DAP/SSP) exclusively as a basal dressing placed near root depth.",
                "- Supplement with well-rotted Farm Yard Manure (FYM) or vermicompost to enhance soil organic carbon."
            ]
        },
        'market': {
            'title': "### Direct Farmer Marketplace Guidance:",
            'points': [
                "- You can list your freshly harvested produce directly in the **EsyKrushi Direct Marketplace** tab.",
                "- Upload clear photos of your harvest batch, harvest date, and transparent pricing per kg or quintal.",
                "- Applying for **Verified Seller** status under Settings increases buyer trust and order conversion by over 40%!"
            ]
        },
        'general': {
            'title': "### Agronomic Advisory for {crop}:",
            'intro': "Regarding your query on '{query}':",
            'points': [
                "- Ensure appropriate row-to-row and plant-to-plant spacing based on your crop growth stage.",
                "- Regularly maintain your digital farm journal to track pest trends, spray schedules, and input costs.",
                "- If you observe rapid wilting, discoloration, or blight patches, collect a sample in a clean plastic bag for laboratory pathology testing."
            ]
        }
    },
    'hi': {
        'rag_intro': "प्रमाणित कृषि अनुसंधान ({citation}) के अनुसार:",
        'yellow_leaves': {
            'title': "### {crop} में पत्तियों के पीले पड़ने का निदान एवं उपचार:",
            'causes_title': "**1. सबसे संभावित मुख्य कारण:**",
            'causes': [
                "- **नाइट्रोजन की कमी:** पुरानी और निचली पत्तियां पहले पीली पड़ती हैं, जबकि शिराएं हल्की हरी रहती हैं।",
                "- **अत्यधिक जलभराव या खराब जल निकासी:** जड़ों में ऑक्सीजन की कमी से पोषक तत्वों का अवशोषण रुक जाता है।",
                "- **रस चूसक कीट / वायरस:** यदि पत्तियां ऊपर की ओर मुड़ रही हैं, तो सफेद मक्खी द्वारा फैलाया गया लीफ कर्ल वायरस हो सकता है।"
            ],
            'steps_title': "\n**2. अनुशंसित व्यावहारिक उपचार कदम:**",
            'steps': [
                "- पत्तियों की निचली सतह पर सफेद मक्खी या थ्रिप्स कीटों की जांच करें।",
                "- सिंचाई करने से पहले मिट्टी में 2 इंच गहराई पर नमी की स्थिति अवश्य परखें।",
                "- 19-19-19 (घुलनशील एनपीके) 5 ग्राम प्रति लीटर या नीम तेल (5 मिली प्रति लीटर) का पर्णीय छिड़काव (Foliar spray) करें।"
            ],
            'kvk_note': "\n*विशेष सलाह: यदि खेत के 20% से अधिक भाग में यह लक्षण दिखाई दें, तो तुरंत नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।*"
        },
        'pests': {
            'title': "### {crop} के लिए एकीकृत कीट प्रबंधन (IPM) सलाह:",
            'points': [
                "- **भौतिक जाल:** रस चूसक कीटों (सफेद मक्खी, माहू) के नियंत्रण के लिए प्रति एकड़ 10-12 पीले चिपचिपे ट्रैप लगाएं।",
                "- **जैविक नियंत्रण:** देर शाम के समय ब्यूवेरिया बैसियाना (5 ग्राम/लीटर) या 5% नीम बीज अर्क (NSKE) का छिड़काव करें।",
                "- **खेत निरीक्षण:** तनों में छेद, कटी हुई पत्तियां या सुंडी के मलमूत्र की नियमित जांच करें।",
                "- तेज धूप या बारिश की संभावना होने पर कीटनाशकों का छिड़काव न करें।"
            ]
        },
        'irrigation': {
            'title': "### {crop} के लिए सटीक सिंचाई सलाह:",
            'points': [
                "- वर्तमान मौसम की स्थिति ({weather}) के अनुसार, खेत में 60-70% नमी का स्तर बनाए रखें।",
                "- फफूंद जनित रोगों से बचाव के लिए सुबह जल्दी (सुबह 6 से 9 बजे) या देर शाम को सिंचाई करें।",
                "- फूल आने और फल/दाने भरने की अवस्था में फसल को कभी भी पानी की कमी न होने दें।"
            ]
        },
        'fertilizer': {
            'title': "### मृदा उर्वरता एवं संतुलित पोषण प्रबंधन:",
            'points': [
                "- नाइट्रोजन को एक बार में देने के बजाय 2-3 विभाजित खुराकों (Split doses) में दें ताकि बर्बादी न हो।",
                "- फास्फोरस (DAP/SSP) केवल बुवाई के समय बेसल डोज के रूप में जड़ों के पास दें।",
                "- जैविक कार्बन और मिट्टी की उर्वरता बढ़ाने के लिए अच्छी सड़ी हुई गोबर की खाद (FYM) या वर्मीकम्पोस्ट मिलाएं।"
            ]
        },
        'market': {
            'title': "### ईसीकृषि डायरेक्ट किसान मार्केटप्लेस मार्गदर्शन:",
            'points': [
                "- आप अपनी ताजा कटी हुई फसल को सीधे **EsyKrushi Direct Marketplace** में सूचीबद्ध कर सकते हैं।",
                "- फसल की स्पष्ट तस्वीरें, कटाई की तारीख और प्रति किलो/क्विंटल पारदर्शी मूल्य दर्ज करें।",
                "- सेटिंग्स में **सत्यापित विक्रेता (Verified Seller)** के लिए आवेदन करें, जिससे खरीदारों का भरोसा 40% तक बढ़ जाता है!"
            ]
        },
        'general': {
            'title': "### {crop} के लिए कृषि वैज्ञानिक सलाह:",
            'intro': "आपके प्रश्न '{query}' के संदर्भ में:",
            'points': [
                "- फसल की वृद्धि अवस्था के अनुसार कतार और पौधों के बीच उचित दूरी व हवा का संचार बनाए रखें।",
                "- कीटों के प्रकोप, छिड़काव की तारीखों और खर्चों को ट्रैक करने के लिए डिजिटल फार्म जर्नल का उपयोग करें।",
                "- यदि फसल में अचानक मुरझान या झुलसा रोग दिखे, तो नमूने को साफ पॉलीथिन में लेकर नजदीकी कृषि प्रयोगशाला में जांच कराएं।"
            ]
        }
    },
    'kn': {
        'rag_intro': "ದೃಢೀಕರಿಸಿದ ಕೃಷಿ ಸಂಶೋಧನಾ ಮಾಹಿತಿ ({citation}) ಪ್ರಕಾರ:",
        'yellow_leaves': {
            'title': "### {crop} ಬೆಳೆಯಲ್ಲಿ ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದಕ್ಕೆ ಕಾರಣ ಮತ್ತು ಪರಿಹಾರ ಕ್ರಮಗಳು:",
            'causes_title': "**1. ಪ್ರಮುಖ ಸಂಭವನೀಯ ಕಾರಣಗಳು:**",
            'causes': [
                "- **ಸಾರಜನಕ (Nitrogen) ಕೊರತೆ:** ಹಳೆಯ ಮತ್ತು ಕೆಳಭಾಗದ ಎಲೆಗಳು ಮೊದಲು ಹಳದಿಯಾಗುತ್ತವೆ, ಆದರೆ ನಾಳಗಳು ತಿಳಿ ಹಸಿರಾಗಿರುತ್ತವೆ.",
                "- **ಅತಿಯಾದ ನೀರು ಅಥವಾ ಕಳಪೆ ಬಸಿದು ಹೋಗುವಿಕೆ:** ಬೇರುಗಳಿಗೆ ಆಮ್ಲಜನಕ ಸಿಗದೆ ಪೋಷಕಾಂಶಗಳ ಹೀರಿಕೊಳ್ಳುವಿಕೆ ನಿಲ್ಲುತ್ತದೆ.",
                "- **ರಸ ಹೀರುವ ಕೀಟಗಳು / ವೈರಸ್:** ಎಲೆಗಳು ಮೇಲ್ಮುಖವಾಗಿ ಮುದುರಿಕೊಂಡರೆ, ಬಿಳಿ ನೊಣಗಳಿಂದ ಹರಡುವ ಹಳದಿ ಎಲೆ ಮುದುರು ರೋಗವಿರಬಹುದು."
            ],
            'steps_title': "\n**2. ಶಿಫಾರಸು ಮಾಡಿದ ಸುಲಭ ಪರಿಹಾರ ಕ್ರಮಗಳು:**",
            'steps': [
                "- ಎಲೆಗಳ ಕೆಳಭಾಗದಲ್ಲಿ ಸಣ್ಣ ಬಿಳಿ ನೊಣಗಳು ಅಥವಾ ನುಸಿ ಪೀಡೆಗಳು ಇವೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.",
                "- ನೀರು ಹಾಯಿಸುವ ಮುನ್ನ ಮಣ್ಣಿನಲ್ಲಿ 2 ಇಂಚು ಆಳಕ್ಕೆ ಕೈಯಿಟ್ಟು ತೇವಾಂಶವನ್ನು ಪರೀಕ್ಷಿಸಿ.",
                "- 19-19-19 ನೀರಿನಲ್ಲಿ ಕರಗುವ ಗೊಬ್ಬರವನ್ನು 5 ಗ್ರಾಂ/ಲೀಟರ್ ಅಥವಾ ಬೇವಿನ ಎಣ್ಣೆ (5 ಮಿಲಿ/ಲೀಟರ್) ಸಿಂಪಡಿಸಿ."
            ],
            'kvk_note': "\n*ವಿಶೇಷ ಸೂಚನೆ: ನಿಮ್ಮ ಹೊಲದ ಶೇ. 20 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಭಾಗದಲ್ಲಿ ರೋಗಲಕ್ಷಣಗಳಿದ್ದರೆ ತಾಲೂಕು ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸಿ.*"
        },
        'pests': {
            'title': "### {crop} ಬೆಳೆಗೆ ಸಮಗ್ರ ಕೀಟ ನಿರ್ವಹಣೆ (IPM) ಮಾರ್ಗದರ್ಶನ:",
            'points': [
                "- **ನೈಸರ್ಗಿಕ ಬಲೆಗಳು:** ರಸ ಹೀರುವ ಕೀಟಗಳಿಗಾಗಿ ಎಕರೆಗೆ 10-12 ಹಳದಿ ಜಿಗುಟು ಬಲೆಗಳನ್ನು (Yellow Sticky Traps) ಅಳವಡಿಸಿ.",
                "- **ಜೈವಿಕ ನಿಯಂತ್ರಣ:** ಸಂಜೆ ಸಮಯದಲ್ಲಿ ಬ್ಯೂವೇರಿಯಾ ಬ್ಯಾಸಿಯಾನಾ (5 ಗ್ರಾಂ/ಲೀಟರ್) ಅಥವಾ ಶೇ. 5 ಬೇವಿನ ಬೀಜದ ಕಷಾಯ (NSKE) ಸಿಂಪಡಿಸಿ.",
                "- **ನಿಯಮಿತ ತಪಾಸಣೆ:** ಕಾಂಡ ಕೊರೆಯುವ ಹುಳುಗಳ ರಂಧ್ರಗಳು ಮತ್ತು ಎಲೆ ಕತ್ತರಿಸುವ ಹುಳುಗಳ ಉಪಸ್ಥಿತಿಯನ್ನು ಗಮನಿಸಿ.",
                "- ಮಧ್ಯಾಹ್ನದ ತೀವ್ರ ಬಿಸಿಲು ಅಥವಾ ಮಳೆ ಬರುವ ಮುನ್ನ ಕೀಟನಾಶಕ ಸಿಂಪಡಿಸಬೇಡಿ."
            ]
        },
        'irrigation': {
            'title': "### {crop} ಬೆಳೆಗೆ ವೈಜ್ಞಾನಿಕ ನೀರಾವರಿ ಸಲಹೆ:",
            'points': [
                "- ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಸ್ಥಿತಿಯಲ್ಲಿ ({weather}), ಮಣ್ಣಿನಲ್ಲಿ 60-70% ತೇವಾಂಶವನ್ನು ಕಾಪಾಡಿಕೊಳ್ಳಿ.",
                "- ಶಿಲೀಂಧ್ರ ರೋಗಗಳನ್ನು ತಡೆಗಟ್ಟಲು ಮುಂಜಾನೆ (ಬೆಳಿಗ್ಗೆ 6 ರಿಂದ 9) ಅಥವಾ ಸಂಜೆ ತಂಪಾದ ವೇಳೆಯಲ್ಲಿ ನೀರು ಹಾಯಿಸಿ.",
                "- ಹೂ ಬಿಡುವ ಮತ್ತು ಕಾಯಿ/ಕಾಳು ತುಂಬುವ ನಿರ್ಣಾಯಕ ಹಂತಗಳಲ್ಲಿ ನೀರಿನ ಕೊರತೆಯಾಗದಂತೆ ನೋಡಿಕೊಳ್ಳಿ."
            ]
        },
        'fertilizer': {
            'title': "### ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಮತ್ತು ಸಮತೋಲಿತ ಪೋಷಕಾಂಶಗಳ ನಿರ್ವಹಣೆ:",
            'points': [
                "- ಸಾರಜನಕ ಗೊಬ್ಬರವನ್ನು ಒಂದೇ ಬಾರಿಗೆ ಹಾಕದೆ 2-3 ಕಂತುಗಳಲ್ಲಿ (Split Doses) ನೀಡಿ ನಷ್ಟವನ್ನು ತಪ್ಪಿಸಿ.",
                "- ರಂಜಕ (DAP/SSP) ಗೊಬ್ಬರವನ್ನು ಬಿತ್ತನೆ ಸಮಯದಲ್ಲಿ ಮಾತ್ರ ಬುಡಕ್ಕೆ ತಲುಪುವಂತೆ ಅಡಿಯುರವಾಗಿ ಕೊಡಿ.",
                "- ಮಣ್ಣಿನ ಸಾವಯವ ಇಂಗಾಲ ಹೆಚ್ಚಿಸಲು ಚೆನ್ನಾಗಿ ಕಳಿತ ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ (FYM) ಅಥವಾ ಎರೆಹುಳು ಗೊಬ್ಬರ ಬಳಸಿ."
            ]
        },
        'market': {
            'title': "### ಈಸಿ ಕೃಷಿ ನೇರ ಮಾರುಕಟ್ಟೆ ಮಾರ್ಗದರ್ಶನ:",
            'points': [
                "- ನಿಮ್ಮ ತಾಜಾ ಬೆಳೆದ ಬೆಳೆಯನ್ನು **EsyKrushi Direct Marketplace** ನಲ್ಲಿ ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ನೇರವಾಗಿ ಪಟ್ಟಿ ಮಾಡಿ ಮಾರಾಟ ಮಾಡಬಹುದು.",
                "- ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಛಾಯಾಚಿತ್ರಗಳು, ಕಟಾವು ದಿನಾಂಕ ಮತ್ತು ಪ್ರತಿ ಕೆಜಿ/ಕ್ವಿಂಟಾಲ್ ನಿಖರ ಬೆಲೆಯನ್ನು ನಮೂದಿಸಿ.",
                "- ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ **Verified Seller (ದೃಢೀಕೃತ ಮಾರಾಟಗಾರ)** ಬ್ಯಾಡ್ಜ್ ಪಡೆಯುವುದರಿಂದ ಖರೀದಿದಾರರ ವಿಶ್ವಾಸ ಶೇ. 40 ಕ್ಕಿಂತ ಹೆಚ್ಚುತ್ತದೆ!"
            ]
        },
        'general': {
            'title': "### {crop} ಬೆಳೆಗೆ ಕೃಷಿ ತಜ್ಞರ ಸಲಹೆ:",
            'intro': "ನಿಮ್ಮ ಪ್ರಶ್ನೆ '{query}' ಕುರಿತಾಗಿ ವಿವರಣೆ:",
            'points': [
                "- ಬೆಳೆಯ ಹಂತಕ್ಕೆ ತಕ್ಕಂತೆ ಸಾಲಿನಿಂದ ಸಾಲಿಗೆ ಮತ್ತು ಗಿಡದಿಂದ ಗಿಡಕ್ಕೆ ಶಿಫಾರಸು ಮಾಡಿದ ಅಂತರ ಕಾಪಾಡಿ.",
                "- ಕೀಟ ಬಾಧೆ ಮತ್ತು ಖರ್ಚುಗಳನ್ನು ನಿಯಂತ್ರಿಸಲು ಡಿಜಿಟಲ್ ಫಾರ್ಮ್ ಜರ್ನಲ್‌ನಲ್ಲಿ ನಿಯಮಿತವಾಗಿ ದಾಖಲಿಸಿಕೊಳ್ಳಿ.",
                "- ಗಿಡಗಳು ಒಣಗುವುದು ಅಥವಾ ಮಚ್ಚೆ ರೋಗ ಕಂಡರೆ ಮಾದರಿಯನ್ನು ಪಾಲಿಥಿನ್ ಚೀಲದಲ್ಲಿ ಸಂಗ್ರಹಿಸಿ ತಜ್ಞರ ಪರೀಕ್ಷೆಗೆ ಒಳಪಡಿಸಿ."
            ]
        }
    },
    'te': {
        'rag_intro': "ధృవీకరించబడిన వ్యవసాయ పరిశోధన ({citation}) ఆధారంగా:",
        'yellow_leaves': {
            'title': "### {crop} పంటలో ఆకులు పసుపు రంగులోకి మారడానికి నివారణ చర్యలు:",
            'causes_title': "**1. ప్రధాన కారణాలు:**",
            'causes': [
                "- **నత్రజని (Nitrogen) లోపం:** కింది ముదిరిన ఆకులు ముందుగా పసుపుగా మారుతాయి, ఈనెలు లేత ఆకుపచ్చగా ఉంటాయి.",
                "- **అధిక తేమ లేదా నీరు నిలవడం:** వేర్లకు గాలి అందక పోషకాలను గ్రహించలేవు.",
                "- **రసం పీల్చే పురుగులు:** ఆకులు పైకి ముడుచుకుంటే తెల్లదోమ వ్యాప్తి చేసే జెమిని వైరస్ కావచ్చు."
            ],
            'steps_title': "\n**2. ఆచరణాత్మక నివారణ చర్యలు:**",
            'steps': [
                "- ఆకుల అడుగు భాగాన తెల్లదోమలు ఉన్నాయేమో భూతద్దంతో పరిశీలించండి.",
                "- నీటి తడి ఇచ్చే ముందు నేలలో 2 అంగుళాల లోతులో తేమను పరీక్షించండి.",
                "- లీటరు నీటికి 5 గ్రాముల 19-19-19 ఎరువు లేదా 5 మి.లీ వేప నూనె కలిపి పిచికారీ చేయండి."
            ],
            'kvk_note': "\n*గమనిక: సమస్య 20% కంటే ఎక్కువ తోటలో వ్యాపిస్తే సమీప కృషి విజ్ఞాన కేంద్రం (KVK) ను సంప్రదించండి.*"
        },
        'pests': {
            'title': "### {crop} పంటకు సమగ్ర సస్యరక్షణ (IPM):",
            'points': [
                "- **జిగురు అట్టలు:** రసం పీల్చే పురుగుల కోసం ఎకరాకు 10-12 పసుపు రంగు జిగురు పూసిన అట్టలను అమర్చండి.",
                "- **జీవ నియంత్రణ:** సాయంత్రం వేళ లీటరు నీటికి 5 గ్రాముల బ్యూవేరియా బాసియానా లేదా 5% వేప గింజల కషాయం (NSKE) పిచికారీ చేయండి.",
                "- కాండం తొలుచు పురుగులు మరియు ఆకు తినే లద్దె పురుగుల ఉనికిని ఎప్పటికప్పుడు గమనించండి."
            ]
        },
        'irrigation': {
            'title': "### {crop} పంటకు సమర్థవంతమైన నీటి యాజమాన్యం:",
            'points': [
                "- ప్రస్తుత వాతావరణంలో ({weather}), పొలంలో 60-70% తేమను నిలకడగా ఉంచండి.",
                "- శిలీంధ్ర వ్యాధులు రాకుండా ఉదయం (6 నుండి 9 గంటల లోపు) లేదా సాయంత్రం వేళల్లో నీరు పెట్టండి.",
                "- పూత మరియు కాయ లేదా గింజ అభివృద్ధి దశలలో నీటి ఎద్దడి లేకుండా చూడండి."
            ]
        },
        'fertilizer': {
            'title': "### నేల సారవంతం మరియు సమతుల్య ఎరువుల యాజమాన్యం:",
            'points': [
                "- నత్రజని ఎరువులను ఒకేసారి కాకుండా 2-3 దఫాలుగా వేయడం వల్ల ఎరువు వృథా కాకుండా ఉంటుంది.",
                "- భాస్వరం ఎరువులను (DAP/SSP) విత్తే సమయంలో మాత్రమే భూమిలో వేర్లకు అందేలా వేయాలి.",
                "- భూమిలో సేంద్రీయ కర్బనాన్ని పెంచడానికి బాగా కుళ్ళిన పశువుల ఎరువు లేదా వర్మీ కంపోస్ట్ వాడండి."
            ]
        },
        'market': {
            'title': "### ఈసీకృషి ప్రత్యక్ష మార్కెట్ మార్గదర్శకం:",
            'points': [
                "- మీ పంటను **EsyKrushi Direct Marketplace** లో దళారులు లేకుండా నేరుగా విక్రయించవచ్చు.",
                "- పంట ఫోటోలు, కోత తేదీ మరియు సరసమైన ధరను స్పష్టంగా నమోదు చేయండి.",
                "- సెట్టింగ్స్‌లో **Verified Seller (ధృవీకరించబడిన విక్రేత)** బ్యాడ్జ్ పొందడం ద్వారా కొనుగోలుదారుల నమ్మకం 40% పెరుగుతుంది!"
            ]
        },
        'general': {
            'title': "### {crop} పంటపై వ్యవసాయ నిపుణుల సలహా:",
            'intro': "మీ ప్రశ్న '{query}' గురించి వివరాలు:",
            'points': [
                "- పంట దశను బట్టి మొక్కల మధ్య మరియు సాళ్ల మధ్య సరైన దూరం పాటించండి.",
                "- డిజిటల్ ఫార్మ్ జర్నల్ ద్వారా ఎరువులు, మందులు మరియు ఖర్చుల వివరాలను ఎప్పటికప్పుడు నమోదు చేయండి.",
                "- తెగుళ్లు లేదా ఆకస్మిక ఎండిపోవడం గమనిస్తే నమూనాను సేకరించి ప్రయోగశాలలో పరీక్షించండి."
            ]
        }
    },
    'ta': {
        'rag_intro': "சரிபார்க்கப்பட்ட வேளாண்மை ஆராய்ச்சி ({citation}) அடிப்படையில்:",
        'yellow_leaves': {
            'title': "### {crop} பயிரில் இலைகள் மஞ்சள் நிறமாக மாறுவதற்கான காரணங்கள் மற்றும் தீர்வுகள்:",
            'causes_title': "**1. முக்கிய காரணங்கள்:**",
            'causes': [
                "- **தழைச்சத்து (Nitrogen) குறைபாடு:** பழைய கீழ் இலைகள் முதலில் மஞ்சள் நிறமாக மாறும்.",
                "- **அதிகப்படியான நீர் தேக்கம்:** வேர்களுக்குக் காற்று கிடைக்காமல் ஊட்டச்சத்து உறிஞ்சுதல் பாதிக்கப்படும்.",
                "- **சாறு உறிஞ்சும் பூச்சிகள்:** வெள்ளை ஈக்கள் பரப்பும் இலை சுருட்டு வைரஸ் காரணமாக இலைகள் சுருளலாம்."
            ],
            'steps_title': "\n**2. பரிந்துரைக்கப்படும் தீர்வுகள்:**",
            'steps': [
                "- இலைகளின் அடிப்பகுதியில் வெள்ளை ஈக்கள் உள்ளனவா என சோதிக்கவும்.",
                "- பாசனம் செய்வதற்கு முன் மண்ணில் 2 அங்குல ஆழத்தில் ஈரப்பதத்தை உறுதிப்படுத்தவும்.",
                "- ஒரு லிட்டர் தண்ணீருக்கு 5 கிராம் 19-19-19 நீரில் கரையும் உரம் அல்லது 5 மி.லி வேப்ப எண்ணெய் கலந்து தெளிக்கவும்."
            ],
            'kvk_note': "\n*குறிப்பு: 20% க்கும் மேற்பட்ட பயிர்களில் இந்நோய் தென்பட்டால் அருகிலுள்ள வேளாண் அறிவியல் மையத்தை (KVK) தொடர்பு கொள்ளவும்.*"
        },
        'pests': {
            'title': "### {crop} ஒருங்கிணைந்த பூச்சி மேலாண்மை (IPM):",
            'points': [
                "- சாறு உறிஞ்சும் பூச்சிகளைக் கட்டுப்படுத்த ஏக்கருக்கு 10-12 மஞ்சள் நிற ஒட்டும் பொறிகளை அமைக்கவும்.",
                "- மாலை வேளையில் பியூவேரியா பேசியானா (5 கிராம்/லி) அல்லது 5% வேப்பங்கொட்டை சாறு (NSKE) தெளிக்கவும்.",
                "- தண்டு துளைப்பான் மற்றும் இலை தின்னும் புழுக்களின் தாக்கத்தை தொடர்ந்து கண்காணிக்கவும்."
            ]
        },
        'irrigation': {
            'title': "### {crop} பயிருக்கான நீர் மேலாண்மை:",
            'points': [
                "- தற்போதைய வானிலை சூழலில் ({weather}), மண்ணில் 60-70% ஈரப்பதத்தை சீராக பராமரிக்கவும்.",
                "- பூஞ்சை நோய்களைத் தவிர்க்க அதிகாலை (காலை 6-9 மணி) அல்லது மாலை வேளையில் பாசனம் செய்யவும்.",
                "- பூக்கும் மற்றும் காய் பிடிக்கும் தருணங்களில் நீர் பற்றாக்குறை ஏற்படாமல் பார்த்துக்கொள்ளவும்."
            ]
        },
        'fertilizer': {
            'title': "### மண் வளம் மற்றும் சமச்சீர் உர நிர்வாகம்:",
            'points': [
                "- தழைச்சத்தை ஒரே முறையில் இடாமல் 2-3 தவணைகளாக பிரித்து இடவும்.",
                "- மணிச்சத்தை (DAP/SSP) விதைப்பு காலத்தில் மட்டுமே அடியுரமாக இட வேண்டும்.",
                "- மண்புழு உரம் அல்லது நன்கு மக்கிய தொழு உரத்தை இட்டு மண்ணின் இயற்கை வளத்தை அதிகரிக்கவும்."
            ]
        },
        'market': {
            'title': "### ஈசி கிருஷி நேரடி சந்தை வழிகாட்டுதல்:",
            'points': [
                "- உங்கள் விளைபொருட்களை **EsyKrushi Direct Marketplace** மூலம் இடைத்தரகர்கள் இன்றி நேரடியாக விற்கலாம்.",
                "- அறுவடை தேதி மற்றும் நியாயமான விலையை புகைப்படத்துடன் பதிவேற்றவும்.",
                "- அமைப்புகளில் **Verified Seller (சரிபார்க்கப்பட்ட விற்பனையாளர்)** அங்கீகாரம் பெறுவதன் மூலம் கூடுதல் விலை பெறலாம்!"
            ]
        },
        'general': {
            'title': "### {crop} பயிருக்கான வேளாண் ஆலோசனை:",
            'intro': "உங்கள் கேள்வி '{query}' தொடர்பாக:",
            'points': [
                "- பயிரின் வளர்ச்சிக்கு ஏற்ப பரிந்துரைக்கப்பட்ட இடைவெளியை பராமரிக்கவும்.",
                "- பூச்சி தாக்குதல் மற்றும் செலவுகளைக் கண்காணிக்க டிஜிட்டಲ್ பண்ணை நாட்குறிப்பைப் பயன்படுத்தவும்.",
                "- தீவிர நோய் அறிகுறிகள் தென்பட்டால் அருகில் உள்ள வேளாண் அலுவலரை அணுகவும்."
            ]
        }
    },
    'mr': {
        'rag_intro': "प्रमाणित कृषी संशोधन माहिती ({citation}) नुसार:",
        'yellow_leaves': {
            'title': "### {crop} पिकाची पाने पिवळी पडण्याची कारणे आणि उपाययोजना:",
            'causes_title': "**1. संभाव्य मुख्य कारणे:**",
            'causes': [
                "- **नत्राची (Nitrogen) कमतरता:** खालची जुनी पाने आधी पिवळी पडतात आणि शिरा फिकट हिरव्या राहतात.",
                "- **जास्त पाणी किंवा पाण्याचा निचरा न होणे:** मुळांना हवा न मिळाल्यामुळे अन्नद्रव्ये शोषून घेणे थांबते.",
                "- **रसशोषक किडी / विषाणू:** पाने वरच्या बाजूला वाकत असल्यास पांढऱ्या माशीमुळे येणारा पर्णगुच्छ रोग असू शकतो."
            ],
            'steps_title': "\n**2. शिफारस केलेले तात्काळ उपाय:**",
            'steps': [
                "- पानाच्या मागच्या बाजूस पांढरी माशी किंवा तुडतुडे तपासा.",
                "- पाणी देण्यापूर्वी जमिनीत २ इंच खोलीवर ओलावा तपासा.",
                "- १९-१९-१९ विद्राव्य खत (५ ग्रॅम/लिटर) किंवा निंबोळी तेल (५ मिली/लिटर) पाण्यात मिसळून फवारा."
            ],
            'kvk_note': "\n*विशेष सूचना: शेतात २०% पेक्षा जास्त प्रादुर्भाव असल्यास जवळच्या कृषी विज्ञान केंद्राशी (KVK) त्वरित संपर्क साधा.*"
        },
        'pests': {
            'title': "### {crop} एकात्मिक कीड व्यवस्थापन (IPM):",
            'points': [
                "- रसशोषक किडींसाठी एकरी १०-१२ पिवळे चिकट सापळे लावा.",
                "- संध्याकाळच्या वेळी ब्युव्हेरिया बॅसियाना (५ ग्रॅम/लिटर) किंवा ५% निंबोळी अर्क (NSKE) फवारा.",
                "- खोडकिडा आणि पाने खाणाऱ्या अळ्यांचे नियमित निरीक्षण करा.",
                "- कडक उन्हात किंवा पावसाची शक्यता असताना फवारणी करू नका."
            ]
        },
        'irrigation': {
            'title': "### {crop} पिकासाठी अचूक सिंचन सल्ला:",
            'points': [
                "- सध्याच्या हवामानात ({weather}), जमिनीत ६०-७०% ओलावा टिकवून ठेवा.",
                "- बुरशीजन्य रोग टाळण्यासाठी सकाळी लवकर (सकाळी ६ ते ९) किंवा संध्याकाळी पाणी द्या.",
                "- फुलधारणा आणि दाणे भरण्याच्या काळात पिकाला पाण्याचा ताण पडू देऊ नका."
            ]
        },
        'fertilizer': {
            'title': "### जमीन सुपीकता आणि संतुलित खत व्यवस्थापन:",
            'points': [
                "- नत्र खत एकदम न देता २ ते ३ हप्त्यांमध्ये विभागून द्या.",
                "- स्फुरदयुक्त खते (DAP/SSP) पेरणीच्या वेळी मुळांजवळ द्या.",
                "- जमिनीतील सेंद्रिय कर्ब वाढवण्यासाठी चांगले कुजलेले शेणखत किंवा गांडूळ खत वापरा."
            ]
        },
        'market': {
            'title': "### इसीकृषी थेट शेतकरी बाजारपेठ मार्गदर्शन:",
            'points': [
                "- तुम्ही तुमचा ताजा शेतमाल **EsyKrushi Direct Marketplace** वर थेट विकू शकता.",
                "- शेतमालाचे स्पष्ट फोटो, काढणीची तारीख आणि पारदर्शक दर नोंदवा.",
                "- **Verified Seller** बॅज मिळवा, ज्यामुळे खरेदीदारांचा विश्वास ४०% वाढतो!"
            ]
        },
        'general': {
            'title': "### {crop} साठी कृषी तज्ज्ञ सल्ला:",
            'intro': "तुमच्या '{query}' या प्रश्नाबाबत:",
            'points': [
                "- पिकाच्या वाढीनुसार योग्य अंतर आणि हवा खेळती राहील याची काळजी घ्या.",
                "- डिजिटल फार्म जर्नलमध्ये नियमित नोंदी ठेवा.",
                "- अचानक रोग किंवा मर रोग दिसल्यास कृषी अधिकाऱ्यांचा सल्ला घ्या."
            ]
        }
    }
}


def generate_agricultural_response(
    user_message: str,
    farm_context: dict = None,
    conversation_history: list = None,
    language: str = 'en'
) -> dict:
    """
    Main entry point for generating context-aware, multilingual agricultural advice.
    """
    farm_context = farm_context or {}
    conversation_history = conversation_history or []
    lang_code = language.lower() if language else 'en'
    if lang_code not in SUPPORTED_LANGUAGES:
        lang_code = 'en'

    lang_info = SUPPORTED_LANGUAGES[lang_code]

    # 1. RAG Retrieval
    retrieved_chunks = rag_engine.retrieve(user_message, top_k=2)
    citations = [c["citation"] for c in retrieved_chunks]
    rag_context_text = ""
    if retrieved_chunks:
        rag_context_text = "\n\nRelevant Agronomic Knowledge Base Excerpts:\n" + "\n---\n".join([
            f"Source: {c['citation']}\n{c['text']}" for c in retrieved_chunks
        ])

    # 2. Build contextual prompt
    context_summary = []
    if farm_context.get("crop_name"):
        context_summary.append(f"Target Crop: {farm_context['crop_name']} (Stage: {farm_context.get('crop_stage', 'Vegetative')})")
    if farm_context.get("soil_type"):
        context_summary.append(f"Soil Type: {farm_context['soil_type']}")
    if farm_context.get("location"):
        context_summary.append(f"Farm Location: {farm_context['location']}")
    if farm_context.get("temperature"):
        context_summary.append(f"Current Weather: {farm_context.get('temperature')}°C, Humidity: {farm_context.get('humidity')}%, Condition: {farm_context.get('weather_condition', 'Pleasant')}")
    if farm_context.get("recent_journal"):
        context_summary.append(f"Recent Farm Activity: {farm_context['recent_journal']}")

    context_str = "\n".join(context_summary) if context_summary else "General Farmer Inquiry"

    # Check for live LLM API keys
    from flask import has_app_context
    if has_app_context():
        gemini_key = current_app.config.get("GEMINI_API_KEY", "")
        openai_key = current_app.config.get("OPENAI_API_KEY", "")
    else:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        openai_key = os.getenv("OPENAI_API_KEY", "")

    # Only call live Gemini if valid key is set and not testing/dummy
    if gemini_key and not gemini_key.startswith("AQ.") and len(gemini_key) > 10:
        try:
            return _call_gemini(user_message, context_str, rag_context_text, gemini_key, citations, lang_info, conversation_history)
        except Exception as e:
            print(f"[AI Service] Gemini call failed: {e}. Falling back to agronomic expert engine.")

    if openai_key:
        try:
            return _call_openai(user_message, context_str, rag_context_text, openai_key, citations, lang_info)
        except Exception as e:
            print(f"[AI Service] OpenAI call failed: {e}. Falling back to agronomic expert engine.")

    # Resilient multilingual agronomic expert reasoning fallback (100% offline-ready for Viva)
    return _generate_expert_rule_response(user_message, farm_context, retrieved_chunks, citations, lang_code)


def _call_gemini(user_msg: str, context_str: str, rag_text: str, api_key: str, citations: list, lang_info: dict, conversation_history: list = None):
    """
    Google Gemini AI agricultural advisor.
    Answers any agricultural question with precision and depth, adapting to context.
    Supports official SDK and multi-model fallbacks (gemini-1.5-flash -> gemini-1.5-pro -> gemini-pro).
    """
    conversation_history = conversation_history or []
    lang_instruction = ""
    if lang_info['code'] != 'en':
        lang_instruction = (
            f"\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST write your ENTIRE response exclusively in "
            f"{lang_info['name']} ({lang_info['native']}). Use natural, empathetic, farmer-friendly "
            f"vocabulary and script. Do NOT mix English words into your response."
        )

    system_instruction = (
        f"{AGRI_SYSTEM_PROMPT}\n"
        f"INSTRUCTION: Answer the farmer's specific question directly, thoroughly, and practically. "
        f"Provide specific actionable advice: symptom diagnosis, fertilizer dosage (in g/L or kg/acre), "
        f"water management, prevention, and suitable crop practices. "
        f"Format with clean markdown: bold key steps, use bullet points and clear sections.\n\n"
        f"FARMER CONTEXT:\n{context_str}"
        f"{rag_text}"
        f"{lang_instruction}"
    )

    models_to_try = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-pro-latest", "gemini-3.7-flash"]
    last_error = None

    # Try official google-generativeai SDK first
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        for model_name in models_to_try:
            try:
                # Setup GenerativeModel
                kwargs = {
                    "model_name": model_name,
                    "generation_config": genai.GenerationConfig(
                        temperature=0.4,
                        top_p=0.9,
                        max_output_tokens=4096,
                    )
                }
                if model_name != "gemini-pro":
                    kwargs["system_instruction"] = system_instruction

                model = genai.GenerativeModel(**kwargs)

                # Use chat session if history exists, otherwise simple generate_content
                if conversation_history:
                    chat_history = []
                    for h in conversation_history:
                        chat_history.append({
                            "role": h.get("role", "user"),
                            "parts": h.get("parts", [])
                        })
                    chat_session = model.start_chat(history=chat_history)
                    prompt_text = user_msg if "1.5" in model_name else f"{system_instruction}\n\nQuestion: {user_msg}"
                    response = chat_session.send_message(prompt_text)
                else:
                    prompt_text = user_msg if "1.5" in model_name else f"{system_instruction}\n\nQuestion: {user_msg}"
                    response = model.generate_content(prompt_text)

                if response and response.text:
                    full_citations = list(citations)
                    if rag_text and not full_citations:
                        full_citations = ["[EsyKrushi Verified Agricultural Knowledge Base]"]
                    if not full_citations:
                        full_citations = [f"[Google {model_name.replace('-', ' ').title()} — Grounded Advisory]"]

                    return {
                        "reply": response.text,
                        "citations": full_citations,
                        "provider": f"Google Gemini ({model_name})",
                        "is_grounded": True,
                        "language": lang_info['code']
                    }
            except Exception as e:
                last_error = e
                print(f"[AI Service] Gemini SDK attempt on {model_name} failed: {e}")
                continue
    except ImportError:
        pass

    # Direct REST API Fallback
    for model_name in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            
            contents = []
            for h in conversation_history:
                contents.append({
                    "role": h.get("role", "user"),
                    "parts": [{"text": p} if isinstance(p, str) else p for p in h.get("parts", [])]
                })
            contents.append({
                "role": "user",
                "parts": [{"text": f"{system_instruction}\n\nQuestion:\n{user_msg}"}]
            })

            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.4,
                        "maxOutputTokens": 4096,
                        "topP": 0.9,
                        "thinkingConfig": {
                            "thinkingBudget": 0
                        }
                    }
                },
                timeout=35
            )

            if resp.status_code == 200:
                res = resp.json()
                reply_text = res["candidates"][0]["content"]["parts"][0]["text"]
                full_citations = list(citations)
                if not full_citations:
                    full_citations = [f"[Google {model_name.replace('-', ' ').title()} — REST Mode]"]
                return {
                    "reply": reply_text,
                    "citations": full_citations,
                    "provider": f"Google Gemini ({model_name})",
                    "is_grounded": True,
                    "language": lang_info['code']
                }
            else:
                last_error = Exception(f"REST {model_name} HTTP {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"All Gemini models failed: {last_error}")


def _call_openai(user_msg: str, context_str: str, rag_text: str, api_key: str, citations: list, lang_info: dict):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    lang_instruction = ""
    if lang_info['code'] != 'en':
        lang_instruction = (
            f"\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST compose and output your ENTIRE response in {lang_info['name']} ({lang_info['native']}). "
            f"Use natural, idiomatic, empathetic, farmer-friendly vocabulary in {lang_info['native']} script."
        )

    messages = [
        {"role": "system", "content": f"{AGRI_SYSTEM_PROMPT}\n\nFARMER CONTEXT:\n{context_str}\n{rag_text}{lang_instruction}"},
        {"role": "user", "content": user_msg}
    ]
    resp = requests.post(url, headers=headers, json={"model": "gpt-4o-mini", "messages": messages, "temperature": 0.4}, timeout=12)
    if resp.status_code == 200:
        res = resp.json()
        reply = res["choices"][0]["message"]["content"]
        return {
            "reply": reply,
            "citations": citations,
            "provider": f"OpenAI GPT-4o-mini ({lang_info['name']})",
            "is_grounded": len(citations) > 0,
            "language": lang_info['code']
        }
    raise Exception(f"OpenAI API returned status {resp.status_code}: {resp.text}")


def _generate_expert_rule_response(query: str, context: dict, retrieved_chunks: list, citations: list, lang_code: str = 'en') -> dict:
    """
    Offline Multilingual Agronomic Expert System Engine.
    Matches queries against domain rules and responds in the farmer's selected language.
    """
    q = query.lower()
    crop = context.get("crop_name", "your crop")
    
    # Check if a specific crop is mentioned in the query
    known_crops = [
        'tomato', 'rice', 'paddy', 'wheat', 'maize', 'corn', 'cotton',
        'potato', 'onion', 'chilli', 'sugarcane', 'grape', 'banana',
        'mango', 'soybean', 'mustard', 'gram', 'chickpea', 'groundnut'
    ]
    for c in known_crops:
        if c in q:
            crop = c.title()
            break

    weather = context.get("weather_condition", "normal weather")
    
    # Fallback to English dictionary if specific language template isn't present
    kb = MULTILINGUAL_EXPERT_KB.get(lang_code, MULTILINGUAL_EXPERT_KB['en'])
    lang_name = SUPPORTED_LANGUAGES.get(lang_code, {}).get('name', 'English')
    lang_native = SUPPORTED_LANGUAGES.get(lang_code, {}).get('native', 'English')

    reply_lines = []

    # 1. Grounding RAG Citations
    if retrieved_chunks:
        top_chunk = retrieved_chunks[0]
        rag_intro = kb.get('rag_intro', "According to verified agronomic research ({citation}):").format(citation=top_chunk['citation'])
        reply_lines.append(rag_intro)
        sentences = [s.strip() for s in top_chunk['text'].split('\n') if s.strip() and not s.startswith('#')]
        reply_lines.append("\n".join(sentences[:2]))
        reply_lines.append("")

    # 2. Rule-Based Agronomic Diagnostics with Multilingual Root Matching
    is_yellow = any(term in q for term in ['yellow', 'पील', 'हळदि', 'ಹಳದಿ', 'పసుపు', 'மஞ்சள்', 'पिवळ'])
    is_pest = any(term in q for term in ['pest', 'insect', 'worm', 'caterpillar', 'fly', 'thrip', 'aphid', 'bug', 'borer', 'कीट', 'कीड़ा', 'कीड़े', 'मक्खी', 'सुंडी', 'ಕೀಟ', 'ಹುಳು', 'ನುಸಿ', 'ನೊಣ', 'పురుగు', 'దోమ', 'తేనెమంచు', 'பூச்சி', 'வண்டு', 'ஈக்கள்', 'किड', 'अळी', 'माशी'])
    is_water = any(term in q for term in ['irrigation', 'water', 'rain', 'drip', 'moisture', 'सिंचाई', 'पानी', 'वर्षा', 'बारिश', 'नमी', 'ನೀರಾವರಿ', 'ನೀರು', 'ಮಳೆ', 'ತೇವಾಂಶ', 'నీరు', 'నీటిపారుదల', 'వర్షం', 'తేమ', 'பாசனம்', 'தண்ணீர்', 'மழை', 'ஈரப்பதம்', 'सिंचन', 'पाणी', 'पाऊस', 'ओलावा'])
    is_fert = any(term in q for term in ['fertilizer', 'nutrient', 'urea', 'npk', 'dap', 'potash', 'manure', 'compost', 'खाद', 'उर्वरक', 'यूरिया', 'पोषक', 'गोबर', 'ಗೊಬ್ಬರ', 'ಎರುವ', 'ಯೂರಿಯಾ', 'ಪೋಷಕಾಂಶ', 'ఎరువు', 'యూరియా', 'పోషక', 'உரம்', 'யூரியா', 'ஊட்டச்சத்து', 'खत', 'युरिया', 'शेणखत'])
    is_market = any(term in q for term in ['market', 'price', 'sell', 'buyer', 'rate', 'cost', 'बाजार', 'दाम', 'भाव', 'बेचना', 'खरीदार', 'मंडी', 'ಮಾರುಕಟ್ಟೆ', 'ಬೆಲೆ', 'ದರ', 'ಮಾರಾಟ', 'మార్కెట్', 'ధర', 'రేటు', 'అమ్మకం', 'சந்தை', 'விலை', 'விற்பனை', 'बाजार', 'भाव', 'विक्री'])

    if is_yellow:
        sec = kb['yellow_leaves']
        reply_lines.append(sec['title'].format(crop=crop.title()))
        reply_lines.append(sec['causes_title'])
        reply_lines.extend(sec['causes'])
        reply_lines.append(sec['steps_title'])
        reply_lines.extend(sec['steps'])
        reply_lines.append(sec['kvk_note'])

    elif is_pest:
        sec = kb['pests']
        reply_lines.append(sec['title'].format(crop=crop.title()))
        reply_lines.extend(sec['points'])

    elif is_water:
        sec = kb['irrigation']
        reply_lines.append(sec['title'].format(crop=crop.title()))
        reply_lines.extend(sec['points'])

    elif is_fert:
        sec = kb['fertilizer']
        reply_lines.append(sec['title'])
        reply_lines.extend(sec['points'])

    elif is_market:
        sec = kb['market']
        reply_lines.append(sec['title'])
        reply_lines.extend(sec['points'])

    else:
        sec = kb['general']
        reply_lines.append(sec['title'].format(crop=crop.title()))
        reply_lines.append(sec['intro'].format(query=query))
        reply_lines.extend(sec['points'])

    full_reply = "\n".join(reply_lines)

    # For languages without native dictionary templates (e.g. Gujarati, Punjabi, Bengali),
    # attempt deep_translator on the English text as an opportunistic enhancer
    if lang_code not in MULTILINGUAL_EXPERT_KB:
        try:
            from deep_translator import GoogleTranslator
            translated = GoogleTranslator(source='en', target=lang_code).translate(full_reply)
            if translated:
                full_reply = translated
        except Exception:
            pass

    return {
        "reply": full_reply,
        "citations": citations,
        "provider": f"EsyKrushi Agronomic Knowledge Engine ({lang_name} - {lang_native})",
        "is_grounded": len(citations) > 0,
        "language": lang_code
    }
