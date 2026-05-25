import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { authAPI } from '../services/api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology', 'ENT (Otolaryngology)',
  'Gastroenterology', 'Gynecology', 'Nephrology', 'Neurology', 'Oncology',
  'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology',
  'Radiology', 'Rheumatology', 'Surgery (General)', 'Urology', 'Anesthesiology',
  'Pathology', 'Physiotherapy', 'Dentistry', 'Ayurveda', 'Homeopathy', 'Other'
]

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Urdu', 'Kannada', 'Malayalam', 'Odia', 'Punjabi', 'Sanskrit']

const DOCTOR_TYPES = [
  { value: 'ALLOPATHIC', label: 'Allopathic (MBBS/MD)' },
  { value: 'AYURVEDIC', label: 'Ayurvedic (BAMS)' },
  { value: 'HOMEOPATHIC', label: 'Homeopathic (BHMS)' },
  { value: 'UNANI', label: 'Unani (BUMS)' },
  { value: 'SIDDHA', label: 'Siddha (BSMS)' },
  { value: 'NATUROPATHY', label: 'Naturopathy (BNYS)' },
  { value: 'DENTIST', label: 'Dentist (BDS/MDS)' },
  { value: 'PHYSIOTHERAPIST', label: 'Physiotherapist (BPT)' },
  { value: 'OTHER', label: 'Other' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function RegisterPage() {
  const totalSteps = 4 // 1: Form, 2: Doctor Details (if DOCTOR), 3: OTP, 4: Success
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'PATIENT' })
  const [doctorProfile, setDoctorProfile] = useState({
    doctorType: 'ALLOPATHIC', degree: '', specialization: '', hospitalAffiliation: '',
    education: '', experienceYears: '', consultationFee: '', city: '', state: '',
    fullAddress: '', latitude: null, longitude: null, languages: '',
    licenseNumber: '', registrationCouncil: '', bio: '', availableDays: 'Mon,Tue,Wed,Thu,Fri'
  })
  const [selectedLangs, setSelectedLangs] = useState(['English'])
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [geoLoading, setGeoLoading] = useState(false)
  const [docSection, setDocSection] = useState(0) // 0-3 sub-sections in step 2
  const otpRefs = useRef([])
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)
  const googleLoginRef = useRef(googleLogin)
  const navigateRef = useRef(navigate)

  googleLoginRef.current = googleLogin
  navigateRef.current = navigate

  const isDoctor = form.role === 'DOCTOR'
  const otpStep = isDoctor ? 3 : 2
  const successStep = isDoctor ? 4 : 3

  // OTP expiry countdown
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGoogle, 300)
        return
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const user = await googleLoginRef.current(response.credential)
            toast.success(`Welcome, ${user.name}!`)
            if (user.role === 'ADMIN') navigateRef.current('/admin')
            else if (user.role === 'DOCTOR') navigateRef.current('/doctor')
            else navigateRef.current('/patient')
          } catch (err) {
            toast.error(err.response?.data || 'Google sign-up failed')
          }
        },
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'signup_with',
          shape: 'pill',
        })
      }
    }
    initGoogle()
  }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const setDoc = (k, v) => setDoctorProfile(f => ({...f, [k]: v}))

  // Toggle language
  const toggleLang = (lang) => {
    setSelectedLangs(prev => {
      const next = prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
      setDoctorProfile(f => ({...f, languages: next.join(',')}))
      return next
    })
  }

  // Toggle day
  const toggleDay = (day) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      setDoctorProfile(f => ({...f, availableDays: next.join(',')}))
      return next
    })
  }

  // Geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDoctorProfile(f => ({...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude}))
        toast.success('Location detected successfully!')
        setGeoLoading(false)
      },
      () => {
        toast.error('Unable to detect location. Please allow location access.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Step 1 → next
  const handleStep1Next = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || form.password.length < 6) {
      toast.error('Please fill all required fields (password min 6 chars)')
      return
    }
    if (isDoctor) {
      setStep(2)
      setDocSection(0)
    } else {
      handleSendOtp()
    }
  }

  // Step 2 → send OTP
  const handleDoctorNext = () => {
    // Validate required doctor fields
    if (!doctorProfile.degree) {
      toast.error('Please enter your degree/qualifications')
      return
    }
    if (!doctorProfile.specialization) {
      toast.error('Please select your specialization')
      return
    }
    if (!doctorProfile.licenseNumber) {
      toast.error('Please enter your license/registration number')
      return
    }
    handleSendOtp()
  }

  // Send OTP
  const handleSendOtp = async () => {
    setOtpSending(true)
    try {
      await authAPI.sendOtp(form.email)
      toast.success('OTP sent to your email!')
      setStep(otpStep)
      setCountdown(300)
      setResendCooldown(30)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err.response?.data || 'Failed to send OTP. Check your email.')
    } finally {
      setOtpSending(false)
    }
  }

  // OTP input handling
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.verifyOtp(form.email, otpString)
      if (res.data.verified) {
        toast.success('Email verified! Creating your account...')
        const regData = { ...form }
        if (isDoctor) {
          regData.doctorProfile = {
            ...doctorProfile,
            experienceYears: doctorProfile.experienceYears ? parseInt(doctorProfile.experienceYears) : null,
            consultationFee: doctorProfile.consultationFee ? parseFloat(doctorProfile.consultationFee) : null,
          }
        }
        const user = await register(regData)
        setStep(successStep)
        setTimeout(() => {
          if (user.role === 'DOCTOR') navigate('/doctor')
          else navigate('/patient')
        }, 2000)
      }
    } catch (err) {
      const errorMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.message || 'Registration failed'
      toast.error(errorMsg)
      if (errorMsg.toLowerCase().includes('otp')) {
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      } else {
        setTimeout(() => setStep(1), 1500)
      }
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setOtpSending(true)
    try {
      await authAPI.sendOtp(form.email)
      toast.success('New OTP sent!')
      setOtp(['', '', '', '', '', ''])
      setCountdown(300)
      setResendCooldown(30)
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error('Failed to resend OTP')
    } finally {
      setOtpSending(false)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Step indicator labels
  const stepLabels = isDoctor
    ? ['Details', 'Professional', 'Verify', 'Done']
    : ['Details', 'Verify', 'Done']

  const activeSteps = isDoctor ? 4 : 3

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 2 ? 640 : 480 }}>
        <div className="auth-logo">
          <h1>Health<span>Care</span></h1>
          <p>
            {step === 1 ? 'Create your account' :
             step === 2 ? 'Professional Details' :
             step === otpStep ? 'Verify your email' : 'Welcome aboard!'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="otp-steps">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1
            const isActive = step >= stepNum
            const isCompleted = step > stepNum
            return (
              <React.Fragment key={label}>
                {i > 0 && <div className={`otp-step-line ${step >= stepNum ? 'active' : ''}`}></div>}
                <div className={`otp-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="otp-step-circle">{isCompleted ? '✓' : stepNum}</div>
                  <span>{label}</span>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Step 1: Basic Registration Form */}
        {step === 1 && (
          <>
            <form onSubmit={handleStep1Next}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" placeholder="Dr. Jane Smith" value={form.name}
                  onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" placeholder="Min 6 characters" value={form.password}
                  onChange={e => set('password', e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>
              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={otpSending}>
                {otpSending ? (
                  <><span className="btn-spinner"></span> {isDoctor ? 'Next...' : 'Sending OTP...'}</>
                ) : (
                  <>{isDoctor ? '→ Continue to Professional Details' : '📧 Send Verification Code'}</>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or sign up with</span>
            </div>

            <div ref={googleBtnRef} className="google-btn-container" id="google-signup-btn"></div>

            <p className="text-center text-sm text-muted mt-4">
              Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign In</Link>
            </p>
          </>
        )}

        {/* Step 2: Doctor Professional Details */}
        {step === 2 && isDoctor && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Sub-section tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
              {['🩺 Identity', '🏥 Practice', '📍 Location', '📋 Additional'].map((tab, i) => (
                <button key={tab} onClick={() => setDocSection(i)}
                  style={{
                    flex: 1, minWidth: 100, padding: '8px 10px', fontSize: '0.78rem', fontWeight: 600,
                    border: 'none', borderRadius: 8, cursor: 'pointer', transition: '0.2s',
                    background: docSection === i ? 'var(--primary)' : 'var(--grey-100)',
                    color: docSection === i ? 'white' : 'var(--grey-600)',
                  }}>{tab}</button>
              ))}
            </div>

            {/* Sub-section 0: Professional Identity */}
            {docSection === 0 && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div className="form-group">
                  <label className="form-label">Doctor Type *</label>
                  <select className="form-control" value={doctorProfile.doctorType} onChange={e => setDoc('doctorType', e.target.value)}>
                    {DOCTOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Degree / Qualifications *</label>
                  <input className="form-control" placeholder="e.g. MBBS, MD (Cardiology)" value={doctorProfile.degree}
                    onChange={e => setDoc('degree', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization *</label>
                  <select className="form-control" value={doctorProfile.specialization} onChange={e => setDoc('specialization', e.target.value)}>
                    <option value="">-- Select Specialization --</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Education Background</label>
                  <textarea className="form-control" placeholder="e.g. AIIMS Delhi (2010-2016), MD Cardiology - PGI Chandigarh (2016-2019)"
                    value={doctorProfile.education} onChange={e => setDoc('education', e.target.value)} rows={2} />
                </div>
                <button className="btn btn-primary w-full" onClick={() => setDocSection(1)}>Next: Practice Details →</button>
              </div>
            )}

            {/* Sub-section 1: Practice Details */}
            {docSection === 1 && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div className="form-group">
                  <label className="form-label">Hospital / Clinic Affiliation</label>
                  <input className="form-control" placeholder="e.g. Apollo Hospital, Mumbai" value={doctorProfile.hospitalAffiliation}
                    onChange={e => setDoc('hospitalAffiliation', e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <input className="form-control" type="number" min="0" max="60" placeholder="e.g. 10" value={doctorProfile.experienceYears}
                      onChange={e => setDoc('experienceYears', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee (₹)</label>
                    <input className="form-control" type="number" min="0" placeholder="e.g. 500" value={doctorProfile.consultationFee}
                      onChange={e => setDoc('consultationFee', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Available Days</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS.map(day => (
                      <button key={day} type="button" onClick={() => toggleDay(day)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          border: `2px solid ${selectedDays.includes(day) ? 'var(--primary)' : 'var(--grey-200)'}`,
                          background: selectedDays.includes(day) ? 'var(--primary)' : 'transparent',
                          color: selectedDays.includes(day) ? 'white' : 'var(--grey-500)',
                          transition: '0.2s',
                        }}>{day}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDocSection(0)}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setDocSection(2)}>Next: Location →</button>
                </div>
              </div>
            )}

            {/* Sub-section 2: Location */}
            {docSection === 2 && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" placeholder="e.g. Mumbai" value={doctorProfile.city}
                      onChange={e => setDoc('city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-control" placeholder="e.g. Maharashtra" value={doctorProfile.state}
                      onChange={e => setDoc('state', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <textarea className="form-control" placeholder="Full clinic/hospital address" value={doctorProfile.fullAddress}
                    onChange={e => setDoc('fullAddress', e.target.value)} rows={2} />
                </div>
                <div className="form-group">
                  <label className="form-label">📍 Geolocation (for nearby search)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={detectLocation} disabled={geoLoading}>
                      {geoLoading ? '📡 Detecting...' : '📍 Use My Location'}
                    </button>
                    {doctorProfile.latitude && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                        ✓ {doctorProfile.latitude.toFixed(4)}, {doctorProfile.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDocSection(1)}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setDocSection(3)}>Next: Additional →</button>
                </div>
              </div>
            )}

            {/* Sub-section 3: Additional Info */}
            {docSection === 3 && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div className="form-group">
                  <label className="form-label">Languages Spoken</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {LANGUAGES.map(lang => (
                      <button key={lang} type="button" onClick={() => toggleLang(lang)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                          border: `1.5px solid ${selectedLangs.includes(lang) ? '#06b6d4' : 'var(--grey-200)'}`,
                          background: selectedLangs.includes(lang) ? '#06b6d412' : 'transparent',
                          color: selectedLangs.includes(lang) ? '#06b6d4' : 'var(--grey-500)',
                          transition: '0.2s',
                        }}>{selectedLangs.includes(lang) ? '✓ ' : ''}{lang}</button>
                    ))}
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">License / Registration No. *</label>
                    <input className="form-control" placeholder="e.g. MCI-12345" value={doctorProfile.licenseNumber}
                      onChange={e => setDoc('licenseNumber', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Council</label>
                    <input className="form-control" placeholder="e.g. Medical Council of India" value={doctorProfile.registrationCouncil}
                      onChange={e => setDoc('registrationCouncil', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Professional Bio</label>
                  <textarea className="form-control" placeholder="A short bio about your practice, expertise, achievements..."
                    value={doctorProfile.bio} onChange={e => setDoc('bio', e.target.value)} rows={3} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDocSection(2)}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDoctorNext} disabled={otpSending}>
                    {otpSending ? <><span className="btn-spinner"></span> Sending OTP...</> : '📧 Send Verification Code'}
                  </button>
                </div>
              </div>
            )}

            {/* Back to step 1 */}
            {docSection === 0 && (
              <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(1)}>
                ← Back to Basic Details
              </button>
            )}
          </div>
        )}

        {/* OTP Verification Step */}
        {step === otpStep && (
          <div className="otp-verify-section">
            <div className="otp-icon-wrapper">
              <div className="otp-mail-icon">✉️</div>
            </div>
            <p className="otp-info-text">
              We sent a 6-digit code to<br/>
              <strong>{form.email}</strong>
            </p>

            <div className="otp-input-group" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {countdown > 0 && (
              <div className="otp-countdown">
                <div className="otp-countdown-bar">
                  <div className="otp-countdown-fill" style={{ width: `${(countdown / 300) * 100}%` }}></div>
                </div>
                <span className="otp-countdown-text">Code expires in {formatTime(countdown)}</span>
              </div>
            )}

            {countdown <= 0 && (
              <p className="otp-expired-text">⚠️ OTP has expired. Please resend.</p>
            )}

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={handleVerifyOtp}
              disabled={loading || otp.join('').length !== 6 || countdown <= 0}
            >
              {loading ? (
                <><span className="btn-spinner"></span> Verifying...</>
              ) : (
                'Verify & Create Account'
              )}
            </button>

            <div className="otp-actions">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || otpSending}
              >
                {otpSending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '🔄 Resend Code'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { setStep(isDoctor ? 2 : 1); setOtp(['','','','','','']); setCountdown(0) }}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === successStep && (
          <div className="otp-success-section">
            <div className="success-checkmark">
              <div className="check-icon">
                <span className="icon-line line-tip"></span>
                <span className="icon-line line-long"></span>
                <div className="icon-circle"></div>
                <div className="icon-fix"></div>
              </div>
            </div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8, fontSize: '1.4rem' }}>Account Created!</h2>
            <p className="text-muted text-sm">Your email has been verified and your account is ready. Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Need React import for React.Fragment usage in step indicator
import React from 'react'
