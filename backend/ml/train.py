"""
Random Forest Crop Recommendation Model Training Pipeline
Trains a 100-tree Random Forest Classifier on agricultural soil-climate data.
Computes genuine test accuracy, precision, recall, F1, and saves metrics & plots.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from preprocessing import CropPreprocessor, FEATURE_NAMES

def train():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, 'dataset', 'crop_recommendation.csv')
    model_dir = os.path.join(current_dir, 'model')
    metrics_dir = os.path.join(current_dir, 'metrics')
    
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(metrics_dir, exist_ok=True)

    print(f"[Training] Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"[Training] Dataset shape: {df.shape}")

    X = df[FEATURE_NAMES]
    y = df['label']

    # Label encoding
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    classes = list(label_encoder.classes_)
    print(f"[Training] Classes ({len(classes)}): {classes}")

    # Train / Test Split (80 / 20 stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )

    # Preprocessing / Scaling
    preprocessor = CropPreprocessor()
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)

    # Model training
    print("[Training] Fitting RandomForestClassifier (n_estimators=100)...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=16,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)

    # Evaluation on unseen test split
    y_pred = rf.predict(X_test_scaled)
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    rec = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))

    print(f"[Evaluation] Test Accuracy:  {acc * 100:.2f}%")
    print(f"[Evaluation] Weighted Prec:  {prec * 100:.2f}%")
    print(f"[Evaluation] Weighted Recall:{rec * 100:.2f}%")
    print(f"[Evaluation] Weighted F1:    {f1 * 100:.2f}%")

    # Feature Importance
    importances = rf.feature_importances_
    feat_imp = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_NAMES, importances)}
    print(f"[Evaluation] Feature Importances: {feat_imp}")

    # Save metrics JSON
    metrics_data = {
        "model_type": "Random Forest Classifier",
        "n_estimators": 100,
        "features": FEATURE_NAMES,
        "classes_count": len(classes),
        "crops": classes,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": round(acc * 100, 2),
        "precision": round(prec * 100, 2),
        "recall": round(rec * 100, 2),
        "f1_score": round(f1 * 100, 2),
        "feature_importance": feat_imp
    }
    with open(os.path.join(metrics_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics_data, f, indent=2)

    # Plot & Save Feature Importance
    plt.figure(figsize=(8, 4.5))
    sorted_idx = np.argsort(importances)
    plt.barh([FEATURE_NAMES[i] for i in sorted_idx], importances[sorted_idx], color='#2b7352')
    plt.xlabel('Relative Feature Importance (MDI)')
    plt.title('ESYKRUSHI - Random Forest Feature Importance for Crop Prediction')
    plt.tight_layout()
    plt.savefig(os.path.join(metrics_dir, 'feature_importance.png'), dpi=150)
    plt.close()

    # Save Artifacts
    joblib.dump(rf, os.path.join(model_dir, 'crop_model.joblib'))
    joblib.dump(preprocessor.scaler, os.path.join(model_dir, 'preprocessing_pipeline.joblib'))
    joblib.dump(label_encoder, os.path.join(model_dir, 'label_encoder.joblib'))

    print(f"[Training] Models, scalers, and plots successfully saved to {model_dir} and {metrics_dir}")
    return metrics_data

if __name__ == '__main__':
    train()
