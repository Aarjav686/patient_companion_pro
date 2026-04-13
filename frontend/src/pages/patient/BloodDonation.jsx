import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bloodBankAPI } from '../../services/api';
import { checkEligibility, BLOOD_GROUP_COLORS } from '../../utils/bloodUtils';
import { 
  Droplet, Activity, HeartPulse, History, AlertTriangle, X, 
  MapPin, Calendar, Activity as ActivityIcon, CheckCircle, Info, Plus
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { CITIES, getLocationScore } from '../../utils/locationUtils';

export default function BloodDonation() {
  const { user } = useAuth();

  // Sync blood group from user profile
  const profileBloodGroup = user?.blood_group || 'O+';
  
  const [tab, setTab] = useState('donate'); // 'donate' or 'request'
  const [loading, setLoading] = useState(true);
  
  // Donate Side State
  const [donorProfile, setDonorProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  
  // Request Side State
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Form States
  const [registerForm, setRegisterForm] = useState({
    blood_group: profileBloodGroup, weight: '', age: user?.age || '', city: '', last_donation_date: ''
  });
  const [donationForm, setDonationForm] = useState({
    donation_date: new Date().toISOString().split('T')[0], hospital: '', units_donated: 1, notes: ''
  });
  const [requestForm, setRequestForm] = useState({
    blood_group_needed: 'O+', units_required: 1, urgency: 'Routine', hospital_city: '', hospital: '', notes: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: prof }, { data: reqs }] = await Promise.all([
        bloodBankAPI.getDonorProfile().catch(() => ({ data: null })),
        bloodBankAPI.getMyRequests()
      ]);
      setDonorProfile(prof);
      setRequests(reqs || []);
      
      if (prof) {
        const { data: history } = await bloodBankAPI.getMyDonations(prof.id);
        setDonations(history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await bloodBankAPI.registerDonor({
        ...registerForm,
        weight: Number(registerForm.weight),
        age: Number(registerForm.age)
      });
      setDonorProfile(data);
      setShowRegisterModal(false);
    } catch (err) {
      alert(err.error || 'Failed to register');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordDonation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bloodBankAPI.recordDonation({
        ...donationForm,
        units_donated: Number(donationForm.units_donated),
        donor_id: donorProfile.id
      });
      setShowDonationModal(false);
      // Reload to recalculate everything
      loadData();
    } catch (err) {
      alert(err.error || 'Failed to record donation');
    } finally {
      setSaving(false);
    }
  };

  const handleRaiseRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...requestForm, units_required: Number(requestForm.units_required) };
      await bloodBankAPI.createRequest(payload);
      
      if (payload.urgency === 'Emergency') {
        const { data: allActiveDonors } = await bloodBankAPI.getAllActiveDonors();
        if (allActiveDonors) {
          // In a real system, you would filter efficiently via SQL. Here we filter locally for the prototype
          const { getCompatibleDonorGroups } = await import('../../utils/bloodUtils');
          const compatible = getCompatibleDonorGroups(payload.blood_group_needed);
          
          let alertList = allActiveDonors.filter(d => 
            compatible.includes(d.blood_group) && 
            checkEligibility(d).eligible &&
            getLocationScore(d.city, payload.hospital_city) > 0
          );
          
          // Don't alert the requester if they happen to be an eligible donor
          alertList = alertList.filter(d => d.user_id !== user.id);

          await bloodBankAPI.createEmergencyAlerts(alertList, payload.hospital, payload.blood_group_needed);
        }
      }
      
      setShowRequestModal(false);
      loadData();
    } catch (err) {
      alert(err.error || 'Failed to raise request');
    } finally {
      setSaving(false);
    }
  };

  const renderUrgencyBadge = (urgency) => {
    const cls = urgency === 'Emergency' ? 'critical' : urgency === 'Urgent' ? 'high' : 'normal';
    return <span className={`status-badge ${cls}`}>{urgency}</span>;
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         <div className="skeleton" style={{ height: '50px', width: '300px' }}></div>
         <div className="skeleton" style={{ height: '40px', width: '100%', maxWidth: '400px' }}></div>
         <div className="skeleton" style={{ height: '200px', width: '100%' }}></div>
      </div>
    );
  }

  const eligibility = checkEligibility(donorProfile);

  return (
    <div className="page-enter stagger-children">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Blood Donation</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Register as a donor or request blood during emergencies.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        <button 
          className={`btn btn-sm ${tab === 'donate' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setTab('donate')}
        >
          <Droplet size={16} /> Donate Blood
        </button>
        <button 
          className={`btn btn-sm ${tab === 'request' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setTab('request')}
        >
          <AlertTriangle size={16} /> Request Blood
        </button>
      </div>

      {tab === 'donate' && (
        <div className="tab-fade-in">
          {!donorProfile ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
                <HeartPulse size={32} />
              </div>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Become a Blood Donor</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
                One pint of blood can save up to three lives. Register today and join our network of life-savers.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => setShowRegisterModal(true)}>
                <Droplet size={18} /> Register as Donor
              </button>
            </div>
          ) : (
            <>
              {/* Donor Summary Card */}
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: 'var(--radius-lg)', 
                    background: BLOOD_GROUP_COLORS[donorProfile.blood_group] || 'var(--color-danger)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--font-size-2xl)', fontWeight: 'bold'
                  }}>
                    {donorProfile.blood_group}
                  </div>
                  
                  <div style={{ flex: '1' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <h2 style={{ margin: 0 }}>Registered Donor</h2>
                      {eligibility.eligible ? (
                        <span className="status-badge active"><CheckCircle size={12}/> Eligible to Donate</span>
                      ) : (
                        <span className="status-badge critical"><AlertTriangle size={12}/> {eligibility.reason}</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 'var(--space-5)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ActivityIcon size={14} /> Total Donations: {donorProfile.total_donations}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Last Donated: {donorProfile.last_donation_date ? formatDate(donorProfile.last_donation_date) : 'Never'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> City: {donorProfile.city}</span>
                    </div>

                    {!eligibility.eligible && eligibility.daysUntilEligible && (
                      <div style={{ marginTop: '12px', background: 'var(--color-warning-bg)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={14} /> Eligible to donate again in {eligibility.daysUntilEligible} days
                      </div>
                    )}
                  </div>
                  
                  {eligibility.eligible && (
                    <button className="btn btn-primary" onClick={() => setShowDonationModal(true)}>
                      <Droplet size={18} /> Record Donation
                    </button>
                  )}
                </div>
              </div>

              {/* Donation History List */}
              <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Donation History
              </h3>
              <div className="card">
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Hospital / Clinic</th>
                        <th>Units</th>
                        <th>Linked Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.length === 0 ? (
                        <tr><td colSpan="4" className="empty-state">No donations recorded yet</td></tr>
                      ) : (
                        donations.map(d => (
                          <tr key={d.id}>
                            <td>{formatDate(d.donation_date)}</td>
                            <td>{d.hospital}</td>
                            <td>{d.units_donated} units</td>
                            <td>{d.request_id ? <span className="status-badge normal">Matched</span> : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'request' && (
        <div className="tab-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)' }}>My Blood Requests</h3>
            <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
              <Plus size={16} /> Raise Request
            </button>
          </div>

          <div className="card">
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Urgency</th>
                    <th>Hospital</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <div className="empty-state-icon">
                          <Droplet size={24} />
                        </div>
                        <p className="empty-state-text">No blood requests raised.</p>
                      </td>
                    </tr>
                  ) : (
                    requests.map(req => (
                      <tr key={req.id}>
                        <td>{formatDate(req.created_at)}</td>
                        <td>
                          <span style={{ 
                            background: BLOOD_GROUP_COLORS[req.blood_group_needed] || '#999',
                            color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px'
                          }}>
                            {req.blood_group_needed}
                          </span>
                        </td>
                        <td>{req.units_required}</td>
                        <td>{renderUrgencyBadge(req.urgency)}</td>
                        <td>{req.hospital}</td>
                        <td><span className={`status-badge ${req.status === 'matched' ? 'active' : req.status === 'fulfilled' ? 'completed' : 'pending'}`}>{req.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Donor Registration</h3>
              <button className="modal-close" onClick={() => setShowRegisterModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleRegisterDonor}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Blood Group (from profile)</label>
                  <input className="form-input" value={registerForm.blood_group} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input type="number" className="form-input" min="18" max="65" required value={registerForm.age} onChange={e => setRegisterForm({...registerForm, age: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input type="number" className="form-input" min="50" required value={registerForm.weight} onChange={e => setRegisterForm({...registerForm, weight: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" required value={registerForm.city} onChange={e => setRegisterForm({...registerForm, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Donation Date (Optional)</label>
                  <input type="date" className="form-input" max={new Date().toISOString().split('T')[0]} value={registerForm.last_donation_date} onChange={e => setRegisterForm({...registerForm, last_donation_date: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner spinner-sm"></div> : 'Register as Donor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDonationModal && (
        <div className="modal-overlay" onClick={() => setShowDonationModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Donation</h3>
              <button className="modal-close" onClick={() => setShowDonationModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleRecordDonation}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" max={new Date().toISOString().split('T')[0]} required value={donationForm.donation_date} onChange={e => setDonationForm({...donationForm, donation_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital / Blood Bank</label>
                  <input type="text" className="form-input" required value={donationForm.hospital} onChange={e => setDonationForm({...donationForm, hospital: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Units Donated</label>
                  <input type="number" className="form-input" min="1" max="2" required value={donationForm.units_donated} onChange={e => setDonationForm({...donationForm, units_donated: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea className="form-textarea" rows={2} value={donationForm.notes} onChange={e => setDonationForm({...donationForm, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDonationModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner spinner-sm"></div> : 'Save Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Raise Blood Request</h3>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleRaiseRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {requestForm.urgency === 'Emergency' && (
                  <div style={{ background: 'var(--color-danger-bg)', borderLeft: '4px solid var(--color-danger)', padding: '12px 16px', borderRadius: '4px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-danger)', fontWeight: 500 }}>
                      Emergency requests will alert all eligible compatible donors immediately.
                    </p>
                  </div>
                )}
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Blood Group Needed</label>
                    <select className="form-select" value={requestForm.blood_group_needed} onChange={e => setRequestForm({...requestForm, blood_group_needed: e.target.value})} required>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Units Required</label>
                    <input type="number" className="form-input" min="1" required value={requestForm.units_required} onChange={e => setRequestForm({...requestForm, units_required: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" value={requestForm.urgency} onChange={e => setRequestForm({...requestForm, urgency: e.target.value})}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <select className="form-select" value={requestForm.hospital_city} onChange={e => setRequestForm({...requestForm, hospital_city: e.target.value})} required>
                      <option value="">Select City</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hospital</label>
                    <input type="text" className="form-input" required value={requestForm.hospital} onChange={e => setRequestForm({...requestForm, hospital: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Medical Notes (Optional)</label>
                  <textarea className="form-textarea" rows={3} value={requestForm.notes} onChange={e => setRequestForm({...requestForm, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className={`btn ${requestForm.urgency === 'Emergency' ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>
                  {saving ? <div className="spinner spinner-sm"></div> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
