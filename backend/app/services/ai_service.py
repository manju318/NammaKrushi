"""
AI Agricultural Assistant Service
Integrates LLM provider abstraction (Google Gemini / OpenAI / Offline Expert System),
RAG knowledge retrieval, agronomic context injection, and citation attribution.
"""

import os
import json
import requests
from flask import current_app
from app.services.rag_service import rag_engine

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

def generate_agricultural_response(
    user_message: str,
    farm_context: dict = None,
    conversation_history: list = None
) -> dict:
    """
    Main entry point for generating context-aware agricultural advice.
    """
    farm_context = farm_context or {}
    conversation_history = conversation_history or []

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
    gemini_key = current_app.config.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    openai_key = current_app.config.get("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")

    if gemini_key:
        try:
            return _call_gemini(user_message, context_str, rag_context_text, gemini_key, citations)
        except Exception as e:
            print(f"[AI Service] Gemini call failed: {e}. Falling back to agronomic expert engine.")

    if openai_key:
        try:
            return _call_openai(user_message, context_str, rag_context_text, openai_key, citations)
        except Exception as e:
            print(f"[AI Service] OpenAI call failed: {e}. Falling back to agronomic expert engine.")

    # Resilient agronomic expert reasoning fallback (100% offline-ready for Viva)
    return _generate_expert_rule_response(user_message, farm_context, retrieved_chunks, citations)


def _call_gemini(user_msg: str, context_str: str, rag_text: str, api_key: str, citations: list):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    full_prompt = (
        f"{AGRI_SYSTEM_PROMPT}\n\n"
        f"FARMER CONTEXT:\n{context_str}\n\n"
        f"{rag_text}\n\n"
        f"FARMER INQUIRY:\n{user_msg}"
    )
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}]
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=12)
    if resp.status_code == 200:
        res = resp.json()
        reply = res["candidates"][0]["content"]["parts"][0]["text"]
        return {
            "reply": reply,
            "citations": citations,
            "provider": "Google Gemini 1.5 Flash",
            "is_grounded": len(citations) > 0
        }
    raise Exception(f"Gemini API returned status {resp.status_code}: {resp.text}")


def _call_openai(user_msg: str, context_str: str, rag_text: str, api_key: str, citations: list):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": f"{AGRI_SYSTEM_PROMPT}\n\nFARMER CONTEXT:\n{context_str}\n{rag_text}"},
        {"role": "user", "content": user_msg}
    ]
    resp = requests.post(url, headers=headers, json={"model": "gpt-4o-mini", "messages": messages, "temperature": 0.4}, timeout=12)
    if resp.status_code == 200:
        res = resp.json()
        reply = res["choices"][0]["message"]["content"]
        return {
            "reply": reply,
            "citations": citations,
            "provider": "OpenAI GPT-4o-mini",
            "is_grounded": len(citations) > 0
        }
    raise Exception(f"OpenAI API returned status {resp.status_code}: {resp.text}")


def _generate_expert_rule_response(query: str, context: dict, retrieved_chunks: list, citations: list) -> dict:
    """
    Offline Agronomic Expert System Engine.
    Uses pattern matching, plant pathology rules, and retrieved RAG context.
    """
    q = query.lower()
    crop = context.get("crop_name", "your crop")
    weather = context.get("weather_condition", "normal weather")
    
    reply_lines = []

    # If RAG found strong relevant documents, prioritize grounding
    if retrieved_chunks:
        top_chunk = retrieved_chunks[0]
        reply_lines.append(f"According to verified agronomic research ({top_chunk['citation']}):")
        # Extract first 2 sentences from top chunk
        sentences = [s.strip() for s in top_chunk['text'].split('\n') if s.strip() and not s.startswith('#')]
        reply_lines.append("\n".join(sentences[:3]))
        reply_lines.append("")

    # Diagnostic Rules
    if "yellow" in q and ("leaf" in q or "leaves" in q):
        reply_lines.append(f"### Diagnosis for Yellowing Leaves in {crop.title()}:")
        reply_lines.append("**1. Most Likely Causes:**")
        reply_lines.append("- **Nitrogen Deficiency:** Lower/older leaves yellow first while veins stay pale green.")
        reply_lines.append("- **Overwatering or Poor Drainage:** Roots suffocated from excess moisture, preventing nutrient uptake.")
        reply_lines.append("- **Viral Vector / Sucking Pests:** If leaves also curl upwards, whiteflies or thrips may have transmitted Yellow Leaf Curl Virus.")
        reply_lines.append("\n**2. Recommended Practical Steps:**")
        reply_lines.append("- Inspect the undersides of leaves with a hand lens for tiny white or black flies.")
        reply_lines.append("- Check soil moisture 2 inches below the surface before irrigating.")
        reply_lines.append("- Apply a foliar spray of 19-19-19 (NPK water soluble) at 5g/liter or spray Neem oil (5ml/L) as an organic deterrent.")
        reply_lines.append("\n*Note: If symptoms persist across more than 20% of your plot, please consult your taluk Krishi Vigyan Kendra (KVK) specialist.*")

    elif "pest" in q or "insect" in q or "worm" in q or "caterpillar" in q:
        reply_lines.append(f"### Integrated Pest Management (IPM) for {crop.title()}:")
        reply_lines.append("- **Physical Barrier:** Install yellow sticky cards (10-12/acre) for sucking pests.")
        reply_lines.append("- **Biological Control:** Spray *Beauveria bassiana* (5g/L) in the late evening or apply 5% NSKE (Neem Seed Kernel Extract).")
        reply_lines.append("- **Monitoring:** Check for boreholes on stems or chewed leaf margins.")
        reply_lines.append("- Avoid spraying during high midday temperatures or prior to rain.")

    elif "irrigation" in q or "water" in q:
        reply_lines.append(f"### Irrigation Advisory for {crop.title()}:")
        reply_lines.append(f"- Given current field conditions ({weather}), maintain soil moisture around 60-70% field capacity.")
        reply_lines.append("- Prefer early morning (6 AM – 9 AM) or late evening irrigation to prevent fungal foliar diseases.")
        reply_lines.append("- Critical stages requiring uninterrupted moisture: Flowering and Fruit/Grain filling.")

    elif "fertilizer" in q or "nutrient" in q or "urea" in q or "npk" in q:
        reply_lines.append(f"### Soil Fertility & Balanced Nutrition:")
        reply_lines.append("- Split nitrogen applications into 2-3 split doses instead of a single heavy basal dose to avoid leaching.")
        reply_lines.append("- Apply Phosphorus (DAP/SSP) exclusively as a basal dressing placed near root depth.")
        reply_lines.append("- Supplement with well-rotted Farm Yard Manure (FYM) or vermicompost to enhance soil organic carbon and micro-flora.")

    elif "market" in q or "price" in q or "sell" in q:
        reply_lines.append("### Direct Farmer Marketplace Guidance:")
        reply_lines.append("- You can list your freshly harvested produce directly in the **EsyKrushi Direct Marketplace** tab.")
        reply_lines.append("- Upload clear photos of your batch, harvest date, and transparent pricing per kg or quintal.")
        reply_lines.append("- Applying for **Verified Seller** status under Settings increases buyer trust and order conversion by over 40%!")

    else:
        reply_lines.append(f"### Agronomic Advisory for {crop.title()}:")
        reply_lines.append(f"Regarding your query on '{query}':")
        reply_lines.append("- Ensure appropriate spacing and field aeration based on your crop growth stage.")
        reply_lines.append("- Regularly maintain your digital farm journal to track pest trends, spray schedules, and input costs.")
        reply_lines.append("- If you observe rapid wilting, discoloration, or blight patches, collect a sample in a clean plastic bag for laboratory pathology testing.")

    full_reply = "\n".join(reply_lines)
    return {
        "reply": full_reply,
        "citations": citations,
        "provider": "EsyKrushi Agronomic Knowledge Engine (Offline Mode)",
        "is_grounded": len(citations) > 0
    }
