import requests
import json

tests = [
    {
        "name": "Respiratory - High Risk",
        "symptoms": ["fever", "cough", "chest tightness", "can't breathe"], 
        "age": 65, "bp": "High", "chol": "High"
    },
    {
        "name": "Digestive - Normal Risk",
        "symptoms": ["stomach ache", "vomiting", "nausea", "loose stools"], 
        "age": 30, "bp": "Normal", "chol": "Normal"
    },
    {
        "name": "General - Moderate Risk",
        "symptoms": ["head hurts", "tired", "feverish"], 
        "age": 55, "bp": "Normal", "chol": "High"
    }
]

print("--- AI ENGINE VALIDATION TESTS ---")
for t in tests:
    print(f"\n[Test Case] {t['name']}")
    print(f"Inputs: {t['symptoms']} | Age: {t['age']} | BP: {t['bp']} | Chol: {t['chol']}")
    
    payload = {
        "symptoms": t['symptoms'], 
        "profile": {"age": t['age'], "gender": "male", "bp": t['bp'], "cholesterol": t['chol']}
    }
    
    try:
        res = requests.post("http://localhost:8000/assess", json=payload)
        data = res.json()
        
        print(f"Top Disease: {data['predictions'][0]['disease']} ({data['predictions'][0]['confidence']*100}%)")
        print(f"Risk Profile: {data['risk']['level']} | Score: {data['risk']['riskScore']}")
        
        if data['alerts']:
            print("Alerts triggered:")
            for a in data['alerts']:
                print(f"  - [{a['type']}] {a['message']}")
        else:
            print("Alerts triggered: None")
            
        print("Recs (Diets):", data['recommendations']['diets'][0] if data['recommendations']['diets'] else "None")
        
    except Exception as e:
        print("Error during request:", e)

