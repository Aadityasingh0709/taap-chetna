"""
ml/serve.py
FastAPI Inference Microservice for Tap Chetna Heat-Health Historical Burden Model.
Exposes POST /predict and GET /state-burden/{state} for consumption by Node/Express backend.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.utils.population_data import get_state_population_and_density

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(BASE_DIR, 'ml', 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'xgboost_heat_health_model.joblib')
SCHEMA_PATH = os.path.join(MODELS_DIR, 'feature_schema.json')
METADATA_PATH = os.path.join(MODELS_DIR, 'model_metadata.json')
TRAINING_DATA_PATH = os.path.join(BASE_DIR, 'ml', 'data', 'state_year_heat_health_training_dataset.csv')

# Load Model, Schema, and Metadata
if not os.path.exists(MODEL_PATH) or not os.path.exists(SCHEMA_PATH):
    raise RuntimeError(f"Trained model artifacts missing at {MODELS_DIR}. Run train_pipeline.py first.")

model = joblib.load(MODEL_PATH)
with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
    schema = json.load(f)

metadata = {}
if os.path.exists(METADATA_PATH):
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

feature_names: List[str] = schema['feature_names']
state_baseline_map: Dict[str, float] = schema.get('state_baseline_map', {})
global_baseline: float = schema.get('global_baseline', 38.69)

# Load state climatological medians as intelligent defaults for unspecified parameters
state_medians: Dict[str, Dict[str, float]] = {}
if os.path.exists(TRAINING_DATA_PATH):
    train_df = pd.read_csv(TRAINING_DATA_PATH)
    avail_cols = [c for c in feature_names if c in train_df.columns]
    for st, group in train_df.groupby('state'):
        state_medians[st] = group[avail_cols].median().to_dict()
    global_medians = train_df[avail_cols].median().to_dict()
else:
    global_medians = {f: 0.0 for f in feature_names}


app = FastAPI(
    title="Taap Chetna Heat-Health Inference Service",
    description="Population-level heatstroke burden estimation service for municipal and state disaster management.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HeatBurdenPredictionRequest(BaseModel):
    state: str = Field(..., example="West Bengal")
    year: Optional[int] = Field(2024, example=2024)
    summer_tmax_max: Optional[float] = Field(None, example=42.5)
    summer_tmax_mean: Optional[float] = Field(None, example=36.0)
    summer_hi_max: Optional[float] = Field(None, example=48.0)
    heatwave_days: Optional[int] = Field(None, example=12)
    max_consecutive_hot_days: Optional[int] = Field(None, example=6)
    extreme_temp_days_42: Optional[int] = Field(None, example=8)
    extreme_hi_days_52: Optional[int] = Field(None, example=4)
    custom_features: Optional[Dict[str, float]] = Field(default_factory=dict)


def categorize_burden_band(burden_score: float) -> Tuple[str, str]:
    """Assigns burden category and operational advisory."""
    if burden_score >= 120.0:
        return "CRITICAL_BURDEN", "Very high historical-pattern mortality risk. Requires high-capacity public cooling shelters, emergency ER staffing, and aggressive water tanker mobilization."
    elif burden_score >= 60.0:
        return "ELEVATED_BURDEN", "Elevated historical burden risk. Intensify ward-level hydration stations, restrict peak afternoon labor, and activate medical heatstroke protocols."
    elif burden_score >= 25.0:
        return "MODERATE_BURDEN", "Moderate historical burden. Standard summer heat action plan (HAP) surveillance and community awareness."
    else:
        return "LOW_BURDEN", "Low historical burden baseline. Standard preventive hydration advisories."


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Taap Chetna ML Engine",
        "model_loaded": "XGBoost Regressor (State-Year Health Burden)",
        "features": len(feature_names),
        "version": metadata.get("version", "1.0.0")
    }


@app.get("/model-info")
def model_info():
    return metadata


@app.post("/predict")
def predict(req: HeatBurdenPredictionRequest):
    state = req.state.strip()
    year = req.year or 2024
    
    # 1. Base dictionary initialized with state medians or global medians
    defaults = state_medians.get(state, global_medians).copy()
    
    # 2. Add demographics for target year
    pop_m, density = get_state_population_and_density(state, year)
    defaults['population_millions'] = pop_m
    defaults['population_density_per_sq_km'] = density
    defaults['state_baseline_deaths'] = state_baseline_map.get(state, global_baseline)
    
    # 3. Apply explicit user inputs
    if req.summer_tmax_max is not None:
        defaults['summer_tmax_max'] = req.summer_tmax_max
    if req.summer_tmax_mean is not None:
        defaults['summer_tmax_mean'] = req.summer_tmax_mean
    if req.summer_hi_max is not None:
        defaults['summer_hi_max'] = req.summer_hi_max
    if req.heatwave_days is not None:
        defaults['heatwave_days'] = float(req.heatwave_days)
    if req.max_consecutive_hot_days is not None:
        defaults['max_consecutive_hot_days'] = float(req.max_consecutive_hot_days)
    if req.extreme_temp_days_42 is not None:
        defaults['extreme_temp_days_42'] = float(req.extreme_temp_days_42)
    if req.extreme_hi_days_52 is not None:
        defaults['extreme_hi_days_52'] = float(req.extreme_hi_days_52)
        
    # 4. Apply any custom feature overrides
    if req.custom_features:
        for k, v in req.custom_features.items():
            if k in defaults:
                defaults[k] = float(v)
                
    # 5. Build feature vector in exact schema order
    feature_vector = [defaults[col] for col in feature_names]
    X_input = pd.DataFrame([feature_vector], columns=feature_names)
    
    # 6. Predict with XGBoost
    raw_pred = float(model.predict(X_input)[0])
    burden_estimate = round(max(0.0, raw_pred), 1)
    
    burden_band, advisory = categorize_burden_band(burden_estimate)
    
    # Extract top contributing risk factors for explainability
    top_factors = [
        {"factor": "State Historical Baseline", "value": f"{defaults['state_baseline_deaths']:.1f} deaths/yr", "significance": "Historical state reporting baseline"},
        {"factor": "Heatwave Days", "value": f"{defaults['heatwave_days']:.0f} days", "significance": "Cumulative prolonged extreme heat periods"},
        {"factor": "Peak Summer Temperature", "value": f"{defaults['summer_tmax_max']:.1f} °C", "significance": "Acute biometeorological thermal ceiling"},
        {"factor": "Exposed Population", "value": f"{defaults['population_millions']:.1f} M", "significance": "Macro demographic exposure scale"},
        {"factor": "Max Consecutive Hot Days", "value": f"{defaults['max_consecutive_hot_days']:.0f} days", "significance": "Compound cardiovascular fatigue trigger"},
    ]
    
    return {
        "state": state,
        "year": year,
        "model_derived_state_burden_estimate": burden_estimate,
        "burden_band": burden_band,
        "operational_advisory": advisory,
        "contributing_factors": top_factors,
        "model_version": metadata.get("version", "1.0.0"),
        "model_type": "XGBoost Regressor (State-Year Health Burden)",
        "disclaimer": "This prediction is a macro population-level heat-health burden estimate for municipal cooling and emergency planning. It does NOT predict individual health outcomes or probability of death."
    }


@app.get("/state-burden/{state}")
def get_state_burden(state: str, year: int = 2024):
    req = HeatBurdenPredictionRequest(state=state, year=year)
    return predict(req)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 5001))
    uvicorn.run("ml.serve:app", host="0.0.0.0", port=port, reload=False)
