import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { doctorAPI } from '../services/api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import ReviewModal from '../components/ReviewModal'

const DOCTOR_TYPES = [
  { value: 'ALLOPATHIC', label: 'Allopathic', emoji: '🏥' },
  { value: 'AYURVEDIC', label: 'Ayurvedic', emoji: '🌿' },
  { value: 'HOMEOPATHIC', label: 'Homeopathic', emoji: '💧' },
  { value: 'UNANI', label: 'Unani', emoji: '🧪' },
  { value: 'SIDDHA', label: 'Siddha', emoji: '🪷' },
  { value: 'NATUROPATHY', label: 'Naturopathy', emoji: '🌱' },
  { value: 'DENTIST', label: 'Dentist', emoji: '🦷' },
  { value: 'PHYSIOTHERAPIST', label: 'Physiotherapy', emoji: '💪' },
  { value: 'OTHER', label: 'Other', emoji: '➕' },
]

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology', 'ENT (Otolaryngology)',
  'Gastroenterology', 'Gynecology', 'Nephrology', 'Neurology', 'Oncology',
  'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology',
  'Radiology', 'Rheumatology', 'Surgery (General)', 'Urology', 'Anesthesiology',
  'Pathology', 'Physiotherapy', 'Dentistry', 'Ayurveda', 'Homeopathy', 'Other'
]

const SORT_OPTIONS = [
  { value: 'distance', label: '📍 Nearest First' },
  { value: 'rating', label: '⭐ Highest Rated' },
  { value: 'fee_low', label: '💰 Fee: Low to High' },
  { value: 'fee_high', label: '💰 Fee: High to Low' },
  { value: 'experience', label: '📅 Most Experienced' },
]

function StarDisplay({ rating, size = 14 }) {
  const full = Math.floor(rating)
  const partial = rating - full
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, position: 'relative', display: 'inline-block', width: size + 2 }}>
          <span style={{ color: '#d1d5db' }}>★</span>
          {i <= full && <span style={{ position: 'absolute', left: 0, top: 0, color: '#f59e0b', overflow: 'hidden', width: '100%' }}>★</span>}
          {i === full + 1 && partial > 0 && (
            <span style={{ position: 'absolute', left: 0, top: 0, color: '#f59e0b', overflow: 'hidden', width: `${partial * 100}%` }}>★</span>
          )}
        </span>
      ))}
    </span>
  )
}

// Haversine distance in km
function calcDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function FindDoctorsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Filters
  const [searchName, setSearchName] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedSpec, setSelectedSpec] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [maxFee, setMaxFee] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)

  // Doctor detail modal
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [doctorReviews, setDoctorReviews] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Review modal
  const [showReviewDoctor, setShowReviewDoctor] = useState(null)

  // Detect user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGeoLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setSortBy('distance')
          setGeoLoading(false)
        },
        () => {
          setGeoLoading(false)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [])

  // Fetch doctors
  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const res = await doctorAPI.search({})
      setDoctors(res.data || [])
    } catch {
      toast.error('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }

  // Filtered & sorted list
  const filteredDoctors = useMemo(() => {
    let result = [...doctors]

    // Name search
    if (searchName.trim()) {
      const q = searchName.toLowerCase()
      result = result.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.specialization?.toLowerCase().includes(q) ||
        d.hospitalAffiliation?.toLowerCase().includes(q)
      )
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter(d => selectedTypes.includes(d.doctorType))
    }

    // Specialization filter
    if (selectedSpec) {
      result = result.filter(d => d.specialization === selectedSpec)
    }

    // Rating filter
    if (minRating > 0) {
      result = result.filter(d => (d.averageRating || 0) >= minRating)
    }

    // Fee filter
    if (maxFee && !isNaN(maxFee)) {
      result = result.filter(d => !d.consultationFee || d.consultationFee <= parseFloat(maxFee))
    }

    // City filter
    if (cityFilter.trim()) {
      const c = cityFilter.toLowerCase()
      result = result.filter(d => d.city?.toLowerCase().includes(c) || d.state?.toLowerCase().includes(c))
    }

    // Add distance
    result = result.map(d => ({
      ...d,
      distance: userLocation ? calcDistance(userLocation.lat, userLocation.lng, d.latitude, d.longitude) : null
    }))

    // Sort
    switch (sortBy) {
      case 'distance':
        result.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0
          if (a.distance === null) return 1
          if (b.distance === null) return -1
          return a.distance - b.distance
        })
        break
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        break
      case 'fee_low':
        result.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0))
        break
      case 'fee_high':
        result.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0))
        break
      case 'experience':
        result.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0))
        break
    }

    return result
  }, [doctors, searchName, selectedTypes, selectedSpec, minRating, maxFee, cityFilter, sortBy, userLocation])

  const toggleType = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const clearFilters = () => {
    setSearchName('')
    setSelectedTypes([])
    setSelectedSpec('')
    setMinRating(0)
    setMaxFee('')
    setCityFilter('')
    setSortBy(userLocation ? 'distance' : 'rating')
  }

  const activeFilterCount = [
    selectedTypes.length > 0, selectedSpec, minRating > 0, maxFee, cityFilter
  ].filter(Boolean).length

  // Load reviews for a doctor
  const loadReviews = async (doctorId) => {
    setReviewsLoading(true)
    try {
      const res = await doctorAPI.getReviews(doctorId)
      setDoctorReviews(res.data)
    } catch {
      toast.error('Failed to load reviews')
    } finally {
      setReviewsLoading(false)
    }
  }

  const openDoctorDetail = (doctor) => {
    setSelectedDoctor(doctor)
    loadReviews(doctor.userId)
  }

  const formatDistance = (km) => {
    if (km === null || km === undefined) return null
    if (km < 1) return `${Math.round(km * 1000)}m away`
    if (km < 10) return `${km.toFixed(1)} km away`
    return `${Math.round(km)} km away`
  }

  const typeInfo = (type) => DOCTOR_TYPES.find(t => t.value === type) || { label: type, emoji: '🩺' }

  return (
    <Layout title="Find Doctors">
      <div className="section-wrapper">
        {/* Top Search Bar */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #1340a8 100%)',
          borderRadius: 'var(--radius)', padding: '24px 28px', marginBottom: 24, color: 'white'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 4 }}>
            Find the Right Doctor 🔍
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.85rem', marginBottom: 16 }}>
            Search by name, specialization, or hospital • {doctors.length} doctors available
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                fontSize: '0.9rem', background: 'rgba(255,255,255,0.15)', color: 'white',
                backdropFilter: 'blur(10px)', outline: 'none',
              }}
              placeholder="Search doctors, specializations, hospitals..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            <button className="btn" onClick={() => setShowFilters(!showFilters)} style={{
              background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 12, padding: '10px 18px', fontWeight: 600, position: 'relative',
            }}>
              🎛️ Filters
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                  background: '#ef4444', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{activeFilterCount}</span>
              )}
            </button>
          </div>
          {userLocation && (
            <p style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.7 }}>
              📍 Location detected — showing nearest doctors first
            </p>
          )}
          {geoLoading && (
            <p style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.7 }}>
              📡 Detecting your location...
            </p>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card" style={{ marginBottom: 20, animation: 'fadeIn 0.25s ease' }}>
            <div className="card-header">
              <h3 className="card-title">🎛️ Filters</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeFilterCount > 0 && <button className="btn btn-sm btn-outline" onClick={clearFilters}>Clear All</button>}
                <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(false)}>✕</button>
              </div>
            </div>
            <div className="card-body">
              {/* Doctor Types */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>Doctor Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DOCTOR_TYPES.map(t => (
                    <button key={t.value} onClick={() => toggleType(t.value)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                        cursor: 'pointer', transition: '0.2s',
                        border: `2px solid ${selectedTypes.includes(t.value) ? 'var(--primary)' : 'var(--grey-200)'}`,
                        background: selectedTypes.includes(t.value) ? 'var(--primary)' : 'transparent',
                        color: selectedTypes.includes(t.value) ? 'white' : 'var(--grey-600)',
                      }}>{t.emoji} {t.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 16, gap: 16 }}>
                {/* Specialization */}
                <div>
                  <label className="form-label">Specialization</label>
                  <select className="form-control" value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)}>
                    <option value="">All Specializations</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Max Fee */}
                <div>
                  <label className="form-label">Max Consultation Fee (₹)</label>
                  <input className="form-control" type="number" placeholder="e.g. 1000" value={maxFee}
                    onChange={e => setMaxFee(e.target.value)} min="0" />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 16 }}>
                {/* Min Rating */}
                <div>
                  <label className="form-label">Minimum Rating</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3, 4].map(r => (
                      <button key={r} onClick={() => setMinRating(r === minRating ? 0 : r)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer', transition: '0.2s',
                          border: `2px solid ${minRating === r && r > 0 ? '#f59e0b' : 'var(--grey-200)'}`,
                          background: minRating === r && r > 0 ? '#fef3c7' : 'transparent',
                          color: minRating === r && r > 0 ? '#92400e' : 'var(--grey-500)',
                        }}>
                        {r === 0 ? 'Any' : `${r}+ ⭐`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="form-label">City / Location</label>
                  <input className="form-control" placeholder="e.g. Mumbai" value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sort Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--grey-500)', fontWeight: 600 }}>
            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--grey-400)' }}>Sort by:</span>
            <select className="form-control" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} disabled={o.value === 'distance' && !userLocation}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        {loading ? (
          <div className="loading" style={{ padding: '60px 0' }}>Loading doctors...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No doctors found</p>
            <p className="text-muted text-sm">Try adjusting your filters or search terms</p>
            {activeFilterCount > 0 && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filteredDoctors.map(doc => {
              const ti = typeInfo(doc.doctorType)
              return (
                <div key={doc.userId} className="card" style={{
                  cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                  overflow: 'hidden',
                }}
                  onClick={() => openDoctorDetail(doc)}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Type Banner */}
                  <div style={{
                    padding: '6px 16px', fontSize: '0.72rem', fontWeight: 700,
                    background: doc.doctorType === 'ALLOPATHIC' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' :
                      doc.doctorType === 'AYURVEDIC' ? 'linear-gradient(135deg, #22c55e, #15803d)' :
                      doc.doctorType === 'HOMEOPATHIC' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' :
                      doc.doctorType === 'DENTIST' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' :
                      'linear-gradient(135deg, #6b7280, #4b5563)',
                    color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>
                    {ti.emoji} {ti.label}
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--primary-light), var(--primary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', color: 'white', fontWeight: 700,
                      }}>
                        {doc.profilePicture
                          ? <img src={doc.profilePicture} alt="" style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover' }} />
                          : doc.name?.charAt(0)?.toUpperCase() || '?'
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Dr. {doc.name}
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, margin: '2px 0' }}>
                          {doc.specialization || 'General Practice'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>
                          {doc.degree || ''}
                        </p>
                      </div>
                    </div>

                    {/* Rating & Fee Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StarDisplay rating={doc.averageRating || 0} size={13} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                          {(doc.averageRating || 0).toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--grey-400)' }}>
                          ({doc.totalReviews || 0})
                        </span>
                      </div>
                      {doc.consultationFee && (
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                          background: '#ecfdf5', color: '#059669',
                        }}>
                          ₹{doc.consultationFee}
                        </span>
                      )}
                    </div>

                    {/* Info Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {doc.experienceYears && (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', background: 'var(--grey-100)', color: 'var(--grey-600)' }}>
                          📅 {doc.experienceYears} yrs exp
                        </span>
                      )}
                      {doc.hospitalAffiliation && (
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', background: 'var(--grey-100)', color: 'var(--grey-600)',
                          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          🏥 {doc.hospitalAffiliation}
                        </span>
                      )}
                      {doc.distance !== null && doc.distance !== undefined && (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
                          📍 {formatDistance(doc.distance)}
                        </span>
                      )}
                    </div>

                    {/* Location & Languages */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--grey-400)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {(doc.city || doc.state) && (
                        <span>📍 {[doc.city, doc.state].filter(Boolean).join(', ')}</span>
                      )}
                      {doc.languages && (
                        <span>🗣️ {doc.languages.split(',').slice(0, 3).join(', ')}{doc.languages.split(',').length > 3 ? '...' : ''}</span>
                      )}
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                        onClick={e => { e.stopPropagation(); navigate('/appointments') }}>
                        📅 Book
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }}
                        onClick={e => { e.stopPropagation(); openDoctorDetail(doc) }}>
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <div className="modal-overlay" onClick={() => { setSelectedDoctor(null); setDoctorReviews(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Doctor Profile</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedDoctor(null); setDoctorReviews(null) }}>✕</button>
            </div>

            {/* Doctor Info */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary-light), var(--primary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', color: 'white', fontWeight: 700,
              }}>
                {selectedDoctor.profilePicture
                  ? <img src={selectedDoctor.profilePicture} alt="" style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />
                  : selectedDoctor.name?.charAt(0)?.toUpperCase()
                }
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>Dr. {selectedDoctor.name}</h2>
                <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>{selectedDoctor.specialization}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--grey-500)' }}>{selectedDoctor.degree}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span className={`badge badge-primary`}>{typeInfo(selectedDoctor.doctorType).label}</span>
                  {selectedDoctor.experienceYears && <span className="badge badge-secondary">{selectedDoctor.experienceYears} yrs exp</span>}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '🏥', label: 'Hospital', value: selectedDoctor.hospitalAffiliation },
                { icon: '📞', label: 'Phone', value: selectedDoctor.phone },
                { icon: '💰', label: 'Consultation Fee', value: selectedDoctor.consultationFee ? `₹${selectedDoctor.consultationFee}` : null },
                { icon: '📍', label: 'Location', value: [selectedDoctor.city, selectedDoctor.state].filter(Boolean).join(', ') },
                { icon: '🗣️', label: 'Languages', value: selectedDoctor.languages },
                { icon: '📜', label: 'License No.', value: selectedDoctor.licenseNumber },
                { icon: '🏛️', label: 'Council', value: selectedDoctor.registrationCouncil },
                { icon: '📅', label: 'Available', value: selectedDoctor.availableDays },
                { icon: '📧', label: 'Email', value: selectedDoctor.email },
              ].filter(item => item.value).map(item => (
                <div key={item.label} style={{ padding: '10px 12px', background: 'var(--grey-50)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--grey-400)', marginBottom: 2 }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-word' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            {selectedDoctor.bio && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>About</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', lineHeight: 1.6 }}>{selectedDoctor.bio}</p>
              </div>
            )}

            {/* Education */}
            {selectedDoctor.education && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>Education</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', lineHeight: 1.6 }}>{selectedDoctor.education}</p>
              </div>
            )}

            {/* Rating Summary */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>⭐ Ratings & Reviews</h4>
              {reviewsLoading ? (
                <div className="loading">Loading reviews...</div>
              ) : doctorReviews ? (
                <>
                  {/* Rating Overview */}
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16, padding: 16, background: 'var(--grey-50)', borderRadius: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>
                        {(doctorReviews.averageRating || 0).toFixed(1)}
                      </div>
                      <StarDisplay rating={doctorReviews.averageRating || 0} size={15} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--grey-400)', marginTop: 4 }}>
                        {doctorReviews.totalReviews || 0} review{(doctorReviews.totalReviews || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {/* Rating Breakdown */}
                    <div style={{ flex: 1 }}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = doctorReviews.ratingBreakdown?.[star] || 0
                        const total = doctorReviews.totalReviews || 1
                        const pct = (count / total) * 100
                        return (
                          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, width: 14, textAlign: 'right' }}>{star}</span>
                            <span style={{ fontSize: '0.7rem' }}>★</span>
                            <div style={{ flex: 1, height: 8, background: 'var(--grey-200)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: '0.5s' }}></div>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--grey-400)', width: 20 }}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  {doctorReviews.reviews?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {doctorReviews.reviews.map(r => (
                        <div key={r.id} style={{ padding: '12px 14px', background: 'var(--grey-50)', borderRadius: 10, border: '1px solid var(--grey-100)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: 8, background: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '0.75rem', fontWeight: 700,
                              }}>{r.patientName?.charAt(0)?.toUpperCase()}</div>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.patientName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <StarDisplay rating={r.rating} size={12} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>{r.rating}.0</span>
                            </div>
                          </div>
                          {r.reviewText && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--grey-600)', lineHeight: 1.5, margin: 0 }}>{r.reviewText}</p>
                          )}
                          <p style={{ fontSize: '0.7rem', color: 'var(--grey-400)', marginTop: 6 }}>
                            {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted text-sm" style={{ padding: '12px 0' }}>No reviews yet</p>
                  )}
                </>
              ) : null}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setSelectedDoctor(null); navigate('/appointments') }}>
                📅 Book Appointment
              </button>
              <button className="btn btn-outline" onClick={() => { setSelectedDoctor(null); setDoctorReviews(null) }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewDoctor && (
        <ReviewModal
          doctorId={showReviewDoctor.userId}
          doctorName={showReviewDoctor.name}
          appointmentId={showReviewDoctor.appointmentId}
          patientId={user.userId}
          onClose={() => setShowReviewDoctor(null)}
          onSubmitted={() => fetchDoctors()}
        />
      )}
    </Layout>
  )
}
