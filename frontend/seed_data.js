/**
 * Patient Companion Pro — Rich Indian Seed Data
 *
 * Strategy: Signs in as each user to insert their own records,
 * satisfying Supabase RLS policies without needing the service role key.
 *
 * Run: node --experimental-vm-modules seed_data.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════ */
/*   USER DEFINITIONS                         */
/* ══════════════════════════════════════════ */
const DOCTORS = [
  { key: 'anjali', email: 'dr.anjali@email.com',  password: 'password123', name: 'Dr. Anjali Mehta',       specialization: 'Cardiologist',   qualification: 'MD, DM Cardiology — AIIMS Delhi',     hospital: 'Apollo Hospitals, Delhi',        consultation_fee: 800, phone: '+91 98110 34521', gender: 'female' },
  { key: 'rajan',  email: 'dr.rajan@email.com',   password: 'password123', name: 'Dr. Rajan Nair',         specialization: 'Pulmonologist',  qualification: 'MD, DNB Pulmonology — CMC Vellore',   hospital: 'Fortis Hospital, Bangalore',     consultation_fee: 700, phone: '+91 94482 67890', gender: 'male'   },
  { key: 'priya',  email: 'dr.priya@email.com',   password: 'password123', name: 'Dr. Priya Subramaniam', specialization: 'Neurologist',    qualification: 'MD, DM Neurology — NIMHANS Bangalore', hospital: 'Manipal Hospitals, Chennai',     consultation_fee: 900, phone: '+91 99400 11223', gender: 'female' },
];

const PATIENTS = [
  { key: 'rahul',   email: 'rahul.sharma@email.com',  password: 'password123', name: 'Rahul Sharma',   age: 47, gender: 'male',   blood_group: 'B+', phone: '+91 98765 43210', allergies: ['Penicillin', 'Sulfa drugs'],       chronic_conditions: ['Hypertension', 'Diabetes Type 2'] },
  { key: 'kavitha', email: 'kavitha.reddy@email.com', password: 'password123', name: 'Kavitha Reddy',  age: 34, gender: 'female', blood_group: 'O+', phone: '+91 91234 56789', allergies: ['Aspirin'],                          chronic_conditions: ['Asthma'] },
  { key: 'arjun',   email: 'arjun.patel@email.com',   password: 'password123', name: 'Arjun Patel',    age: 62, gender: 'male',   blood_group: 'A+', phone: '+91 70701 88899', allergies: [],                                   chronic_conditions: ['Heart Disease', 'Hypothyroidism', 'Arthritis'] },
];

/* ══════════════════════════════════════════ */
/*   HELPERS                                  */
/* ══════════════════════════════════════════ */

/** Creates a fresh client (each session is independent) */
const makeClient = () => createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false }
});

/** Sign up a user, wait, update profile, return { client, uid } */
async function provisionUser(userData, role) {
  const sb = makeClient();
  const { data, error } = await sb.auth.signUp({ email: userData.email, password: userData.password });
  if (error) { console.error(`  ❌ signUp ${userData.email}: ${error.message}`); return null; }

  const uid = data.user.id;
  console.log(`  ✅ Created: ${userData.name} (${uid})`);
  await delay(1500); // wait for DB trigger to create profile row

  const profilePayload = {
    name: userData.name,
    phone: userData.phone,
    gender: userData.gender,
    ...(role === 'doctor' ? {
      role: 'doctor',
      specialization: userData.specialization,
      qualification: userData.qualification,
      hospital: userData.hospital,
      consultation_fee: userData.consultation_fee,
    } : {
      role: 'patient',
      age: userData.age,
      blood_group: userData.blood_group,
      allergies: userData.allergies,
      chronic_conditions: userData.chronic_conditions,
    })
  };

  const { error: pe } = await sb.from('profiles').update(profilePayload).eq('id', uid);
  if (pe) console.error(`  ❌ Profile update for ${userData.name}: ${pe.message}`);
  else console.log(`  📝 Profile updated: ${userData.name}`);

  return { client: sb, uid, email: userData.email, password: userData.password };
}

/** Sign in as a user and return an authenticated client */
async function signInAs(email, password) {
  const sb = makeClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { console.error(`  ❌ signIn ${email}: ${error.message}`); return null; }
  return { client: sb, uid: data.user.id };
}

/* ══════════════════════════════════════════ */
/*   MAIN                                     */
/* ══════════════════════════════════════════ */
async function seed() {
  console.log('\n🌱  Patient Companion Pro — Seeding started...\n');

  /* ── Step 1: Provision doctors ── */
  console.log('👨‍⚕️  Provisioning doctors...');
  const doctors = {};
  for (const doc of DOCTORS) {
    const result = await provisionUser(doc, 'doctor');
    if (result) doctors[doc.key] = result;
  }

  /* ── Step 2: Provision patients ── */
  console.log('\n🏥  Provisioning patients...');
  const patients = {};
  for (const pat of PATIENTS) {
    const result = await provisionUser(pat, 'patient');
    if (result) patients[pat.key] = result;
  }

  /* ── Check we have enough users ── */
  const required = ['anjali', 'rajan', 'priya', 'rahul', 'kavitha', 'arjun'];
  const missing = required.filter(k => !doctors[k] && !patients[k]);

  // Re-sign-in any that already existed (signUp would have returned session=null for existing users)
  // Try signing in as each one to get a valid session
  console.log('\n🔑  Signing in as all users to get active sessions...');
  const allUsers = { ...DOCTORS.reduce((a, d) => ({...a, [d.key]: d}), {}), ...PATIENTS.reduce((a, p) => ({...a, [p.key]: p}), {}) };
  
  for (const key of required) {
    const u = allUsers[key];
    if ((!doctors[key] && !patients[key]) || true) { // always refresh session
      const session = await signInAs(u.email, u.password);
      if (session) {
        if (['anjali','rajan','priya'].includes(key)) doctors[key] = { ...doctors[key], ...session };
        else patients[key] = { ...patients[key], ...session };
        console.log(`  ✅ Session OK: ${u.name || u.email}`);
      }
    }
  }

  const dAnjali = doctors.anjali?.uid;
  const dRajan  = doctors.rajan?.uid;
  const dPriya  = doctors.priya?.uid;
  const pRahul  = patients.rahul?.uid;
  const pKavitha = patients.kavitha?.uid;
  const pArjun  = patients.arjun?.uid;

  if (!dAnjali || !pRahul) {
    console.error('\n🚨  Critical UIDs missing — cannot seed relationship records.');
    return;
  }

  /* ── Step 3: Appointments (insert as patient since RLS checks patient_id or doctor_id) ── */
  console.log('\n📅  Creating appointments...');

  const aptDefs = [
    { as: 'rahul',   data: { patient_id: pRahul,   doctor_id: dAnjali, date: '2026-04-20', time: '10:00 AM', type: 'in-person', symptoms: 'Chest pain, dizziness, shortness of breath',     status: 'confirmed' } },
    { as: 'rahul',   data: { patient_id: pRahul,   doctor_id: dAnjali, date: '2026-03-05', time: '11:30 AM', type: 'in-person', symptoms: 'Routine follow-up for hypertension',               status: 'completed' } },
    { as: 'rahul',   data: { patient_id: pRahul,   doctor_id: dRajan,  date: '2026-04-28', time: '02:00 PM', type: 'online',    symptoms: 'Persistent cough, wheezing',                       status: 'pending'   } },
    { as: 'kavitha', data: { patient_id: pKavitha, doctor_id: dRajan,  date: '2026-04-22', time: '09:30 AM', type: 'in-person', symptoms: 'Asthma flare-up, breathlessness on exertion',      status: 'confirmed' } },
    { as: 'kavitha', data: { patient_id: pKavitha, doctor_id: dRajan,  date: '2026-03-10', time: '03:00 PM', type: 'online',    symptoms: 'Review of inhaler technique and medication',       status: 'completed' } },
    { as: 'kavitha', data: { patient_id: pKavitha, doctor_id: dAnjali, date: '2026-04-30', time: '04:15 PM', type: 'online',    symptoms: 'Heart palpitations during asthma attack',          status: 'pending'   } },
    { as: 'arjun',   data: { patient_id: pArjun,   doctor_id: dPriya,  date: '2026-04-18', time: '01:00 PM', type: 'in-person', symptoms: 'Frequent headaches, memory lapses, tingling in hands', status: 'confirmed' } },
    { as: 'arjun',   data: { patient_id: pArjun,   doctor_id: dAnjali, date: '2026-03-20', time: '10:30 AM', type: 'in-person', symptoms: 'Cardiac follow-up post angioplasty',               status: 'completed' } },
    { as: 'arjun',   data: { patient_id: pArjun,   doctor_id: dRajan,  date: '2026-02-14', time: '11:00 AM', type: 'in-person', symptoms: 'Nighttime breathlessness, sleep apnea symptoms',   status: 'completed' } },
  ];

  const createdApts = {};
  for (const apt of aptDefs) {
    const sb = patients[apt.as]?.client;
    if (!sb) { console.error(`  ❌ No client for ${apt.as}`); continue; }
    const { data, error } = await sb.from('appointments').insert([apt.data]).select().single();
    if (error) console.error(`  ❌ Apt (${apt.as}/${apt.data.date}): ${error.message}`);
    else { console.log(`  ✅ Apt: ${apt.data.date} @ ${apt.data.time} [${apt.data.status}]`); createdApts[`${apt.as}_${apt.data.date}`] = data; }
  }

  /* ── Step 4: Prescriptions (insert as doctor) ── */
  console.log('\n💊  Creating prescriptions...');

  const rxDefs = [
    {
      as: 'anjali',
      data: {
        patient_id: pRahul, doctor_id: dAnjali,
        appointment_id: createdApts['rahul_2026-03-05']?.id || null,
        diagnosis: 'Stage 2 Hypertension with Cardiac Risk',
        advice: 'Low-sodium diet. Avoid alcohol and smoking. Monitor BP twice daily. 30 min walk daily.',
        status: 'active',
        medicines: [
          { name: 'Amlodipine',           dosage: '5mg',   duration: '90 days',    instructions: 'Once daily, with or without food' },
          { name: 'Metoprolol Succinate', dosage: '25mg',  duration: '90 days',    instructions: 'Once daily in the morning' },
          { name: 'Aspirin',              dosage: '75mg',  duration: 'Indefinite', instructions: 'Once daily after breakfast' },
          { name: 'Atorvastatin',         dosage: '20mg',  duration: '90 days',    instructions: 'Once at bedtime' },
        ],
      }
    },
    {
      as: 'rajan',
      data: {
        patient_id: pKavitha, doctor_id: dRajan,
        appointment_id: createdApts['kavitha_2026-03-10']?.id || null,
        diagnosis: 'Moderate Persistent Asthma',
        advice: 'Avoid dust, cold air, and pollen. Keep reliever inhaler accessible. Track peak flow weekly.',
        status: 'active',
        medicines: [
          { name: 'Budesonide + Formoterol Inhaler', dosage: '200/6 mcg', duration: '60 days',    instructions: '2 puffs twice daily via spacer' },
          { name: 'Salbutamol Inhaler',              dosage: '100 mcg',   duration: 'As needed',  instructions: '1-2 puffs during acute attack only' },
          { name: 'Montelukast',                    dosage: '10mg',      duration: '30 days',    instructions: 'Once at bedtime' },
        ],
      }
    },
    {
      as: 'anjali',
      data: {
        patient_id: pArjun, doctor_id: dAnjali,
        appointment_id: createdApts['arjun_2026-03-20']?.id || null,
        diagnosis: 'Post-PTCA Maintenance — Triple Vessel Disease',
        advice: 'Strict cardiac rehabilitation. Avoid strenuous activity. Report any chest pain immediately.',
        status: 'active',
        medicines: [
          { name: 'Clopidogrel',    dosage: '75mg',    duration: 'Indefinite', instructions: 'Once daily after dinner' },
          { name: 'Rosuvastatin',   dosage: '40mg',    duration: 'Indefinite', instructions: 'Once at bedtime' },
          { name: 'Bisoprolol',     dosage: '5mg',     duration: 'Indefinite', instructions: 'Once in the morning' },
          { name: 'Ramipril',       dosage: '2.5mg',   duration: 'Indefinite', instructions: 'Once daily with food' },
          { name: 'Levothyroxine',  dosage: '50mcg',   duration: '90 days',   instructions: 'Fasting — 30 min before breakfast' },
        ],
      }
    },
    {
      as: 'rajan',
      data: {
        patient_id: pArjun, doctor_id: dRajan,
        appointment_id: createdApts['arjun_2026-02-14']?.id || null,
        diagnosis: 'Moderate Obstructive Sleep Apnea',
        advice: 'CPAP therapy nightly. Avoid sleeping on back. Weight management critical.',
        status: 'completed',
        medicines: [
          { name: 'Modafinil', dosage: '100mg', duration: '30 days', instructions: 'Once in the morning for daytime sleepiness' },
        ],
      }
    },
  ];

  for (const rx of rxDefs) {
    const sb = doctors[rx.as]?.client;
    if (!sb) { console.error(`  ❌ No client for doctor ${rx.as}`); continue; }
    const { error } = await sb.from('prescriptions').insert([rx.data]);
    if (error) console.error(`  ❌ Rx (${rx.as}): ${error.message}`);
    else console.log(`  ✅ Rx: ${rx.data.diagnosis.slice(0, 50)}`);
  }

  /* ── Step 5: Lab Tests (insert as doctor who ordered) ── */
  console.log('\n🔬  Creating lab tests...');

  const labDefs = [
    { as: 'anjali', data: { patient_id: pRahul,   doctor_id: dAnjali, test_name: 'Lipid Profile Panel',              category: 'Blood',       priority: 'urgent',  status: 'completed', notes: 'LDL: 145 mg/dL (High), HDL: 38 mg/dL (Low), TG: 188 mg/dL' } },
    { as: 'anjali', data: { patient_id: pRahul,   doctor_id: dAnjali, test_name: 'HbA1c (Glycated Haemoglobin)',     category: 'Blood',       priority: 'urgent',  status: 'completed', notes: '8.2% — Poor glycaemic control. Intensify diabetes management.' } },
    { as: 'anjali', data: { patient_id: pRahul,   doctor_id: dAnjali, test_name: '2D Echocardiogram',               category: 'Cardiology',  priority: 'urgent',  status: 'pending',   notes: 'Ordered to evaluate left ventricular function and EF' } },
    { as: 'anjali', data: { patient_id: pRahul,   doctor_id: dAnjali, test_name: 'Complete Blood Count (CBC)',       category: 'Blood',       priority: 'routine', status: 'completed', notes: 'WBC: 9.2k, RBC: 4.8M, Hb: 13.5 g/dL — Within normal limits' } },
    { as: 'rajan',  data: { patient_id: pKavitha, doctor_id: dRajan,  test_name: 'Pulmonary Function Test (PFT)',    category: 'Pulmonology', priority: 'urgent',  status: 'completed', notes: 'FEV1/FVC: 68% — Confirms moderate obstructive pattern' } },
    { as: 'rajan',  data: { patient_id: pKavitha, doctor_id: dRajan,  test_name: 'Chest X-Ray (PA View)',            category: 'Radiology',   priority: 'routine', status: 'completed', notes: 'Hyperinflation noted. No consolidation or pleural effusion.' } },
    { as: 'rajan',  data: { patient_id: pKavitha, doctor_id: dRajan,  test_name: 'Allergy Panel — IgE (Dust, Pollen)', category: 'Immunology', priority: 'routine', status: 'pending',  notes: 'Ordered to identify specific allergen triggers' } },
    { as: 'anjali', data: { patient_id: pArjun,   doctor_id: dAnjali, test_name: 'Coronary Angiography (Post-op)',   category: 'Cardiology',  priority: 'urgent',  status: 'completed', notes: 'Stents patent. No restenosis detected. Excellent outcome.' } },
    { as: 'priya',  data: { patient_id: pArjun,   doctor_id: dPriya,  test_name: 'MRI Brain (With Contrast)',        category: 'Neurology',   priority: 'urgent',  status: 'pending',   notes: 'Ordered to rule out cerebrovascular disease' } },
    { as: 'priya',  data: { patient_id: pArjun,   doctor_id: dPriya,  test_name: 'EEG (Electroencephalogram)',       category: 'Neurology',   priority: 'routine', status: 'pending',   notes: 'Rule out subclinical seizures given memory lapses' } },
    { as: 'anjali', data: { patient_id: pArjun,   doctor_id: dAnjali, test_name: 'Thyroid Function Test (TSH, T4)', category: 'Blood',       priority: 'routine', status: 'completed', notes: 'TSH: 6.8 mIU/L (Elevated) — Hypothyroidism confirmed. Increase Levothyroxine.' } },
    { as: 'rajan',  data: { patient_id: pArjun,   doctor_id: dRajan,  test_name: 'Polysomnography (Sleep Study)',    category: 'Pulmonology', priority: 'urgent',  status: 'completed', notes: 'AHI: 22 events/hr — Moderate OSA confirmed. CPAP recommended.' } },
  ];

  for (const lab of labDefs) {
    const sb = doctors[lab.as]?.client;
    if (!sb) { console.error(`  ❌ No client for doctor ${lab.as}`); continue; }
    const { error } = await sb.from('lab_tests').insert([lab.data]);
    if (error) console.error(`  ❌ Lab (${lab.as}): ${error.message}`);
    else console.log(`  ✅ Lab: ${lab.data.test_name}`);
  }

  /* ── Step 6: Organ Donations (insert as patient/user) ── */
  console.log('\n❤️  Creating organ donations...');

  const donationDefs = [
    { as: 'kavitha', data: { user_id: pKavitha, type: 'donor',     organ_type: 'Kidney', blood_group: 'O+', urgency: 'normal', medical_history: 'Healthy. Asthma well-controlled. Voluntary registered donor.' } },
    { as: 'arjun',   data: { user_id: pArjun,   type: 'recipient', organ_type: 'Kidney', blood_group: 'A+', urgency: 'high',   medical_history: 'CKD Stage 3, secondary to cardiac disease. On dialysis twice weekly.' } },
    { as: 'rahul',   data: { user_id: pRahul,   type: 'donor',     organ_type: 'Eyes',   blood_group: 'B+', urgency: 'normal', medical_history: 'Pledged eye donation. No eye disease. Controlled diabetic — cornea eligible.' } },
  ];

  for (const don of donationDefs) {
    const sb = patients[don.as]?.client;
    if (!sb) { console.error(`  ❌ No client for ${don.as}`); continue; }
    const { error } = await sb.from('organ_donations').insert([don.data]);
    if (error) console.error(`  ❌ Donation (${don.as}): ${error.message}`);
    else console.log(`  ✅ Donation: ${don.data.type} — ${don.data.organ_type}`);
  }

  /* ── Step 7: Alerts (insert as the patient themselves) ── */
  console.log('\n🔔  Creating alerts...');

  const alertDefs = [
    { as: 'rahul',   data: { user_id: pRahul,   title: 'AI Risk Alert: Critical',    message: 'High cardiovascular risk (81/100) detected. Please consult Dr. Anjali Mehta immediately.',                                 severity: 'critical', read: false } },
    { as: 'rahul',   data: { user_id: pRahul,   title: 'Appointment Reminder',       message: 'Upcoming appointment with Dr. Anjali Mehta on 20 Apr 2026 at 10:00 AM — Apollo Hospitals, Delhi.',                        severity: 'info',     read: false } },
    { as: 'rahul',   data: { user_id: pRahul,   title: 'Lab Result: Lipid Profile',  message: 'LDL elevated (145 mg/dL). Review with your doctor and ensure Atorvastatin adherence.',                                    severity: 'warning',  read: true  } },
    { as: 'kavitha', data: { user_id: pKavitha, title: 'AI Risk Alert: Warning',     message: 'Respiratory distress indicators found (52/100). Your asthma may be poorly controlled. Check inhaler usage.',              severity: 'warning',  read: false } },
    { as: 'kavitha', data: { user_id: pKavitha, title: 'Appointment Confirmed',      message: 'Appointment with Dr. Rajan Nair on 22 Apr 2026 at 09:30 AM confirmed at Fortis Hospital, Bangalore.',                     severity: 'info',     read: true  } },
    { as: 'kavitha', data: { user_id: pKavitha, title: 'Pending Lab Test',           message: 'Allergy Panel (IgE) test is pending. Please visit Fortis Hospital lab at your earliest convenience.',                      severity: 'warning',  read: false } },
    { as: 'arjun',   data: { user_id: pArjun,   title: 'AI Risk Alert: Critical',    message: 'CRITICAL: Severe cardiovascular synergy risk score 91/100. Multiple compounding conditions. Seek emergency evaluation.',  severity: 'critical', read: false } },
    { as: 'arjun',   data: { user_id: pArjun,   title: 'MRI Brain — Urgent Pending', message: 'MRI Brain (Contrast) ordered by Dr. Priya Subramaniam is pending. Schedule urgently at Manipal Hospitals.',              severity: 'critical', read: false } },
    { as: 'arjun',   data: { user_id: pArjun,   title: 'Kidney Donor Match Found',   message: 'Potential kidney donor match (O+ blood group) found. Contact the transplant coordinator at Manipal Hospitals urgently.',  severity: 'info',     read: false } },
    { as: 'arjun',   data: { user_id: pArjun,   title: 'Thyroid: Dose Adjustment',  message: 'TSH elevated at 6.8 mIU/L. Levothyroxine dose likely needs upward adjustment. Follow up with endocrinologist.',           severity: 'warning',  read: true  } },
  ];

  for (const al of alertDefs) {
    const sb = patients[al.as]?.client;
    if (!sb) { console.error(`  ❌ No client for ${al.as}`); continue; }
    const { error } = await sb.from('alerts').insert([al.data]);
    if (error) console.error(`  ❌ Alert (${al.as}): ${error.message}`);
    else console.log(`  ✅ Alert [${al.data.severity}]: ${al.data.title}`);
  }
  /* ═══════════ DOCTOR AVAILABILITY ═══════════ */
  console.log('\n📅  Setting up doctor availability...');

  // Mon=1 … Sat=6, Sun=0 (off for all)
  const availabilityDefs = [
    // Dr. Anjali Mehta — Mon-Fri 09:00-17:00, Sat 09:00-13:00
    { as: 'anjali', slots: [
      { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 2, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 3, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 4, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 5, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 6, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 30, is_active: true },
    ]},
    // Dr. Rajan Nair — Mon-Fri 10:00-18:00, Sat 10:00-14:00
    { as: 'rajan', slots: [
      { day_of_week: 1, start_time: '10:00', end_time: '18:00', slot_duration_minutes: 45, is_active: true },
      { day_of_week: 2, start_time: '10:00', end_time: '18:00', slot_duration_minutes: 45, is_active: true },
      { day_of_week: 3, start_time: '10:00', end_time: '18:00', slot_duration_minutes: 45, is_active: true },
      { day_of_week: 4, start_time: '10:00', end_time: '18:00', slot_duration_minutes: 45, is_active: true },
      { day_of_week: 5, start_time: '10:00', end_time: '18:00', slot_duration_minutes: 45, is_active: true },
      { day_of_week: 6, start_time: '10:00', end_time: '14:00', slot_duration_minutes: 45, is_active: true },
    ]},
    // Dr. Priya Subramaniam — Mon-Fri 08:30-16:30
    { as: 'priya', slots: [
      { day_of_week: 1, start_time: '08:30', end_time: '16:30', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 2, start_time: '08:30', end_time: '16:30', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 3, start_time: '08:30', end_time: '16:30', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 4, start_time: '08:30', end_time: '16:30', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 5, start_time: '08:30', end_time: '16:30', slot_duration_minutes: 30, is_active: true },
    ]},
  ];

  for (const doc of availabilityDefs) {
    const sb = doctors[doc.as]?.client;
    const docId = doctors[doc.as]?.id;
    if (!sb || !docId) { console.error(`  ❌ No client for ${doc.as}`); continue; }
    
    for (const slot of doc.slots) {
      const { error } = await sb.from('doctor_availability').upsert(
        { ...slot, doctor_id: docId },
        { onConflict: 'doctor_id,day_of_week' }
      );
      if (error) console.error(`  ❌ Availability (${doc.as}, day ${slot.day_of_week}): ${error.message}`);
    }
    console.log(`  ✅ ${doctors[doc.as].name || doc.as}: ${doc.slots.length} days configured`);
  }

  /* ── Summary ── */
  console.log('\n✨  Seeding complete!\n');
  console.log('   Login credentials (password: password123)\n');
  console.log('   🏥 PATIENTS');
  PATIENTS.forEach(p => console.log(`      ${p.name.padEnd(20)} ${p.email}`));
  console.log('\n   👨‍⚕️  DOCTORS');
  DOCTORS.forEach(d => console.log(`      ${d.name.padEnd(28)} ${d.email}`));
  console.log('');
}

seed().catch(console.error);
