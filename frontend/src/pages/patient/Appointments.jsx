import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI, doctorsAPI } from '../../services/api';
import { Plus, X, Calendar, Clock, Search, Filter } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [filter, setFilter] = useState('all');

  // Booking form state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingType, setBookingType] = useState('consultation');
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotReason, setSlotReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [aptRes, docRes] = await Promise.all([
        appointmentsAPI.getAll(),
        doctorsAPI.getAll(),
      ]);
      setAppointments(aptRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    try {
      const res = await appointmentsAPI.getSlots(doctorId, date);
      setAvailableSlots(res.data.availableSlots);
      setSlotReason(res.data.reason || '');
    } catch (err) {
      console.error('Failed to load slots:', err);
      setAvailableSlots([]);
      setSlotReason('Failed to load slots. Please check your connection.');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setBookingDate(date);
    setSelectedSlot('');
    if (selectedDoctor) {
      loadSlots(selectedDoctor.id, date);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot('');
    setAvailableSlots([]);
    if (bookingDate) {
      loadSlots(doctor.id, bookingDate);
    }
  };

  const handleBook = async () => {
    if (!selectedDoctor || !bookingDate || !selectedSlot) return;
    setBookingLoading(true);
    try {
      await appointmentsAPI.create({
        doctorId: selectedDoctor.id,
        date: bookingDate,
        time: selectedSlot,
        type: bookingType,
        symptoms,
      });
      setShowBooking(false);
      resetBookingForm();
      loadData();
    } catch (err) {
      alert(err?.error || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentsAPI.update(id, { status: 'cancelled' });
      loadData();
    } catch (err) {
      alert(err?.error || 'Failed to cancel');
    }
  };

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setBookingDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
    setBookingType('consultation');
    setSymptoms('');
  };

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter);



  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Loading appointments...</p></div>;
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Appointments</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Manage your appointments and book new consultations
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowBooking(true)} id="book-appointment-btn">
          <Plus size={18} /> Book Appointment
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Symptoms</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <p className="empty-state-title">No appointments found</p>
                    <p className="empty-state-text">Book your first appointment to get started.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(apt => (
                  <tr key={apt.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{apt.doctorName}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{apt.specialization}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Calendar size={14} /> {formatDate(apt.date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        <Clock size={12} /> {apt.time}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{apt.type}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apt.symptoms || '-'}
                    </td>
                    <td><span className={`status-badge ${apt.status}`}>{apt.status}</span></td>
                    <td>
                      {(apt.status === 'pending' || apt.status === 'confirmed') && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(apt.id)} style={{ color: 'var(--color-danger)' }}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Book New Appointment</h3>
              <button className="modal-close" onClick={() => { setShowBooking(false); resetBookingForm(); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Step 1: Select Doctor */}
              <div className="form-group">
                <label className="form-label">Select Doctor</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '200px', overflowY: 'auto' }}>
                  {doctors.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => handleDoctorSelect(doc)}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selectedDoctor?.id === doc.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: selectedDoctor?.id === doc.id ? 'var(--color-primary-bg)' : 'var(--color-bg-tertiary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{doc.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {doc.specialization} • {doc.hospital} • ₹{doc.consultationFee}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Date */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bookingDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={bookingType} onChange={e => setBookingType(e.target.value)}>
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="check-up">Check-up</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Select Time Slot */}
              {bookingDate && selectedDoctor && (
                <div className="form-group">
                  <label className="form-label">Available Slots</label>
                  {slotsLoading ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}><div className="spinner spinner-sm" style={{ margin: '0 auto' }}></div></div>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-warning-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning)', fontSize: 'var(--font-size-xs)' }}>
                      {slotReason || 'No available slots for this date.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          className={`btn btn-sm ${selectedSlot === slot ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Symptoms */}
              <div className="form-group">
                <label className="form-label">Symptoms / Reason</label>
                <textarea
                  className="form-textarea"
                  placeholder="Briefly describe your symptoms or reason for visit..."
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowBooking(false); resetBookingForm(); }}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleBook}
                disabled={!selectedDoctor || !bookingDate || !selectedSlot || bookingLoading}
              >
                {bookingLoading ? <span className="spinner spinner-sm"></span> : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
