-- ============================================================
-- SEED DATA for Patient Companion Pro Demo Accounts
-- Run this in Supabase SQL Editor AFTER users have registered
-- ============================================================

-- Ensure required tables exist
CREATE TABLE IF NOT EXISTS medicine_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE SET NULL,
  medicine_name text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'skipped')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE medicine_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own reminders" ON medicine_reminders;
CREATE POLICY "Users can view own reminders" ON medicine_reminders FOR SELECT USING (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Users can insert own reminders" ON medicine_reminders;
CREATE POLICY "Users can insert own reminders" ON medicine_reminders FOR INSERT WITH CHECK (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Users can update own reminders" ON medicine_reminders;
CREATE POLICY "Users can update own reminders" ON medicine_reminders FOR UPDATE USING (auth.uid() = patient_id);

CREATE TABLE IF NOT EXISTS health_vitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);
ALTER TABLE health_vitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own vitals" ON health_vitals;
CREATE POLICY "Users can view own vitals" ON health_vitals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own vitals" ON health_vitals;
CREATE POLICY "Users can insert own vitals" ON health_vitals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS doctor_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  slot_duration_minutes int DEFAULT 30,
  is_active boolean DEFAULT true,
  UNIQUE(doctor_id, day_of_week)
);
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view availability" ON doctor_availability;
CREATE POLICY "Anyone can view availability" ON doctor_availability FOR SELECT USING (true);
DROP POLICY IF EXISTS "Doctors can manage availability" ON doctor_availability;
CREATE POLICY "Doctors can manage availability" ON doctor_availability FOR ALL USING (auth.uid() = doctor_id);

-- Add metadata column to alerts if missing
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata text;

-- Health Assessments table (AI engine results)
CREATE TABLE IF NOT EXISTS health_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symptoms jsonb NOT NULL DEFAULT '[]'::jsonb,
  predictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_score int NOT NULL,
  risk_level text NOT NULL,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '{}'::jsonb,
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own assessments" ON health_assessments;
CREATE POLICY "Users can view their own assessments" ON health_assessments FOR SELECT USING (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Users can insert their own assessments" ON health_assessments;
CREATE POLICY "Users can insert their own assessments" ON health_assessments FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Step 1: Get user IDs from profiles by email
-- (We use a DO block so the script is self-contained)

DO $$
DECLARE
  v_rahul uuid;
  v_kavitha uuid;
  v_arjun uuid;
  v_anjali uuid;
  v_rajan uuid;
  v_priya uuid;
BEGIN

  -- Look up demo user IDs
  SELECT id INTO v_rahul FROM profiles WHERE email = 'rahul.sharma@email.com';
  SELECT id INTO v_kavitha FROM profiles WHERE email = 'kavitha.reddy@email.com';
  SELECT id INTO v_arjun FROM profiles WHERE email = 'arjun.patel@email.com';
  SELECT id INTO v_anjali FROM profiles WHERE email = 'dr.anjali@email.com';
  SELECT id INTO v_rajan FROM profiles WHERE email = 'dr.rajan@email.com';
  SELECT id INTO v_priya FROM profiles WHERE email = 'dr.priya@email.com';

  -- Abort if primary accounts not found
  IF v_rahul IS NULL OR v_anjali IS NULL THEN
    RAISE EXCEPTION 'Demo accounts not found. Register rahul.sharma@email.com and dr.anjali@email.com first.';
  END IF;

  -- =============================================
  -- Update profile data for richness
  -- =============================================
  UPDATE profiles SET age = 28, gender = 'Male', blood_group = 'O+', phone = '9876543210',
    city = 'Jaipur', state = 'Rajasthan', allergies = ARRAY['Penicillin', 'Dust'],
    chronic_conditions = ARRAY['Mild Asthma']
  WHERE id = v_rahul;

  UPDATE profiles SET specialization = 'Cardiology', qualification = 'MD Cardiology, AIIMS Delhi',
    hospital = 'Fortis Hospital, Jaipur', consultation_fee = 800, city = 'Jaipur', state = 'Rajasthan',
    age = 42, gender = 'Female', phone = '9876500001'
  WHERE id = v_anjali;

  IF v_kavitha IS NOT NULL THEN
    UPDATE profiles SET age = 35, gender = 'Female', blood_group = 'A+', phone = '9876543211',
      city = 'Jaipur', state = 'Rajasthan', allergies = ARRAY['Sulfa drugs'],
      chronic_conditions = ARRAY['Type 2 Diabetes']
    WHERE id = v_kavitha;
  END IF;

  IF v_arjun IS NOT NULL THEN
    UPDATE profiles SET age = 45, gender = 'Male', blood_group = 'B+', phone = '9876543212',
      city = 'Jaipur', state = 'Rajasthan', allergies = '{}',
      chronic_conditions = ARRAY['Hypertension']
    WHERE id = v_arjun;
  END IF;

  IF v_rajan IS NOT NULL THEN
    UPDATE profiles SET specialization = 'Pulmonology', qualification = 'MD Pulmonology',
      hospital = 'SMS Hospital, Jaipur', consultation_fee = 600, city = 'Jaipur', state = 'Rajasthan',
      age = 50, gender = 'Male', phone = '9876500002'
    WHERE id = v_rajan;
  END IF;

  IF v_priya IS NOT NULL THEN
    UPDATE profiles SET specialization = 'Neurology', qualification = 'DM Neurology',
      hospital = 'Narayana Hospital, Jaipur', consultation_fee = 1000, city = 'Jaipur', state = 'Rajasthan',
      age = 38, gender = 'Female', phone = '9876500003'
    WHERE id = v_priya;
  END IF;

  -- =============================================
  -- APPOINTMENTS (Rahul with Dr. Anjali)
  -- =============================================
  -- 1. Pending appointment (upcoming)
  INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
  VALUES (v_rahul, v_anjali, CURRENT_DATE + 2, '10:00 AM', 'consultation', 'Chest discomfort and shortness of breath', 'pending');

  -- 2. Confirmed appointment (upcoming)
  INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
  VALUES (v_rahul, v_anjali, CURRENT_DATE + 5, '02:30 PM', 'follow-up', 'Routine cardiac follow-up', 'confirmed');

  -- 3. Completed appointment (past)
  INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
  VALUES (v_rahul, v_anjali, CURRENT_DATE - 7, '11:00 AM', 'consultation', 'Fatigue and mild chest pain', 'completed');

  -- 4. Completed appointment (past)
  INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
  VALUES (v_rahul, v_anjali, CURRENT_DATE - 21, '09:30 AM', 'check-up', 'Annual health screening', 'completed');

  -- Extra patients for doctor view
  IF v_kavitha IS NOT NULL THEN
    INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
    VALUES (v_kavitha, v_anjali, CURRENT_DATE + 1, '11:30 AM', 'consultation', 'Palpitations and dizziness', 'pending');

    INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
    VALUES (v_kavitha, v_anjali, CURRENT_DATE - 10, '03:00 PM', 'follow-up', 'Diabetes blood sugar review', 'completed');
  END IF;

  IF v_arjun IS NOT NULL THEN
    INSERT INTO appointments (patient_id, doctor_id, date, time, type, symptoms, status)
    VALUES (v_arjun, v_anjali, CURRENT_DATE - 5, '04:00 PM', 'consultation', 'High BP readings at home', 'completed');
  END IF;

  -- =============================================
  -- PRESCRIPTIONS (3 active for Rahul)
  -- =============================================
  INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, advice, medicines, status)
  VALUES (
    v_rahul, v_anjali,
    'Mild Angina with Exercise-Induced Dyspnea',
    'Avoid strenuous exercise. Take medications with food. Follow up in 2 weeks.',
    '[{"name": "Aspirin 75mg", "dosage": "75mg", "frequency": "Once daily", "duration": "3 months", "instructions": "Take after breakfast"},
      {"name": "Atorvastatin 10mg", "dosage": "10mg", "frequency": "Once daily at night", "duration": "3 months", "instructions": "Take at bedtime"},
      {"name": "Amlodipine 5mg", "dosage": "5mg", "frequency": "Once daily", "duration": "1 month", "instructions": "Take in the morning"}]'::jsonb,
    'active'
  );

  INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, advice, medicines, status)
  VALUES (
    v_rahul, v_anjali,
    'Seasonal Allergic Rhinitis',
    'Avoid dust exposure. Use N95 mask outdoors. Stay hydrated.',
    '[{"name": "Cetirizine 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "2 weeks", "instructions": "Take at night"},
      {"name": "Fluticasone Nasal Spray", "dosage": "2 puffs", "frequency": "Twice daily", "duration": "1 month", "instructions": "Spray into each nostril"}]'::jsonb,
    'active'
  );

  INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, advice, medicines, status)
  VALUES (
    v_rahul, v_anjali,
    'Vitamin D Deficiency',
    'Increase sun exposure (15 min/day). Include dairy and fortified foods in diet.',
    '[{"name": "Cholecalciferol 60K IU", "dosage": "60,000 IU", "frequency": "Once weekly", "duration": "8 weeks", "instructions": "Take with fatty meal"},
      {"name": "Calcium Carbonate 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "3 months", "instructions": "Take after lunch and dinner"}]'::jsonb,
    'active'
  );

  -- Prescription for Kavitha (so doctor sees multiple patients)
  IF v_kavitha IS NOT NULL THEN
    INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, advice, medicines, status)
    VALUES (
      v_kavitha, v_anjali,
      'Type 2 Diabetes - Controlled',
      'Monitor blood sugar daily. Low-carb diet. Walk 30 min daily.',
      '[{"name": "Metformin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "Ongoing", "instructions": "Take with meals"},
        {"name": "Glimepiride 1mg", "dosage": "1mg", "frequency": "Once daily", "duration": "3 months", "instructions": "Take before breakfast"}]'::jsonb,
      'active'
    );
  END IF;

  -- =============================================
  -- MEDICINE REMINDERS (for adherence tracking)
  -- =============================================
  -- Create reminders for the past week (mix of taken, skipped, pending)
  INSERT INTO medicine_reminders (patient_id, prescription_id, medicine_name, scheduled_time, status)
  SELECT v_rahul,
    (SELECT id FROM prescriptions WHERE patient_id = v_rahul AND diagnosis LIKE '%Angina%' LIMIT 1),
    'Aspirin 75mg',
    (CURRENT_DATE - i) + TIME '08:00',
    CASE
      WHEN i = 0 THEN 'pending'
      WHEN i % 7 = 3 THEN 'skipped'
      ELSE 'taken'
    END
  FROM generate_series(0, 13) AS i;

  INSERT INTO medicine_reminders (patient_id, prescription_id, medicine_name, scheduled_time, status)
  SELECT v_rahul,
    (SELECT id FROM prescriptions WHERE patient_id = v_rahul AND diagnosis LIKE '%Angina%' LIMIT 1),
    'Atorvastatin 10mg',
    (CURRENT_DATE - i) + TIME '21:00',
    CASE
      WHEN i = 0 THEN 'pending'
      WHEN i % 5 = 2 THEN 'skipped'
      ELSE 'taken'
    END
  FROM generate_series(0, 13) AS i;

  -- Kavitha reminders for adherence
  IF v_kavitha IS NOT NULL THEN
    INSERT INTO medicine_reminders (patient_id, prescription_id, medicine_name, scheduled_time, status)
    SELECT v_kavitha,
      (SELECT id FROM prescriptions WHERE patient_id = v_kavitha LIMIT 1),
      'Metformin 500mg',
      (CURRENT_DATE - i) + TIME '09:00',
      CASE WHEN i = 0 THEN 'pending' WHEN i % 3 = 0 THEN 'skipped' ELSE 'taken' END
    FROM generate_series(0, 9) AS i;
  END IF;

  -- Arjun reminders
  IF v_arjun IS NOT NULL THEN
    INSERT INTO medicine_reminders (patient_id, prescription_id, medicine_name, scheduled_time, status)
    SELECT v_arjun, NULL, 'Amlodipine 5mg',
      (CURRENT_DATE - i) + TIME '08:30',
      CASE WHEN i = 0 THEN 'pending' ELSE 'taken' END
    FROM generate_series(0, 6) AS i;
  END IF;

  -- =============================================
  -- LAB TESTS (2-3 completed for Rahul)
  -- =============================================
  INSERT INTO lab_tests (patient_id, doctor_id, test_name, category, priority, status, results, notes, ordered_at, completed_at)
  VALUES (
    v_rahul, v_anjali,
    'Complete Blood Count (CBC)', 'Hematology', 'routine', 'completed',
    '{"hemoglobin": "14.2 g/dL", "wbc": "7,200 /µL", "platelets": "2.5 lakh/µL", "rbc": "5.1 million/µL"}'::jsonb,
    'All values within normal range.',
    CURRENT_DATE - 14, CURRENT_DATE - 12
  );

  INSERT INTO lab_tests (patient_id, doctor_id, test_name, category, priority, status, results, notes, ordered_at, completed_at)
  VALUES (
    v_rahul, v_anjali,
    'Lipid Profile', 'Biochemistry', 'routine', 'completed',
    '{"total_cholesterol": "210 mg/dL", "ldl": "130 mg/dL", "hdl": "48 mg/dL", "triglycerides": "165 mg/dL"}'::jsonb,
    'LDL slightly elevated. Dietary modifications recommended.',
    CURRENT_DATE - 14, CURRENT_DATE - 11
  );

  INSERT INTO lab_tests (patient_id, doctor_id, test_name, category, priority, status, results, notes, ordered_at, completed_at)
  VALUES (
    v_rahul, v_anjali,
    'Vitamin D (25-OH)', 'Biochemistry', 'routine', 'completed',
    '{"vitamin_d": "18 ng/mL", "status": "Deficient (< 20 ng/mL)"}'::jsonb,
    'Deficient. Supplementation started.',
    CURRENT_DATE - 21, CURRENT_DATE - 18
  );

  -- =============================================
  -- HEALTH VITALS (past 2 weeks for chart)
  -- =============================================
  -- Blood Pressure Systolic readings over 2 weeks
  INSERT INTO health_vitals (user_id, metric_type, value, recorded_at) VALUES
    (v_rahul, 'bp_systolic', 128, NOW() - INTERVAL '14 days'),
    (v_rahul, 'bp_systolic', 132, NOW() - INTERVAL '12 days'),
    (v_rahul, 'bp_systolic', 126, NOW() - INTERVAL '10 days'),
    (v_rahul, 'bp_systolic', 130, NOW() - INTERVAL '7 days'),
    (v_rahul, 'bp_systolic', 124, NOW() - INTERVAL '3 days');

  -- Blood Pressure Diastolic
  INSERT INTO health_vitals (user_id, metric_type, value, recorded_at) VALUES
    (v_rahul, 'bp_diastolic', 84, NOW() - INTERVAL '14 days'),
    (v_rahul, 'bp_diastolic', 88, NOW() - INTERVAL '12 days'),
    (v_rahul, 'bp_diastolic', 82, NOW() - INTERVAL '10 days'),
    (v_rahul, 'bp_diastolic', 85, NOW() - INTERVAL '7 days'),
    (v_rahul, 'bp_diastolic', 80, NOW() - INTERVAL '3 days');

  -- Heart Rate
  INSERT INTO health_vitals (user_id, metric_type, value, recorded_at) VALUES
    (v_rahul, 'heart_rate', 78, NOW() - INTERVAL '14 days'),
    (v_rahul, 'heart_rate', 82, NOW() - INTERVAL '12 days'),
    (v_rahul, 'heart_rate', 75, NOW() - INTERVAL '10 days'),
    (v_rahul, 'heart_rate', 80, NOW() - INTERVAL '7 days'),
    (v_rahul, 'heart_rate', 72, NOW() - INTERVAL '3 days');

  -- SpO2
  INSERT INTO health_vitals (user_id, metric_type, value, recorded_at) VALUES
    (v_rahul, 'spo2', 97, NOW() - INTERVAL '14 days'),
    (v_rahul, 'spo2', 96, NOW() - INTERVAL '10 days'),
    (v_rahul, 'spo2', 98, NOW() - INTERVAL '7 days'),
    (v_rahul, 'spo2', 97, NOW() - INTERVAL '3 days');

  -- =============================================
  -- ALERTS (different severities for Rahul)
  -- =============================================
  INSERT INTO alerts (user_id, title, message, severity, read, created_at) VALUES
    (v_rahul, 'Appointment Confirmed', 'Your appointment with Dr. Anjali Mehta on ' || TO_CHAR(CURRENT_DATE + 5, 'DD Mon YYYY') || ' at 02:30 PM has been confirmed.', 'info', false, NOW() - INTERVAL '2 hours'),
    (v_rahul, 'Lab Results Ready', 'Your Lipid Profile results are now available. LDL is slightly elevated — please review with your doctor.', 'warning', false, NOW() - INTERVAL '1 day'),
    (v_rahul, 'Vitals Warning', 'High Systolic Blood Pressure detected (132). Please monitor and consult your doctor if it persists.', 'warning', false, NOW() - INTERVAL '2 days'),
    (v_rahul, 'Prescription Updated', 'Dr. Anjali Mehta has prescribed Cholecalciferol 60K IU for Vitamin D Deficiency.', 'info', true, NOW() - INTERVAL '4 days'),
    (v_rahul, 'AI Risk Alert: Warning', 'Mild cardiac risk detected based on your recent assessment. Maintain medication adherence and follow up.', 'critical', false, NOW() - INTERVAL '5 days');

  -- =============================================
  -- BLOOD DONORS (3 donors in Jaipur including Rahul)
  -- =============================================
  -- Rahul as O+ donor
  INSERT INTO blood_donors (user_id, blood_group, weight, age, city, last_donation_date, is_active, total_donations)
  VALUES (v_rahul, 'O+', 72, 28, 'Jaipur', CURRENT_DATE - 120, true, 3)
  ON CONFLICT DO NOTHING;

  -- Kavitha as A+ donor
  IF v_kavitha IS NOT NULL THEN
    INSERT INTO blood_donors (user_id, blood_group, weight, age, city, last_donation_date, is_active, total_donations)
    VALUES (v_kavitha, 'A+', 58, 35, 'Jaipur', CURRENT_DATE - 90, true, 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Arjun as B+ donor
  IF v_arjun IS NOT NULL THEN
    INSERT INTO blood_donors (user_id, blood_group, weight, age, city, last_donation_date, is_active, total_donations)
    VALUES (v_arjun, 'B+', 80, 45, 'Jaipur', CURRENT_DATE - 200, true, 5)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Record a donation for Rahul
  INSERT INTO blood_donations (donor_id, donation_date, units_donated, hospital, notes)
  SELECT bd.id, CURRENT_DATE - 120, 1, 'SMS Hospital, Jaipur', 'Routine voluntary donation'
  FROM blood_donors bd WHERE bd.user_id = v_rahul LIMIT 1;

  INSERT INTO blood_donations (donor_id, donation_date, units_donated, hospital, notes)
  SELECT bd.id, CURRENT_DATE - 240, 1, 'Fortis Hospital, Jaipur', 'Camp donation'
  FROM blood_donors bd WHERE bd.user_id = v_rahul LIMIT 1;

  INSERT INTO blood_donations (donor_id, donation_date, units_donated, hospital, notes)
  SELECT bd.id, CURRENT_DATE - 365, 1, 'Sawai Man Singh Hospital', 'Emergency replacement'
  FROM blood_donors bd WHERE bd.user_id = v_rahul LIMIT 1;

  -- =============================================
  -- DOCTOR AVAILABILITY (Dr. Anjali schedule)
  -- =============================================
  INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  VALUES
    (v_anjali, 1, '09:00', '13:00', 30, true),  -- Monday
    (v_anjali, 2, '09:00', '13:00', 30, true),  -- Tuesday
    (v_anjali, 3, '14:00', '18:00', 30, true),  -- Wednesday
    (v_anjali, 4, '09:00', '13:00', 30, true),  -- Thursday
    (v_anjali, 5, '09:00', '12:00', 30, true),  -- Friday
    (v_anjali, 6, '10:00', '13:00', 30, true)   -- Saturday
  ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    slot_duration_minutes = EXCLUDED.slot_duration_minutes,
    is_active = EXCLUDED.is_active;

  IF v_rajan IS NOT NULL THEN
    INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
    VALUES
      (v_rajan, 1, '10:00', '14:00', 30, true),
      (v_rajan, 3, '10:00', '14:00', 30, true),
      (v_rajan, 5, '10:00', '14:00', 30, true)
    ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
      start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_active = EXCLUDED.is_active;
  END IF;

  -- =============================================
  -- HEALTH ASSESSMENTS (so chart shows data)
  -- =============================================
  INSERT INTO health_assessments (patient_id, symptoms, predictions, risk_score, risk_level, risk_factors, recommendations, alerts, created_at) VALUES
  (
    v_rahul,
    '["chest pain", "shortness of breath", "fatigue"]'::jsonb,
    '[{"disease": "angina", "confidence": 0.72}, {"disease": "heart failure", "confidence": 0.15}]'::jsonb,
    55, 'Moderate',
    '["Elevated Blood Pressure"]'::jsonb,
    '{"diets": ["Heart-healthy Mediterranean diet", "Omega-3 rich foods (salmon, walnuts)"], "medications": ["Aspirin", "Nitrates as needed"], "workouts": ["Light walking 20 min/day"], "precautions": ["Avoid heavy lifting", "Monitor chest symptoms"]}'::jsonb,
    '[{"type": "Warning", "message": "Cardiac condition suspected (angina). Avoid exertion."}]'::jsonb,
    NOW() - INTERVAL '5 days'
  ),
  (
    v_rahul,
    '["headache", "fatigue", "nausea"]'::jsonb,
    '[{"disease": "common cold", "confidence": 0.65}, {"disease": "acute sinusitis", "confidence": 0.20}]'::jsonb,
    15, 'Low',
    '[]'::jsonb,
    '{"diets": ["Warm fluids", "Vitamin C rich fruits"], "medications": ["Paracetamol 500mg", "Steam inhalation"], "workouts": ["Complete rest"], "precautions": ["Stay hydrated", "Avoid cold beverages"]}'::jsonb,
    '[]'::jsonb,
    NOW() - INTERVAL '12 days'
  );

  RAISE NOTICE 'Seed data inserted successfully for demo accounts!';

END $$;
