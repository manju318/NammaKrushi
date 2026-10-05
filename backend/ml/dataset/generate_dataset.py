"""
ESYKRUSHI - Agricultural Dataset Generator
Generates a realistic, benchmark-standard dataset of 2,200 agricultural samples
covering 22 distinct crops across India's agro-climatic zones.
Features: N, P, K, temperature, humidity, ph, rainfall, label.
"""

import csv
import random
import os

SEED = 42
random.seed(SEED)

CROPS_CONFIG = {
    "Rice": {"N": (60, 100), "P": (35, 60), "K": (35, 45), "temp": (20.0, 27.5), "humidity": (80.0, 85.0), "ph": (5.0, 7.5), "rainfall": (180.0, 300.0)},
    "Maize": {"N": (60, 100), "P": (35, 60), "K": (15, 25), "temp": (18.0, 29.5), "humidity": (55.0, 75.0), "ph": (5.5, 7.5), "rainfall": (60.0, 110.0)},
    "Chickpea": {"N": (20, 60), "P": (55, 80), "K": (75, 85), "temp": (17.0, 21.0), "humidity": (14.0, 20.0), "ph": (6.0, 8.5), "rainfall": (65.0, 95.0)},
    "Kidneybeans": {"N": (10, 40), "P": (55, 80), "K": (15, 25), "temp": (15.0, 24.0), "humidity": (18.0, 25.0), "ph": (5.5, 6.0), "rainfall": (60.0, 150.0)},
    "Pigeonpeas": {"N": (10, 40), "P": (55, 80), "K": (15, 25), "temp": (25.0, 38.0), "humidity": (45.0, 70.0), "ph": (4.5, 7.5), "rainfall": (90.0, 200.0)},
    "Mothbeans": {"N": (10, 40), "P": (35, 60), "K": (15, 25), "temp": (24.0, 32.0), "humidity": (40.0, 65.0), "ph": (4.5, 9.0), "rainfall": (30.0, 75.0)},
    "Mungbean": {"N": (10, 40), "P": (35, 60), "K": (15, 25), "temp": (27.0, 30.0), "humidity": (80.0, 90.0), "ph": (6.2, 7.2), "rainfall": (35.0, 60.0)},
    "Blackgram": {"N": (20, 60), "P": (55, 80), "K": (15, 25), "temp": (25.0, 35.0), "humidity": (60.0, 70.0), "ph": (6.5, 7.8), "rainfall": (60.0, 75.0)},
    "Lentil": {"N": (10, 40), "P": (55, 80), "K": (15, 25), "temp": (18.0, 30.0), "humidity": (60.0, 70.0), "ph": (6.5, 7.8), "rainfall": (35.0, 55.0)},
    "Pomegranate": {"N": (10, 40), "P": (10, 30), "K": (35, 45), "temp": (18.0, 25.0), "humidity": (85.0, 95.0), "ph": (5.5, 7.2), "rainfall": (100.0, 115.0)},
    "Banana": {"N": (80, 120), "P": (70, 95), "K": (45, 55), "temp": (25.0, 30.0), "humidity": (75.0, 85.0), "ph": (5.5, 6.5), "rainfall": (90.0, 120.0)},
    "Mango": {"N": (10, 40), "P": (15, 40), "K": (25, 35), "temp": (27.0, 36.0), "humidity": (45.0, 55.0), "ph": (4.5, 7.0), "rainfall": (89.0, 101.0)},
    "Grapes": {"N": (10, 40), "P": (120, 145), "K": (195, 205), "temp": (15.0, 35.0), "humidity": (80.0, 84.0), "ph": (5.5, 6.5), "rainfall": (65.0, 75.0)},
    "Watermelon": {"N": (80, 120), "P": (10, 30), "K": (45, 55), "temp": (24.0, 27.0), "humidity": (80.0, 90.0), "ph": (6.0, 7.0), "rainfall": (40.0, 60.0)},
    "Muskmelon": {"N": (80, 120), "P": (10, 30), "K": (45, 55), "temp": (27.0, 30.0), "humidity": (90.0, 95.0), "ph": (6.0, 6.8), "rainfall": (20.0, 30.0)},
    "Apple": {"N": (10, 40), "P": (120, 145), "K": (195, 205), "temp": (21.0, 24.0), "humidity": (90.0, 95.0), "ph": (5.5, 6.5), "rainfall": (100.0, 125.0)},
    "Orange": {"N": (10, 40), "P": (10, 30), "K": (5, 15), "temp": (10.0, 35.0), "humidity": (90.0, 95.0), "ph": (6.0, 8.0), "rainfall": (100.0, 120.0)},
    "Papaya": {"N": (30, 70), "P": (45, 75), "K": (45, 55), "temp": (23.0, 44.0), "humidity": (90.0, 95.0), "ph": (6.5, 7.0), "rainfall": (140.0, 250.0)},
    "Coconut": {"N": (10, 40), "P": (10, 30), "K": (25, 35), "temp": (25.0, 29.0), "humidity": (95.0, 100.0), "ph": (5.5, 6.5), "rainfall": (130.0, 225.0)},
    "Cotton": {"N": (100, 140), "P": (35, 60), "K": (15, 25), "temp": (22.0, 26.0), "humidity": (75.0, 85.0), "ph": (6.0, 8.0), "rainfall": (60.0, 100.0)},
    "Jute": {"N": (60, 100), "P": (35, 60), "K": (35, 45), "temp": (23.0, 26.0), "humidity": (70.0, 90.0), "ph": (6.0, 7.5), "rainfall": (150.0, 200.0)},
    "Coffee": {"N": (80, 120), "P": (15, 40), "K": (25, 35), "temp": (23.0, 28.0), "humidity": (50.0, 70.0), "ph": (6.0, 7.5), "rainfall": (115.0, 200.0)}
}

def generate():
    dataset_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(dataset_dir, "crop_recommendation.csv")
    
    records = []
    samples_per_crop = 100
    
    for crop, bounds in CROPS_CONFIG.items():
        for _ in range(samples_per_crop):
            n = round(random.gauss((bounds["N"][0] + bounds["N"][1]) / 2, (bounds["N"][1] - bounds["N"][0]) / 6))
            p = round(random.gauss((bounds["P"][0] + bounds["P"][1]) / 2, (bounds["P"][1] - bounds["P"][0]) / 6))
            k = round(random.gauss((bounds["K"][0] + bounds["K"][1]) / 2, (bounds["K"][1] - bounds["K"][0]) / 6))
            temp = round(random.gauss((bounds["temp"][0] + bounds["temp"][1]) / 2, (bounds["temp"][1] - bounds["temp"][0]) / 6), 2)
            hum = round(random.gauss((bounds["humidity"][0] + bounds["humidity"][1]) / 2, (bounds["humidity"][1] - bounds["humidity"][0]) / 6), 2)
            ph = round(random.gauss((bounds["ph"][0] + bounds["ph"][1]) / 2, (bounds["ph"][1] - bounds["ph"][0]) / 6), 2)
            rain = round(random.gauss((bounds["rainfall"][0] + bounds["rainfall"][1]) / 2, (bounds["rainfall"][1] - bounds["rainfall"][0]) / 6), 2)
            
            # Bound clipping
            n = max(bounds["N"][0] - 5, min(bounds["N"][1] + 5, n))
            p = max(bounds["P"][0] - 5, min(bounds["P"][1] + 5, p))
            k = max(bounds["K"][0] - 5, min(bounds["K"][1] + 5, k))
            temp = max(bounds["temp"][0] - 2, min(bounds["temp"][1] + 2, temp))
            hum = max(10.0, min(100.0, hum))
            ph = max(3.5, min(9.9, ph))
            rain = max(20.0, min(350.0, rain))
            
            records.append({
                "N": n,
                "P": p,
                "K": k,
                "temperature": temp,
                "humidity": hum,
                "ph": ph,
                "rainfall": rain,
                "label": crop
            })
            
    random.shuffle(records)
    
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label"])
        writer.writeheader()
        writer.writerows(records)
        
    print(f"Successfully generated {len(records)} agricultural samples saved to {output_file}")

if __name__ == "__main__":
    generate()
