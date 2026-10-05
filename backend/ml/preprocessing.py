"""
ML Preprocessing Pipeline for Agricultural Crop Recommendation
Handles feature extraction, standard scaling, and missing value checks.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']

class CropPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.is_fitted = False

    def fit(self, X: pd.DataFrame):
        self.scaler.fit(X[FEATURE_NAMES])
        self.is_fitted = True
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("CropPreprocessor must be fitted before transforming data.")
        return self.scaler.transform(X[FEATURE_NAMES])

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        return self.fit(X).transform(X)

    def validate_inputs(self, input_dict: dict):
        """
        Validates presence and boundary conditions of agronomic inputs.
        Returns (is_valid, sanitized_dict, missing_fields)
        """
        missing = []
        sanitized = {}
        for feature in FEATURE_NAMES:
            val = input_dict.get(feature)
            if val is None or str(val).strip() == '':
                missing.append(feature)
            else:
                try:
                    sanitized[feature] = float(val)
                except (ValueError, TypeError):
                    missing.append(feature)

        if missing:
            return False, sanitized, missing
        return True, sanitized, []
