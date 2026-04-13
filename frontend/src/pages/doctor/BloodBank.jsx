import { useState, useEffect } from 'react';
import { bloodBankAPI } from '../../services/api';
import { checkEligibility, calculateMatchScore, BLOOD_GROUP_COLORS } from '../../utils/bloodUtils';
import { getLocationScore } from '../../utils/locationUtils';
import { useAuth } from '../../context/AuthContext';
import { Droplet, Search, AlertTriangle, X, ShieldCheck, CheckCircle, MapPin } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function BloodBank() {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('my-city'); // 'my-city', 'nearby', 'all'
  
  // Modals and Match State
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [suggestedDonors, setSuggestedDonors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: dList }, { data: rList }] = await Promise.all([
        bloodBankAPI.getAllActiveDonors(),
        bloodBankAPI.getPendingRequests()
      ]);
      setDonors(dList || []);
      setRequests(rList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDonors = () => {
    return donors.filter(d => {
      if (locationFilter === 'all') return true;
      const score = getLocationScore(d.city, user?.city || '');
      if (locationFilter === 'my-city') return score === 30;
      if (locationFilter === 'nearby') return score >= 15;
      return true;
    });
  };

  const getDonorCountsByGroup = () => {
    const counts = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 };
    getFilteredDonors().forEach(d => {
      if (checkEligibility(d).eligible) {
        if (counts[d.blood_group] !== undefined) {
          counts[d.blood_group]++;
        }
      }
    });
    return counts;
  };

  const handleOpenMatchModal = (req) => {
    setSelectedRequest(req);
    
    // Calculate matching score for all active donors
    const rankedDonors = donors.map(d => ({
      ...d,
      matchScore: calculateMatchScore(d, req)
    }))
    // Must be at least compatible (score > 0)
    .filter(d => d.matchScore >= 70) 
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3); // Top 3
    
    setSuggestedDonors(rankedDonors);
    setShowMatchModal(true);
  };

  const handleConfirmMatch = async (donorId) => {
    setSaving(true);
    try {
      await bloodBankAPI.matchDonor(selectedRequest.id, donorId, selectedRequest.hospital);
      setShowMatchModal(false);
      loadData();
    } catch (err) {
      alert(err.error || 'Failed to confirm match');
    } finally {
      setSaving(false);
    }
  };

  const counts = getDonorCountsByGroup();

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         <div className="skeleton" style={{ height: '200px', width: '100%' }}></div>
         <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
      </div>
    );
  }

  return (
    <div className="page-enter stagger-children">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Blood Bank Overview</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Manage blood requests, monitor inventory, and match donors.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button className={`btn btn-sm ${locationFilter === 'my-city' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLocationFilter('my-city')}>My City</button>
          <button className={`btn btn-sm ${locationFilter === 'nearby' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLocationFilter('nearby')}>Nearby</button>
          <button className={`btn btn-sm ${locationFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLocationFilter('all')}>All Regions</button>
        </div>
      </div>

      {/* Blood Availability Grid */}
      <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-3)' }}>Eligible Inventory {locationFilter !== 'all' ? `(${user?.city || 'Local'})` : ''}</h3>
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: 'var(--space-3)', marginBottom: 'var(--space-6)' 
      }}>
        {Object.entries(counts).map(([bg, count]) => {
          const colorClass = count > 2 ? 'success' : count > 0 ? 'warning' : 'danger';
          return (
            <div key={bg} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center', borderTop: `4px solid ${BLOOD_GROUP_COLORS[bg] || '#999'}` }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: BLOOD_GROUP_COLORS[bg] || '#999' }}>
                {bg}
              </div>
              <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: '900', margin: 'var(--space-2) 0', color: `var(--color-${colorClass})` }}>
                {count}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Donors Ready
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Requests */}
      <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-3)' }}>Pending Urgent Requests</h3>
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Raised</th>
                <th>Patient</th>
                <th>Group Needed</th>
                <th>Urgency</th>
                <th>Hospital</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <ShieldCheck size={24} style={{ color: 'var(--color-success)', marginBottom: '8px' }}/>
                    <p>No pending blood requests at this time.</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td>{formatDate(req.created_at)}</td>
                    <td style={{ fontWeight: 500 }}>{req.patientName}</td>
                    <td>
                      <span style={{ 
                        background: BLOOD_GROUP_COLORS[req.blood_group_needed] || '#999',
                        color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px'
                      }}>
                        {req.blood_group_needed}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${req.urgency === 'Emergency' ? 'critical' : req.urgency === 'Urgent' ? 'high' : 'normal'}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td>{req.hospital}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleOpenMatchModal(req)}>
                        <Search size={14} /> Match Donor
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Donors Registry */}
      <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-3)' }}>Registered Donors Registry</h3>
      <div className="card">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Donor Name</th>
                <th>Group</th>
                <th>Eligibility</th>
                <th>Last Donated</th>
                <th>Total Donated</th>
                <th>City</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredDonors().length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No active donors found for this region.</td>
                </tr>
              ) : (
                getFilteredDonors().map(d => {
                  const elig = checkEligibility(d);
                  const locScore = getLocationScore(d.city, user?.city || '');
                  
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.name}</td>
                      <td>
                        <span style={{ 
                          color: BLOOD_GROUP_COLORS[d.blood_group] || '#999',
                          fontWeight: 'bold', fontSize: '13px'
                        }}>
                          {d.blood_group}
                        </span>
                      </td>
                      <td>
                        {elig.eligible ? (
                          <span className="status-badge active"><CheckCircle size={10}/> Eligible</span>
                        ) : (
                          <span className="status-badge pending" title={elig.reason}>Wait {elig.daysUntilEligible}d</span>
                        )}
                      </td>
                      <td>{d.last_donation_date ? formatDate(d.last_donation_date) : 'Never'}</td>
                      <td>{d.total_donations} U</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{d.city}</span>
                          {locScore === 30 && <span className="status-badge active" style={{ padding: '2px 4px', fontSize: '10px' }}><MapPin size={10}/> Same</span>}
                          {locScore === 15 && <span className="status-badge pending" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '2px 4px', fontSize: '10px' }}><MapPin size={10}/> Nearby</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Match Donor Modal ── */}
      {showMatchModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowMatchModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Match Donor</h3>
              <button className="modal-close" onClick={() => setShowMatchModal(false)}><X size={20}/></button>
            </div>
            
            <div className="modal-body" style={{ background: 'var(--color-bg-secondary)' }}>
              {/* Request Context */}
              <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Request Details</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{selectedRequest.patientName}</h4>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{selectedRequest.hospital}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: BLOOD_GROUP_COLORS[selectedRequest.blood_group_needed] || '#999', fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
                      {selectedRequest.blood_group_needed}
                    </div>
                    <div className={`status-badge ${selectedRequest.urgency === 'Emergency' ? 'critical' : 'normal'}`}>
                      {selectedRequest.units_required} Units — {selectedRequest.urgency}
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Algorithm Suggested Matches (Top 3)</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {suggestedDonors.length === 0 ? (
                  <div className="empty-state">
                    <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
                    <p>No compatible active donors found.</p>
                  </div>
                ) : (
                  suggestedDonors.map((donor, idx) => {
                    const isPerfectMatch = donor.blood_group === selectedRequest.blood_group_needed;
                    return (
                      <div key={donor.id} style={{ 
                        background: 'var(--color-bg-primary)', padding: 'var(--space-4)', 
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', 
                            background: BLOOD_GROUP_COLORS[donor.blood_group] || '#999', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                          }}>
                            {donor.blood_group}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                              {donor.name}
                              {idx === 0 && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '4px' }}>BEST MATCH</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>{donor.city}</span>
                              {getLocationScore(donor.city, selectedRequest.hospital_city) === 30 && <span style={{ color: 'var(--color-success)' }}>(Same City)</span>}
                              {getLocationScore(donor.city, selectedRequest.hospital_city) === 15 && <span style={{ color: 'var(--color-warning)' }}>(Nearby)</span>}
                              &bull; 
                              <span>{isPerfectMatch ? 'Exact Group' : 'Compatible Group'}</span> &bull;
                              <span style={{ color: checkEligibility(donor).eligible ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                {checkEligibility(donor).eligible ? 'Eligible Now' : 'Not Eligible'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div className="status-badge active" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            Score: {donor.matchScore}
                          </div>
                          <button 
                            className="btn btn-sm btn-primary" 
                            disabled={saving}
                            onClick={() => handleConfirmMatch(donor.id)}
                          >
                            {saving ? <div className="spinner spinner-sm"></div> : 'Confirm Match'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMatchModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
