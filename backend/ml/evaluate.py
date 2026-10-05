"""
Model Evaluation and Metrics Extraction
Reads saved model metrics, confusion data, and produces evaluation summaries for the Admin/ML Dashboard.
"""

import os
import json

def get_model_evaluation_metrics():
    """
    Returns the real measured validation and test metrics from model training.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    metrics_path = os.path.join(current_dir, 'metrics', 'metrics.json')

    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            return json.load(f)

    # Return baseline metadata if not yet trained
    return {
        "model_type": "Random Forest Classifier",
        "status": "Untrained / Pending Execution",
        "features": ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'],
        "accuracy": None
    }
