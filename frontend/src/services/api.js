import { supabase } from '../lib/supabase';
import { generateTimeSlots } from '../lib/utils';
import { generateReminders } from '../utils/reminderUtils';

// AI Service URL — configured via environment variable for deployment
const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

// Helper to handle Supabase responses
const handleResponse = async (promise) => {
  const { data, error } = await promise;
  if (error) throw { error: error.message };
  return { data };
};

/* ── Appointments API ── */
export const appointmentsAPI = {
  getAll: () => handleResponse(
    supabase.from('appointments').select('*, patient:patient_id(name), doctor:doctor_id(name, specialization)')
  ).then(res => ({
    // Map joined fields to match what UI expects
    data: res.data.map(apt => ({
      ...apt,
      patientId: apt.patient_id,
      doctorId: apt.doctor_id,
      patientName: apt.patient?.name || 'Unknown Patient',
      doctorName: apt.doctor?.name || 'Unknown Doctor',
      specialization: apt.doctor?.specialization || 'General',
    }))
  })),
  
  getById: (id) => handleResponse(supabase.from('appointments').select('*').eq('id', id).single()),
  
  create: async (appointmentData) => {
    // Inject patient_id from current session if not provided
    if (!appointmentData.patientId) {
      const { data: { user } } = await supabase.auth.getUser();
      appointmentData.patientId = user.id;
    }
    
    const dbData = {
      patient_id: appointmentData.patientId,
      doctor_id: appointmentData.doctorId,
      date: appointmentData.date,
      time: appointmentData.time,
      type: appointmentData.type,
      symptoms: appointmentData.symptoms,
      status: 'pending'
    };
    return handleResponse(supabase.from('appointments').insert([dbData]).select().single());
  },
  
  update: (id, updateData) => handleResponse(
    supabase.from('appointments').update(updateData).eq('id', id).select().single()
  ),
  
  getSlots: async (doctorId, date) => {
    // 1. Get doctor's availability for the requested day of week
    const dayOfWeek = new Date(date).getDay();
    const { data: avail } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    if (!avail) return { data: { availableSlots: [], reason: 'Doctor is not available on this day.' } };

    // 2. Generate all slots for that availability window
    const allSlots = generateTimeSlots(avail.start_time, avail.end_time, avail.slot_duration_minutes || 30);

    // 3. Fetch already-booked appointments for that doctor on that date
    const { data: booked } = await supabase
      .from('appointments')
      .select('time')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    const bookedTimes = new Set((booked || []).map(a => a.time));

    // 4. Return only free slots
    const availableSlots = allSlots.filter(slot => !bookedTimes.has(slot));
    return { data: { availableSlots } };
  },
};

/* ── Doctors API ── */
export const doctorsAPI = {
  getAll: () => handleResponse(
    supabase.from('profiles').select('*').eq('role', 'doctor')
  ),
  
  getPatients: async (doctorId) => {
    // Unique list of patients this doctor has seen
    const { data, error } = await supabase
      .from('appointments')
      .select('patient_id, patient:patient_id(*)')
      .eq('doctor_id', doctorId);
      
    if (error) throw { error: error.message };
    
    // De-duplicate
    const uniquePatients = [];
    const ids = new Set();
    data.forEach(apt => {
      if (apt.patient && !ids.has(apt.patient_id)) {
        ids.add(apt.patient_id);
        uniquePatients.push(apt.patient);
      }
    });

    // Fetch adherence
    const { data: reminders } = await supabase.from('medicine_reminders').select('patient_id, status');
    if (reminders) {
      uniquePatients.forEach(p => {
        const pReminders = reminders.filter(r => r.patient_id === p.id && r.status !== 'pending');
        if (pReminders.length > 0) {
          const taken = pReminders.filter(r => r.status === 'taken').length;
          p.adherence = Math.round((taken / pReminders.length) * 100);
          p.adherenceFraction = `${taken} out of ${pReminders.length}`;
        } else {
          p.adherence = null;
        }
      });
    }

    return { data: uniquePatients };
  },
};

/* ── Patients API ── */
// These were highly aggregated in Express, we recreate them minimally here
export const patientsAPI = {
  getDashboard: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch recent appointments
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select('*, doctor:doctor_id(name, specialization)')
      .eq('patient_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

    // Fetch active prescriptions
    const { data: activePrescriptions } = await supabase
      .from('prescriptions')
      .select('*, doctor:doctor_id(name)')
      .eq('patient_id', user.id)
      .eq('status', 'active');
      
    // Fetch stats
    const { count: upcomingCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).eq('status', 'confirmed');
    const { count: pendingLabs } = await supabase.from('lab_tests').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).eq('status', 'pending');
    const { count: unreadAlerts } = await alertsAPI.getUnreadCount(user.id);

    // Fetch AI Assessments for Risk Trend
    const { data: assessments } = await supabase
      .from('health_assessments')
      .select('created_at, risk_score')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);
      
    // Format trend data
    const labels = [];
    const riskScores = [];
    
    if (assessments && assessments.length > 0) {
      assessments.forEach(a => {
        labels.push(new Date(a.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
        riskScores.push(a.risk_score);
      });
    } else {
      // Fallback empty UI data if none taken
      labels.push('No Assessments');
      riskScores.push(0);
    }

    return {
      data: {
        stats: {
          upcomingAppointments: upcomingCount || 0,
          activePrescriptions: activePrescriptions?.length || 0,
          pendingLabTests: pendingLabs || 0,
          unreadAlerts: unreadAlerts || 0,
        },
        healthTrend: {
          labels: labels,
          riskScore: riskScores,
        },
        recentAppointments: (recentAppointments || []).map(a => ({
          ...a, doctorName: a.doctor?.name, specialization: a.doctor?.specialization
        })),
        activePrescriptions: (activePrescriptions || []).map(p => ({
          ...p, doctorName: p.doctor?.name
        }))
      }
    };
  },

  getRecords: async (id) => {
    // Aggregates timeline of all records for the patient
    const { data: { user } } = await supabase.auth.getUser();
    const pid = id || user.id;

    const [profileRes, apts, rx, labs] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', pid).single(),
      supabase.from('appointments').select('*').eq('patient_id', pid),
      supabase.from('prescriptions').select('*').eq('patient_id', pid),
      supabase.from('lab_tests').select('*').eq('patient_id', pid)
    ]);

    // Format appointment type for display (avoid "Consultation - consultation" duplication)
    const formatAppointmentType = (type) => {
      if (!type) return 'Consultation';
      const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
      // If the type itself is 'consultation', just show 'Consultation'
      if (capitalized.toLowerCase() === 'consultation') return 'In-Person Consultation';
      return capitalized;
    };

    const timeline = [
      ...(apts.data || []).map(a => ({ type: 'appointment', date: a.date, title: formatAppointmentType(a.type), status: a.status })),
      ...(rx.data || []).map(p => ({ type: 'prescription', date: p.created_at, title: `Prescribed: ${p.diagnosis}`, status: p.status })),
      ...(labs.data || []).map(l => ({ type: 'labTest', date: l.ordered_at, title: `Lab: ${l.test_name}`, status: l.status }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date));

    // Map profile fields to camelCase for the Records UI
    const prof = profileRes.data;
    const patientData = prof ? {
      ...prof,
      bloodGroup: prof.blood_group,
      chronicConditions: prof.chronic_conditions,
    } : null;

    return {
      data: {
        patient: patientData,
        summary: {
          totalAppointments: apts.data?.length || 0,
          completedAppointments: apts.data?.filter(a=>a.status==='completed').length || 0,
          totalPrescriptions: rx.data?.length || 0,
          totalLabTests: labs.data?.length || 0,
        },
        timeline
      }
    };
  },
  
  getAlerts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }));
  },
  
  markAlertRead: (id) => handleResponse(supabase.from('alerts').update({ read: true }).eq('id', id)),
  
  getMedicineReminders: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('medicine_reminders')
        .select('*')
        .eq('patient_id', user.id)
        .order('scheduled_time', { ascending: true })
    );
  },

  updateReminderStatus: async (id, status) => {
    return handleResponse(supabase.from('medicine_reminders').update({ status }).eq('id', id).select().single());
  }
};

export const alertsAPI = {
  getUnreadCount: async (userId) => {
    const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false);
    return { count };
  },
  createAlert: async (alertData) => {
    // Expected fields: user_id, title, message, severity
    return handleResponse(supabase.from('alerts').insert([alertData]));
  }
};

/* ── Prescriptions API ── */
export const prescriptionsAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Profile indicates role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    const query = supabase.from('prescriptions').select('*, doctor:doctor_id(name), patient:patient_id(name)').order('created_at', { ascending: false });
    
    if (profile?.role === 'patient') query.eq('patient_id', user.id);
    else query.eq('doctor_id', user.id);
    
    return handleResponse(query).then(res => ({
      data: res.data.map(p => ({
        ...p,
        doctorName: p.doctor?.name,
        patientName: p.patient?.name,
        createdAt: p.created_at,   // alias for JSX consumers
      }))
    }));
  },
  
  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    const dbData = {
      patient_id: data.patientId,
      doctor_id: user.id,
      appointment_id: data.appointmentId,
      diagnosis: data.diagnosis,
      advice: data.advice,
      medicines: data.medicines,
    };
    const res = await handleResponse(supabase.from('prescriptions').insert([dbData]).select().single());
    
    // Auto-generate reminders!
    if (res.data && res.data.id && data.medicines) {
      const rxPayloads = generateReminders(res.data.id, data.patientId, data.medicines);
      if (rxPayloads.length > 0) {
        const { error } = await supabase.from('medicine_reminders').insert(rxPayloads);
        if (error) console.error("Failed to insert reminders:", error);
      }
    }
    
    return res;
  },
};

/* ── Lab Tests API ── */
export const labTestsAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    const query = supabase.from('lab_tests').select('*, doctor:doctor_id(name), patient:patient_id(name)').order('ordered_at', { ascending: false });
    if (profile?.role === 'patient') query.eq('patient_id', user.id);
    else query.eq('doctor_id', user.id);
    
    return handleResponse(query).then(res => ({
      data: res.data.map(t => ({
        ...t, doctorName: t.doctor?.name, patientName: t.patient?.name
      }))
    }));
  },
  
  create: async (data, file) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let reportUrl = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `reports/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lab_reports')
        .upload(filePath, file);
        
      if (uploadError) throw { error: uploadError.message };
      
      const { data: { publicUrl } } = supabase.storage
        .from('lab_reports')
        .getPublicUrl(filePath);
        
      reportUrl = publicUrl;
    }
    
    const dbData = {
      patient_id: data.patientId,
      doctor_id: user.id,
      test_name: data.testName,
      category: data.category,
      priority: data.priority,
      status: reportUrl ? 'completed' : 'pending',
      notes: data.notes,
      report_url: reportUrl
    };
    
    return handleResponse(supabase.from('lab_tests').insert([dbData]));
  },
};

/* ── Organ Donation API ── */
export const organDonationAPI = {
  register: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    const dbData = {
      user_id: user.id,
      type: data.type,
      organ_type: data.organType,
      blood_group: data.bloodGroup,
      urgency: data.urgency,
      medical_history: data.medicalHistory
    };
    return handleResponse(supabase.from('organ_donations').insert([dbData]).select().single());
  },
  
  getDonors: () => handleResponse(supabase.from('organ_donations').select('*, user:user_id(name)').eq('type', 'donor')).then(res => ({
    data: res.data.map(d => ({ ...d, userName: d.user?.name }))
  })),
  
  getRecipients: () => handleResponse(supabase.from('organ_donations').select('*, user:user_id(name)').eq('type', 'recipient')).then(res => ({
    data: res.data.map(r => ({ ...r, userName: r.user?.name }))
  })),
  
  getMatches: async (recipientId) => {
    // Simple matching logic
    const { data: recipient } = await supabase.from('organ_donations').select('*, user:user_id(name)').eq('id', recipientId).single();
    if (!recipient) throw { error: 'Recipient not found' };
    
    const { data: donors } = await supabase.from('organ_donations')
      .select('*, user:user_id(name)')
      .eq('type', 'donor')
      .eq('organ_type', recipient.organ_type)
      .eq('blood_group', recipient.blood_group); // Exact blood match for simplicity
      
    recipient.userName = recipient.user?.name;
    const matches = (donors || []).map(d => ({
      compatibility: 95, // mock high compatibility score
      donor: { ...d, userName: d.user?.name }
    }));
      
    return { data: { recipient, matches } };
  },
};

/* ── AI Engine API ── */
export const aiAPI = {
  assess: async (symptoms, vitals) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    // Call local FastAPI model
    const payload = {
      symptoms: symptoms,
      profile: {
        age: profile?.age || vitals.age || 30,
        gender: profile?.gender || vitals.gender || 'male',
        bp: vitals.bp || 'Normal',
        cholesterol: vitals.cholesterol || 'Normal'
      }
    };

    const res = await fetch(`${AI_BASE_URL}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw { error: 'Failed to communicate with AI Backend' };
    const result = await res.json();

    // Log assessment outcome to Supabase
    const dbAssessment = {
      patient_id: user.id,
      symptoms: symptoms,
      predictions: result.predictions,
      risk_score: result.risk.riskScore,
      risk_level: result.risk.level,
      risk_factors: result.risk.factors,
      recommendations: result.recommendations,
      alerts: result.alerts
    };

    const { error: insertError } = await supabase.from('health_assessments').insert([dbAssessment]);
    if (insertError) console.error('Failed to save assessment:', insertError);

    // Check if we need to spawn critical user alerts
    if (result.alerts && result.alerts.length > 0) {
      const alertInserts = result.alerts.map(a => ({
        user_id: user.id,
        title: `AI Risk Alert: ${a.type}`,
        message: a.message,
        severity: a.type.toLowerCase() === 'critical' ? 'critical' : 'warning'
      }));
      await supabase.from('alerts').insert(alertInserts);
    }

    return { data: result };
  },

  getHistory: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('health_assessments').select('*').eq('patient_id', user.id).order('created_at', { ascending: true })
    );
  },

  getSymptoms: async () => {
    const res = await fetch(`${AI_BASE_URL}/symptoms`);
    if (!res.ok) throw { error: 'Failed to fetch symptoms dictionary' };
    return await res.json();
  }
};

/* ── Doctor Availability API ── */
export const doctorAvailabilityAPI = {
  getMySchedule: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('doctor_availability').select('*').eq('doctor_id', user.id).order('day_of_week')
    );
  },

  upsert: async (slots) => {
    // slots: array of { day_of_week, start_time, end_time, slot_duration_minutes, is_active }
    const { data: { user } } = await supabase.auth.getUser();
    const rows = slots.map(s => ({ ...s, doctor_id: user.id }));
    return handleResponse(
      supabase.from('doctor_availability').upsert(rows, { onConflict: 'doctor_id,day_of_week' }).select()
    );
  },

  deleteDay: async (dayOfWeek) => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('doctor_availability').delete().eq('doctor_id', user.id).eq('day_of_week', dayOfWeek)
    );
  },
};

/* ── Blood Bank API ── */
export const bloodBankAPI = {
  // Donor actions
  getDonorProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('blood_donors').select('*').eq('user_id', user.id).single()
    );
  },

  registerDonor: async (donorData) => {
    const { data: { user } } = await supabase.auth.getUser();
    // Always sync blood group from profile to prevent mismatches
    const { data: profile } = await supabase.from('profiles').select('blood_group').eq('id', user.id).single();
    const dbData = {
      user_id: user.id,
      blood_group: profile?.blood_group || donorData.blood_group,
      weight: donorData.weight,
      age: donorData.age,
      city: donorData.city,
      last_donation_date: donorData.last_donation_date || null,
      is_active: true,
      total_donations: 0
    };
    return handleResponse(supabase.from('blood_donors').insert([dbData]).select().single());
  },

  getMyDonations: async (donorId) => {
    return handleResponse(
      supabase.from('blood_donations').select('*').eq('donor_id', donorId).order('donation_date', { ascending: false })
    );
  },

  recordDonation: async (donationData) => {
    // donationData expects: donor_id, donation_date, hospital, units_donated, notes
    const { data, error } = await supabase.from('blood_donations').insert([donationData]).select().single();
    if (error) throw { error: error.message };

    // Update donor stats
    await supabase.from('blood_donors').update({
      last_donation_date: donationData.donation_date,
      // Unfortunately we can't easily increment via standard update without fetching first without a custom RPC.
      // Easiest is to let the user compute it, or we rely on the UI to send the new total or we fetch and update.
    }).eq('id', donationData.donor_id);
    
    // Proper increment of total_donations
    const { data: currentDonor } = await supabase.from('blood_donors').select('total_donations').eq('id', donationData.donor_id).single();
    if (currentDonor) {
      await supabase.from('blood_donors').update({
        total_donations: currentDonor.total_donations + (donationData.units_donated || 1)
      }).eq('id', donationData.donor_id);
    }
    
    return { data };
  },

  // Patient requesting actions
  getMyRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('blood_requests').select('*').eq('patient_id', user.id).order('created_at', { ascending: false })
    );
  },

  createRequest: async (requestData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const dbData = {
      patient_id: user.id,
      blood_group_needed: requestData.blood_group_needed,
      units_required: requestData.units_required,
      urgency: requestData.urgency,
      hospital: requestData.hospital,
      hospital_city: requestData.hospital_city,
      notes: requestData.notes,
      status: 'pending'
    };
    
    const { data, error } = await supabase.from('blood_requests').insert([dbData]).select().single();
    if (error) throw { error: error.message };

    // If it's emergency, trigger an alert immediately. The doctor or system theoretically handles finding matching, but 
    // per instructions we must insert an alert for all compatible eligible donors right now.
    if (dbData.urgency === 'Emergency') {
      // 1. Get compatible donor groups.
      // (This is tricky since we defined the compatible groups logic in bloodUtils, but here we run it purely in frontend.
      // For simplicity, we just fetch ALL active donors, filter locally, and insert alerts).
      const { data: allDonors } = await supabase.from('blood_donors').select('user_id, blood_group, age, weight, last_donation_date').eq('is_active', true);
      // Let the frontend component handle the actual alert spawning by calling a helper after createRequest
      // so we don't have to duplicate the checkEligibility logic here.
    }
    
    return { data };
  },

  // Doctor side actions
  getAllActiveDonors: async () => {
    return handleResponse(
      supabase.from('blood_donors').select('*, user:user_id(name)').eq('is_active', true).order('last_donation_date', { ascending: true })
    ).then(res => ({
      data: res.data.map(d => ({ ...d, name: d.user?.name }))
    }));
  },

  getPendingRequests: async () => {
    return handleResponse(
      supabase.from('blood_requests').select('*, patient:patient_id(name)').in('status', ['pending']).order('created_at', { ascending: true })
    ).then(res => ({
      data: res.data.map(r => ({ ...r, patientName: r.patient?.name }))
    }));
  },

  matchDonor: async (requestId, donorId, hospital) => {
    // Update the blood request
    const { data, error } = await supabase.from('blood_requests').update({
      status: 'matched',
      matched_donor_id: donorId
    }).eq('id', requestId).select().single();
    
    if (error) throw { error: error.message };

    // Get donor user_id
    const { data: donor } = await supabase.from('blood_donors').select('user_id').eq('id', donorId).single();
    
    if (donor) {
      // Alert to donor
      await alertsAPI.createAlert({
        user_id: donor.user_id,
        title: 'Matched for Donation',
        message: `You have been matched for a blood donation request at ${hospital}. Please contact the hospital.`,
        severity: 'warning'
      });
    }

    // Alert to patient
    await alertsAPI.createAlert({
      user_id: data.patient_id,
      title: 'Blood Match Found',
      message: 'Your blood request has been matched. The donor has been notified.',
      severity: 'info'
    });

    return { data };
  },
  
  createEmergencyAlerts: async (donorsToAlert, hospital, bloodGroupNeeded) => {
    if (!donorsToAlert || donorsToAlert.length === 0) return { data: null };
    
    const inserts = donorsToAlert.map(donor => ({
      user_id: donor.user_id,
      title: 'Emergency Blood Request',
      message: `Emergency ${bloodGroupNeeded} blood needed at ${hospital}. You are a compatible donor.`,
      severity: 'warning'
    }));
    
    return handleResponse(supabase.from('alerts').insert(inserts));
  }
};

/* ── Vitals Tracker API ── */
export const vitalsAPI = {
  getVitals: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return handleResponse(
      supabase.from('health_vitals').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true })
    );
  },

  logVitals: async (vitalsList) => {
    // vitalsList expected to be array of: { metric_type, value, recorded_at }
    const { data: { user } } = await supabase.auth.getUser();
    
    const dbPayload = vitalsList.map(v => ({
      user_id: user.id,
      metric_type: v.metric_type,
      value: v.value,
      recorded_at: v.recorded_at ? `${v.recorded_at}T12:00:00Z` : undefined
    }));

    const { data, error } = await supabase.from('health_vitals').insert(dbPayload).select();
    if (error) throw { error: error.message };

    // Threshold Check Logic
    const alertsToCreate = [];
    
    const checkThresh = (metric, val, condition, msg) => {
      if (condition) {
        alertsToCreate.push({
          user_id: user.id,
          title: 'Vitals Warning',
          message: msg,
          severity: 'warning'
        });
      }
    };

    vitalsList.forEach(v => {
      const val = Number(v.value);
      if (v.metric_type === 'bp_systolic') checkThresh('BP', val, val > 140, `High Systolic Blood Pressure detected (${val}).`);
      if (v.metric_type === 'bp_diastolic') checkThresh('BP', val, val > 90, `High Diastolic Blood Pressure detected (${val}).`);
      if (v.metric_type === 'heart_rate') checkThresh('HR', val, val > 100 || val < 50, `Abnormal Heart Rate detected (${val} bpm).`);
      if (v.metric_type === 'blood_sugar') checkThresh('Sugar', val, val > 200, `High Blood Sugar detected (${val} mg/dL).`);
      if (v.metric_type === 'spo2') checkThresh('SpO2', val, val < 90, `Low Oxygen Saturation detected (${val}%).`);
      if (v.metric_type === 'temperature') checkThresh('Temp', val, val > 100.4, `Fever detected (${val}°F).`);
    });

    if (alertsToCreate.length > 0) {
      await supabase.from('alerts').insert(alertsToCreate);
    }

    return { data };
  }
};
