import os
import math
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forest-fire-ai-service")

app = FastAPI(
    title="Forest Fire Prediction AI Service",
    description="A two-step machine learning service predicting fire spread and burned area.",
    version="1.0.0"
)

# Enable CORS for the React dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve model paths relative to this script
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSIFIER_PATH = os.path.join(CURRENT_DIR, "forest_fire_classifier.pkl")
REGRESSOR_PATH = os.path.join(CURRENT_DIR, "forest_fire_regressor.pkl")

# Load models at startup
models = {}

@app.on_event("startup")
def load_models():
    logger.info("Loading machine learning models...")
    try:
        models["classifier"] = joblib.load(CLASSIFIER_PATH)
        logger.info(f"Loaded classifier model from {CLASSIFIER_PATH}")
    except Exception as e:
        logger.error(f"Failed to load classifier: {e}")
        raise RuntimeError(f"Classifier load error: {e}")

    try:
        models["regressor"] = joblib.load(REGRESSOR_PATH)
        logger.info(f"Loaded regressor model from {REGRESSOR_PATH}")
    except Exception as e:
        logger.error(f"Failed to load regressor: {e}")
        raise RuntimeError(f"Regressor load error: {e}")

# Input schema
class PredictionInput(BaseModel):
    X: int = Field(..., ge=1, le=9, description="Spatial coordinate X (1 to 9)")
    Y: int = Field(..., ge=2, le=9, description="Spatial coordinate Y (2 to 9)")
    FFMC: float = Field(..., description="Fine Fuel Moisture Code")
    DMC: float = Field(..., description="Duff Moisture Code")
    DC: float = Field(..., description="Drought Code")
    ISI: float = Field(..., description="Initial Spread Index")
    temp: float = Field(..., description="Temperature in Celsius")
    RH: float = Field(..., description="Relative Humidity in percentage")
    wind: float = Field(..., description="Wind speed in km/h")
    rain: float = Field(..., description="Rainfall in mm/m2")
    month: str = Field(..., description="Month of the year (e.g., 'jan', 'feb', ..., 'dec')")

# Output schema
class PredictionOutput(BaseModel):
    spread: bool
    probability: float
    raw_area: float
    area: float
    message: str

# Features expected by both models
FEATURE_NAMES = [
    'X', 'Y', 'FFMC', 'DMC', 'DC', 'ISI', 'temp', 'RH', 'wind', 'rain',
    'month_aug', 'month_dec', 'month_feb', 'month_jan', 'month_jul',
    'month_jun', 'month_mar', 'month_may', 'month_nov', 'month_oct', 'month_sep'
]

@app.post("/predict", response_model=PredictionOutput)
async def predict(data: PredictionInput):
    logger.info(f"Received prediction request: {data}")
    
    if not models.get("classifier") or not models.get("regressor"):
        raise HTTPException(status_code=500, detail="Models are not loaded on server.")
        
    try:
        # Create input features dictionary initialized to 0.0
        features_dict = {feat: 0.0 for feat in FEATURE_NAMES}
        
        # Populate basic numerical inputs
        features_dict['X'] = float(data.X)
        features_dict['Y'] = float(data.Y)
        features_dict['FFMC'] = float(data.FFMC)
        features_dict['DMC'] = float(data.DMC)
        features_dict['DC'] = float(data.DC)
        features_dict['ISI'] = float(data.ISI)
        features_dict['temp'] = float(data.temp)
        features_dict['RH'] = float(data.RH)
        features_dict['wind'] = float(data.wind)
        features_dict['rain'] = float(data.rain)
        
        # Map month to one-hot column
        month_key = f"month_{data.month.lower().strip()}"
        if month_key in features_dict:
            features_dict[month_key] = 1.0
            logger.info(f"One-hot feature active: {month_key}")
        else:
            logger.info(f"Month '{data.month}' maps to reference category (all month variables = 0.0)")

        # Create DataFrame matching scikit-learn expected features layout
        df = pd.DataFrame([features_dict], columns=FEATURE_NAMES)
        
        # Step 1: Predict Spread (Classification)
        clf = models["classifier"]
        clf_pred = int(clf.predict(df)[0])
        clf_proba = clf.predict_proba(df)[0]  # [Prob_No_Spread, Prob_Spread]
        spread_probability = float(clf_proba[1])
        
        logger.info(f"Classifier output: pred={clf_pred}, probabilities={clf_proba}")
        
        if clf_pred == 0:
            return PredictionOutput(
                spread=False,
                probability=spread_probability,
                raw_area=0.0,
                area=0.0,
                message="Model 1 predicts: Fire is unlikely to spread. Burned area is estimated at 0 hectares."
            )
            
        # Step 2: Predict Size (Regression)
        reg = models["regressor"]
        reg_pred = float(reg.predict(df)[0])
        
        # Model predicted log-transformed area: ln(area + 1)
        # Convert back to raw hectares: area = exp(y) - 1
        predicted_area = math.exp(reg_pred) - 1.0
        if predicted_area < 0.0:
            predicted_area = 0.0
            
        logger.info(f"Regressor output: raw={reg_pred}, inverted_hectares={predicted_area}")
        
        return PredictionOutput(
            spread=True,
            probability=spread_probability,
            raw_area=reg_pred,
            area=predicted_area,
            message=f"Model 1 predicts: Fire WILL spread (probability: {spread_probability:.1%}). Model 2 predicts: Fire will consume approximately {predicted_area:.2f} hectares."
        )

    except Exception as e:
        logger.error(f"Error executing prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models_loaded": "classifier" in models and "regressor" in models
    }
