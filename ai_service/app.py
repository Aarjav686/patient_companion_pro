from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np
import os
import ast

app = FastAPI(title="Patient Companion AI Fusion Engine")

# Allow CORS
# Read allowed origins from environment, fallback to localhost for dev
allowed_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_path = os.path.dirname(os.path.abspath(__file__))

# --- Load ML Artifacts ---
try:
    with open(os.path.join(base_path, 'model.pkl'), 'rb') as f:
        clf = pickle.load(f)
    with open(os.path.join(base_path, 'symptoms_list.pkl'), 'rb') as f:
        symptoms_list = pickle.load(f)
    print(f"Loaded Refined ML model! Features required: {len(symptoms_list)}")
except Exception as e:
    print(f"Warning: Model artifacts missing. Error: {e}")
    clf = None
    symptoms_list = []

# --- Load CSV Data ---
# Try multiple paths: Docker (/app/datasets/) vs local dev (../datasets/)
data_path = None
for candidate in [
    os.path.join(base_path, '..', 'datasets', 'sympScan'),
    os.path.join(base_path, 'datasets', 'sympScan'),
]:
    if os.path.isdir(candidate):
        data_path = candidate
        break

df_diets = df_meds = df_prec = df_work = None
if data_path:
    try:
        df_diets = pd.read_csv(os.path.join(data_path, 'diets.csv'))
        df_meds = pd.read_csv(os.path.join(data_path, 'medications.csv'))
        df_prec = pd.read_csv(os.path.join(data_path, 'precautions.csv'))
        df_work = pd.read_csv(os.path.join(data_path, 'workout.csv'))
        
        # Normalize column names — some CSVs use 'Disease', others 'disease'
        for df in [df_diets, df_meds, df_prec, df_work]:
            df.columns = [c.strip() for c in df.columns]
            if 'Disease' in df.columns:
                df.rename(columns={'Disease': 'disease'}, inplace=True)
            if 'disease' in df.columns:
                df['disease'] = df['disease'].str.strip().str.lower()
        print(f"Loaded recommendation CSVs from: {data_path}")
    except Exception as e:
        print("Warning: Missing CSVs.", e)
else:
    print("Warning: datasets/sympScan directory not found. Recommendations will use defaults.")

class Profile(BaseModel):
    age: int
    gender: str
    bp: str
    cholesterol: str

class AssessmentRequest(BaseModel):
    symptoms: list[str]
    profile: Profile

# --- 1. Symptom Normalization Layer ---
SYMPTOM_MAP = {
    "temperature": "fever",
    "high fever": "fever",
    "feverish": "fever",
    "stomach ache": "sharp abdominal pain",
    "stomach pain": "sharp abdominal pain",
    "belly ache": "sharp abdominal pain",
    "tired": "fatigue",
    "exhausted": "fatigue",
    "exhaustion": "fatigue",
    "can't breathe": "shortness of breath",
    "difficulty breathing": "shortness of breath",
    "chest pain": "sharp chest pain",
    "tight chest": "chest tightness",
    "chest pressure": "chest tightness",
    "head hurts": "headache",
    "puking": "vomiting",
    "throw up": "vomiting",
    "loose stools": "diarrhea",
    "feeling sick": "nausea",
    "queasy": "nausea",
    "can't sleep": "insomnia",
    "sleepless": "insomnia"
}

def normalize_symptoms(raw_symptoms):
    normalized = []
    for s in raw_symptoms:
        s = s.strip().lower()
        if s in SYMPTOM_MAP:
            s = SYMPTOM_MAP[s]
        normalized.append(s)
    return normalized

def predict_diseases(user_symptoms: list[str]):
    if not clf or not symptoms_list:
        return [{"disease": "AI Offline", "confidence": 1.0}], []
        
    normalized = normalize_symptoms(user_symptoms)
    
    input_vector = np.zeros(len(symptoms_list))
    matches = 0
    matched_indices = []
    
    for i, s_col in enumerate(symptoms_list):
        # Look for exact or highly partial matches in the model's expected columns
        if s_col.strip().lower() in normalized:
            input_vector[i] = 1
            matches += 1
            matched_indices.append(i)
            
    if matches == 0:
        return [{"disease": "Unknown Condition (No recognized symptoms)", "confidence": 0.0}], []
        
    probabilities = clf.predict_proba([input_vector])[0]
    
    # ── Symptom Contribution Analysis ──────────────────────────
    # Use the model's global feature importances weighted by matched symptoms
    feature_importances = clf.feature_importances_
    raw_contributions = []
    total_importance = 0.0
    
    for i in matched_indices:
        imp = float(feature_importances[i])
        symptom_label = symptoms_list[i].replace('_', ' ').strip()
        # Capitalise each word
        symptom_label = ' '.join(w.capitalize() for w in symptom_label.split())
        raw_contributions.append({"symptom": symptom_label, "importance": imp})
        total_importance += imp
    
    # Normalise to percentages (guaranteed to sum to exactly 100%)
    symptom_contributions = []
    if total_importance > 0:
        raw_contributions.sort(key=lambda x: x["importance"], reverse=True)
        top = raw_contributions[:6]  # Keep top-6 contributors
        top_total = sum(c["importance"] for c in top)
        
        # First pass: floor each percentage
        raw_pcts = []
        for c in top:
            pct = (c["importance"] / top_total) * 100
            raw_pcts.append({"symptom": c["symptom"], "raw": pct, "floored": int(pct * 10) / 10})
        
        # Distribute rounding remainder to the largest contributor
        current_sum = sum(p["floored"] for p in raw_pcts)
        remainder = round(100.0 - current_sum, 1)
        raw_pcts[0]["floored"] = round(raw_pcts[0]["floored"] + remainder, 1)
        
        for p in raw_pcts:
            symptom_contributions.append({
                "symptom": p["symptom"],
                "percentage": p["floored"]
            })
    # ────────────────────────────────────────────────────────────
    
    # Get top 3 predictions
    top_indices = np.argsort(probabilities)[-3:][::-1]
    
    predictions = []
    for idx in top_indices:
        prob = probabilities[idx]
        if prob > 0.02: # Lower bound 2%
            predictions.append({
                "disease": clf.classes_[idx],
                "confidence": round(prob, 2)
            })
            
    # Guarantee at least one fallback if nothing passed 2%
    if not predictions:
        predictions.append({"disease": clf.classes_[top_indices[0]], "confidence": round(probabilities[top_indices[0]], 2)})
        
    return predictions, symptom_contributions

def calculate_fusion_risk(profile: Profile, top_disease: str):
    # 1. Base Profile Risk Variables
    score = 0
    factors = []
    
    age = profile.age
    bp = profile.bp.lower()
    chol = profile.cholesterol.lower()
    
    if age > 65:
        score += 20
        factors.append("Advanced Age")
    elif age > 50:
        score += 10
        
    if bp == 'high':
        score += 25
        factors.append("Elevated Blood Pressure")
        
    if chol == 'high':
        score += 20
        factors.append("Elevated Cholesterol")
        
    # 2. Disease-Aware Risk Synergy
    d = top_disease.lower()
    respiratory_ills = ['pneumonia', 'asthma', 'acute bronchitis', 'covid-19', 'copd', 'obstructive sleep apnea (osa)']
    cardio_ills = ['heart attack', 'angina', 'heart failure', 'hypertension']
    digestive_ills = ['infectious gastroenteritis', 'cholecystitis', 'acute pancreatitis', 'diverticulitis', 'gallstone']
    
    alerts = []
    
    if any(r in d for r in respiratory_ills):
        if age > 60:
            score += 35
            alerts.append({"type": "Critical", "message": f"High risk respiratory complication ({top_disease}) in elderly patient. Immediate medical evaluation advised."})
        else:
            score += 15
            alerts.append({"type": "Warning", "message": f"Respiratory distress detected ({top_disease}). Monitor oxygen and breathing closely."})
            
    elif any(c in d for c in cardio_ills):
        if bp == 'high' or chol == 'high':
            score += 40 # massive synergy risk
            alerts.append({"type": "Critical", "message": f"Severe Cardiovascular Synergy Risk. Underlying {top_disease} combined with poor vitals. Seek emergency care."})
        else:
            score += 25
            alerts.append({"type": "Warning", "message": f"Cardiac condition suspected ({top_disease}). Avoid exertion."})
            
    elif any(gi in d for gi in digestive_ills):
        score += 10
        alerts.append({"type": "Notice", "message": f"Digestive tract inflammation/infection suspected ({top_disease}). Prevent dehydration."})
    
    # Cap score
    final_score = max(5, min(98, score))
    
    level = "Low"
    if final_score >= 75:
        level = "High"
    elif final_score >= 40:
        level = "Moderate"
        
    return {
        "risk": {
            "riskScore": final_score,
            "level": level,
            "factors": factors
        },
        "alerts": alerts
    }

def fetch_recommendations(disease: str):
    d = disease.lower().strip()
    
    def search_df(df, target_col, src_col='disease'):
        # Fallback partial matching
        exact = df[df[src_col] == d]
        if not exact.empty:
            return exact[target_col].tolist()[0]
        partial = df[df[src_col].str.contains(d, na=False)]
        if not partial.empty:
            return partial[target_col].tolist()[0]
        return None
        
    def safe_parse(val, fallback):
        if not val: return fallback
        try:
            if isinstance(val, str) and val.strip().startswith('['):
                parsed = ast.literal_eval(val)
                if isinstance(parsed, list): return parsed
            return val.split(',') if isinstance(val, str) else [str(val)]
        except:
            return fallback

    try:
        diet = search_df(df_diets, 'Diet')
        meds = search_df(df_meds, 'Medication')
        
        # Workout CSV has columns: disease, workouts (after rename)
        workout_res = df_work[df_work['disease'].str.contains(d, na=False)] if df_work is not None else pd.DataFrame()
        workout = workout_res.iloc[0]['Workouts'] if not workout_res.empty else None
        
        # Precautions
        px_match = df_prec[df_prec['disease'].str.contains(d, na=False)]
        px_list = []
        if not px_match.empty:
            for p in ['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4']:
                if p in px_match.columns:
                    val = px_match.iloc[0][p]
                    if pd.notna(val):
                        px_list.append(str(val).strip().title())
                    
        return {
            "diets": safe_parse(diet, ["Hydration, easily digestible nutrient-rich foods."]),
            "medications": safe_parse(meds, ["Targeted symptom relievers. Consult physician."]),
            "workouts": safe_parse(workout, ["Strict minimal physical exertion. Complete rest."]),
            "precautions": px_list if px_list else ["Monitor symptoms closely", "Seek clinical evaluation"]
        }
    except Exception as e:
        print("Rec error", e)
        return {
            "diets": ["Balanced recovery diet"], "medications": ["Consult doctor"],
            "workouts": ["Rest"], "precautions": ["Hydrate"]
        }


@app.post("/assess")
def assess_patient(req: AssessmentRequest):
    # 1. Predictions + Symptom Contributions
    predictions, symptom_contributions = predict_diseases(req.symptoms)
    top_disease = predictions[0]['disease'] if predictions else "Unknown"
    
    # 2. Risk & Contextual Alerts Synergy
    risk_data = calculate_fusion_risk(req.profile, top_disease)
    
    # 3. Personalized Contextual Recommendations
    recs = fetch_recommendations(top_disease)
    
    # Generic safety catch-all alerts if no specific alert triggered but score is high
    if not risk_data['alerts'] and risk_data['risk']['riskScore'] >= 75:
        risk_data['alerts'].append({
            "type": "Critical", "message": f"High general risk parameters detected for suspected {top_disease}."
        })
        
    return {
        "predictions": predictions,
        "risk": risk_data['risk'],
        "alerts": risk_data['alerts'],
        "recommendations": recs,
        "symptom_contributions": symptom_contributions,
    }

@app.get("/symptoms")
def get_symptoms():
    # Return the clean list of exact features the model accepts
    return {"symptoms": [s.replace('_', ' ').title() for s in symptoms_list]}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": clf is not None,
        "features_count": len(symptoms_list)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

