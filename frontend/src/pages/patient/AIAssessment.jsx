import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../../services/api';
import { Brain, Activity, HeartPulse, AlertCircle, CheckCircle, ShieldAlert, FileText, Dumbbell, Pill, Leaf, X, Search, WifiOff, BarChart2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function AIAssessment() {
  const [symptomsInput, setSymptomsInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  const [vitals, setVitals] = useState({ age: '', gender: 'male', bp: 'Normal', cholesterol: 'Normal' });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch valid dictionary of symptoms from ML Backend
    aiAPI.getSymptoms()
      .then(res => {
        setAvailableSymptoms(res.symptoms);
        setBackendOffline(false);
      })
      .catch(err => {
        console.error('AI backend offline:', err);
        setBackendOffline(true);
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered suggestions: match input text, exclude already selected
  const filteredSuggestions = symptomsInput.trim().length >= 1
    ? availableSymptoms.filter(
        s => s.toLowerCase().includes(symptomsInput.toLowerCase()) &&
             !selectedSymptoms.includes(s)
      ).slice(0, 10)
    : [];

  const handleInputChange = (e) => {
    setSymptomsInput(e.target.value);
    setShowSuggestions(true);
  };

  const addSymptom = (sym) => {
    if (!selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(prev => [...prev, sym]);
    }
    setSymptomsInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Allow pressing Enter to add first suggestion
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      addSymptom(filteredSuggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const removeSymptom = (sym) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
  };

  const handleAssess = async () => {
    if (selectedSymptoms.length === 0) {
      setError('Please add at least one symptom.');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    // Filter array to lower case for backend mapping
    const symptomsList = selectedSymptoms.map(s => s.trim().toLowerCase());

    try {
      const res = await aiAPI.assess(symptomsList, {
        age: parseInt(vitals.age) || 30,
        gender: vitals.gender,
        bp: vitals.bp,
        cholesterol: vitals.cholesterol
      });
      setResult(res.data);
    } catch (err) {
      setError(err?.error || 'Failed to connect to AI Engine. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter stagger-children">
      <div className="dashboard-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Brain color="var(--color-primary)" size={28} /> AI Health Assessment Engine
        </h1>
        <p>Enter your symptoms to receive an ML-powered personalized risk evaluation.</p>
      </div>

      <div className="dashboard-grid">
        {/* Input Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Inputs</h3>
          </div>
          <div className="card-body">
            {error && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Search & Add Symptoms</label>

              {backendOffline && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-xs)',
                  marginBottom: 'var(--space-3)'
                }}>
                  <WifiOff size={14} />
                  AI backend offline — start the FastAPI server on port 8000 to enable symptom suggestions.
                </div>
              )}

              {/* Selected symptom tags */}
              {selectedSymptoms.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {selectedSymptoms.map((sym, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'var(--color-primary)',
                      color: '#fff', padding: '4px 12px',
                      borderRadius: '16px', fontSize: 'var(--font-size-sm)'
                    }}>
                      {sym}
                      <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeSymptom(sym)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Custom searchable dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', pointerEvents: 'none'
                  }} />
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-input"
                    placeholder={backendOffline ? 'AI backend offline…' : 'Type to search symptoms (e.g. Fever, Headache)…'}
                    value={symptomsInput}
                    onChange={handleInputChange}
                    onFocus={() => symptomsInput.trim().length >= 1 && setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    disabled={backendOffline}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>

                {/* Suggestions popover */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {filteredSuggestions.map((sym, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); addSymptom(sym); }}
                        style={{
                          padding: 'var(--space-2) var(--space-4)',
                          cursor: 'pointer',
                          fontSize: 'var(--font-size-sm)',
                          borderBottom: idx < filteredSuggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {sym}
                      </div>
                    ))}
                  </div>
                )}

                {/* No results hint */}
                {showSuggestions && symptomsInput.trim().length >= 2 && filteredSuggestions.length === 0 && !backendOffline && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    zIndex: 100
                  }}>
                    No matching symptoms found. Try different keywords.
                  </div>
                )}
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                Press <kbd style={{ background:'var(--color-bg-tertiary)', padding:'1px 5px', borderRadius:'3px', fontSize:'11px' }}>Enter</kbd> to add the first result, or click a suggestion.
              </p>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input type="number" className="form-input" placeholder="e.g. 45" value={vitals.age} onChange={e => setVitals({...vitals, age: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={vitals.gender} onChange={e => setVitals({...vitals, gender: e.target.value})}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Pressure</label>
                <select className="form-select" value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cholesterol</label>
                <select className="form-select" value={vitals.cholesterol} onChange={e => setVitals({...vitals, cholesterol: e.target.value})}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 'var(--space-4)' }} 
              onClick={handleAssess}
              disabled={loading}
            >
              {loading ? (
                <> <span className="spinner spinner-sm"></span> Analyzing Data... </>
              ) : (
                <> <Activity size={18} /> Run AI Assessment </>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {!result && !loading && (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state">
                <Brain size={48} style={{ color: 'var(--color-bg-hover)', marginBottom: 'var(--space-3)' }} />
                <p className="empty-state-title">Awaiting Data</p>
                <p className="empty-state-text" style={{ maxWidth: '250px' }}>Submit your symptoms to engage the AI multi-layer fusion engine.</p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Risk Level Badge */}
              <div className="card" style={{ background: result.risk.level === 'High' ? 'var(--color-danger-bg)' : result.risk.level === 'Moderate' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', border: 'none' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {result.risk.level === 'High' ? <ShieldAlert size={36} color="var(--color-danger)" /> : <CheckCircle size={36} color="var(--color-success)" />}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ color: result.risk.level === 'High' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {result.risk.level} Risk Profile
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, color: 'var(--color-text-primary)' }}>Risk Score: <strong>{result.risk.riskScore}/100</strong></p>
                  </div>
                </div>
              </div>

              {/* Predictions */}
              <div className="card">
                <div className="card-header"><h3 className="card-title"><FileText size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Top Predictions</h3></div>
                <div className="card-body">
                  {result.predictions.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: i !== result.predictions.length -1 ? '1px solid var(--color-border)' : 'none' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: i === 0 ? 600 : 400 }}>{p.disease}</span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{Math.round(p.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptom Contribution Analysis */}
              {result.symptom_contributions && result.symptom_contributions.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <BarChart2 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                      Symptom Contribution Analysis
                    </h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Based on ML feature importance
                    </span>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                      How much each symptom influenced the top prediction:
                    </p>
                    {result.symptom_contributions.map((c, i) => {
                      const colors = [
                        'hsl(258, 70%, 55%)', 'hsl(210, 78%, 55%)', 'hsl(165, 60%, 50%)',
                        'hsl(38, 92%, 55%)',  'hsl(0, 72%, 55%)',    'hsl(280, 60%, 55%)'
                      ];
                      const color = colors[i % colors.length];
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>
                            <span style={{ fontWeight: 500 }}>{c.symptom}</span>
                            <span style={{ fontWeight: 700, color }}>{c.percentage}%</span>
                          </div>
                          <div style={{
                            height: '8px', borderRadius: 'var(--radius-full)',
                            background: 'var(--color-bg-tertiary)', overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${c.percentage}%`,
                              background: `linear-gradient(90deg, ${color}, ${color}99)`,
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.8s ease-out',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="card">
                <div className="card-header"><h3 className="card-title"><HeartPulse size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Lifestyle Recommendations</h3></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}><Leaf size={14}/> Diets</strong>
                    <ul style={{ paddingLeft: 'var(--space-5)', margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-sm)' }}>
                      {result.recommendations.diets.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}><Dumbbell size={14}/> Workouts</strong>
                    <ul style={{ paddingLeft: 'var(--space-5)', margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-sm)' }}>
                      {result.recommendations.workouts.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}><Pill size={14}/> Medications (Consult Doctor)</strong>
                    <ul style={{ paddingLeft: 'var(--space-5)', margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-sm)' }}>
                      {result.recommendations.medications.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Alerts Log */}
              {result.alerts && result.alerts.length > 0 && (
                <div className="card" style={{ borderColor: 'var(--color-danger)', boxShadow: 'var(--shadow-glow-primary)' }}>
                  <div className="card-header" style={{ background: 'var(--color-danger-bg)' }}>
                    <h3 className="card-title" style={{ color: 'var(--color-danger)' }}><AlertCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Generated Alerts</h3>
                  </div>
                  <div className="card-body">
                    {result.alerts.map((a, i) => (
                      <p key={i} style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>{a.type}:</strong> {a.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
