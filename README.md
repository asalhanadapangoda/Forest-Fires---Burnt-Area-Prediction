# Forest Fire Burnt Area Prediction System

This project is a machine learning system designed to predict the size of a forest fire (the burned area) based on environmental and meteorological conditions. 

Because predicting the exact size of a fire is highly complex—with many fires stopping at 0 hectares and a rare few turning into massive disasters—the system implements a **Two-Step Architecture** that sequentializes the prediction process.

## Architecture Flow

```
             Weather & FWI Data
                      |
                      ↓
            +------------------+
            |    AI Model 1    |
            |  Spread or Not?  |
            +------------------+
                      |
             ------------------
             |                |
            No               Yes
             |                |
             ↓                ↓
        0 hectares     +------------------+
                       |    AI Model 2    |
                       |   Predict Size   |
                       +------------------+
                                |
                                ↓
                         Fire Area (ha)
                           Prediction
```

1. **Step 1: Classifier (`forest_fire_classifier.pkl`)**: Predicts whether a fire will spread or be contained (0 hectares).
2. **Step 2: Regressor (`forest_fire_regressor.pkl`)**: If a spread is predicted, this model estimates the size of the burned area in hectares (trained on `ln(area + 1)` and converted back using `exp(y) - 1`).

---

## The Input Features

The model learns from the Forest Fires Dataset, which contains historical records from a region in Portugal. The system feeds the AI the following key features:

*   **Weather Conditions**: Standard meteorological readings including Temperature (°C), Relative Humidity (%), Wind Speed (km/h), and Rainfall (mm/m²).
*   **Fire Weather Index (FWI) Metrics**: Scientific measurements of how dry and flammable the forest floor is. Includes:
    *   *Fine Fuel Moisture Code (FFMC)*: Flammability of thin forest materials.
    *   *Duff Moisture Code (DMC)*: Fuel moisture content in shallow organic layers.
    *   *Drought Code (DC)*: Deep soil moisture drying index.
    *   *Initial Spread Index (ISI)*: Rate of fire spread immediate after ignition.
*   **Spatial & Temporal Data**: Location coordinates (X, Y) in the forest and the month of the year the fire occurred.
*   **Target Variable**: The actual "Burned Area" measured in hectares.

---

## Directory Structure

```
├── AI Service/
│   ├── app.py                     # FastAPI backend application
│   ├── requirements.txt           # Python backend dependencies
│   ├── forest_fire_classifier.pkl # Classifier model (Random Forest)
│   └── forest_fire_regressor.pkl  # Regressor model (Random Forest)
└── Frontend/
    └── forest-fire-frontend/      # React + Vite frontend application
        ├── src/
        │   ├── App.jsx            # Prediction dashboard component
        │   ├── App.css            # Custom dashboard styles
        │   └── main.jsx           # App entry point
        └── package.json           # Frontend dependencies (React + Axios)
```

---

## Setup & Running Guide

### 1. Run the AI Service (Backend)
Navigate to the `AI Service` directory, create a virtual environment, install requirements, and start the FastAPI server:

```powershell
# Navigate to AI Service
cd "AI Service"

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment (Windows Powershell)
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python -m uvicorn app:app --port 8000 --host 127.0.0.1
```
The backend API service will be available at `http://127.0.0.1:8000`. You can check the health status endpoint at `http://127.0.0.1:8000/health`.

### 2. Run the React Dashboard (Frontend)
Open a new terminal session, navigate to the React app folder, install node packages, and launch the dev server:

```bash
# Navigate to frontend project
cd "Frontend/forest-fire-frontend"

# Install packages
npm install

# Start Vite dev server
npm run dev
```
The dashboard UI will be hosted at `http://localhost:5174` (or the port outputted in the terminal).

---

## How to Use the Dashboard

1.  **Select Presets**: Click on any of the quick presets at the top (e.g. *Spring Rain*, *Extreme Drought*) to instantly populate the inputs with realistic historical conditions.
2.  **Position the Fire Location**: Click on any cell in the **Spatial Coordinate Locator** grid representing the 9x9 layout of the forest.
3.  **Adjust Sliders**: Fine-tune weather indices (temperature, wind, FWI indicators) to simulate scenarios.
4.  **Run Pipeline**: Click **Run Predictions Pipeline** to trigger the two-step AI model execution and watch the visual flow node trace the predictions live.
