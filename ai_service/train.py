import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pickle
import os

print("--- Step 1: Loading Datasets ---")
base_path = '../datasets/sympScan/'
df_symp = pd.read_csv(base_path + 'Diseases_and_Symptoms_dataset.csv')

print(f"Original Dataset shape: {df_symp.shape}")

# High-priority clinical diseases for the AI Engine subset
curated_diseases = [
    'pneumonia', 'acute bronchitis', 'infectious gastroenteritis', 'gout', 
    'strep throat', 'liver disease', 'acute pancreatitis', 'eczema', 
    'cholecystitis', 'anxiety', 'obstructive sleep apnea (osa)', 'depression', 
    'acute sinusitis', 'chronic constipation', 'angina', 'multiple sclerosis', 
    'urinary tract infection', 'asthma', 'common cold', 'heart failure', 
    'chronic obstructive pulmonary disease (copd)', 'gallstone', 'panic disorder', 
    'heart attack', 'diverticulitis', 'hypoglycemia', 'hyperemesis gravidarum', 
    'conjunctivitis due to allergy', 'contact dermatitis', 'herniated disk'
]

# Filter down to the curated set
df_reduced = df_symp[df_symp['diseases'].isin(curated_diseases)].copy()

print(f"Curated Dataset shape: {df_reduced.shape}")
print(f"Total Unique Diseases Used: {df_reduced['diseases'].nunique()}")

X = df_reduced.drop('diseases', axis=1)
y = df_reduced['diseases']

# Save the exact symptom columns required by the model
symptoms_list = list(X.columns)
with open('symptoms_list.pkl', 'wb') as f:
    pickle.dump(symptoms_list, f)

print("--- Step 2: Training Refined RandomForest ---")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Tuned parameters: deeper trees, balanced class weight, more estimators
clf = RandomForestClassifier(
    n_estimators=100, 
    max_depth=30, 
    random_state=42, 
    class_weight='balanced',
    n_jobs=-1
)
clf.fit(X_train, y_train)

print("--- Step 3: Evaluation ---")
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Top-1 Accuracy: {acc*100:.2f}%")

print("--- Step 4: Exporting Model ---")
with open('model.pkl', 'wb') as f:
    pickle.dump(clf, f)
print("Model saved to model.pkl successfully!")
