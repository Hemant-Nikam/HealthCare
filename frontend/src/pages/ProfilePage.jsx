import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { userAPI, BASE_URL } from '../services/api'
import { toast } from 'react-toastify'
import Layout from '../components/common/Layout'

const ProfilePage = () => {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    profilePicture: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await userAPI.getProfile()
      setProfile(res.data)
      setPreviewUrl(res.data.profilePicture ? (BASE_URL.replace('/api', '') + res.data.profilePicture) : '')
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handlePictureUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      setSaving(true)
      const res = await userAPI.uploadProfilePicture(formData)
      setProfile(prev => ({ ...prev, profilePicture: res.data.profilePicture }))
      
      // Update global auth state to reflect new picture
      if (user) {
        updateUser({ profilePicture: res.data.profilePicture })
      }
      
      toast.success('Profile picture updated!')
      setSelectedFile(null)
    } catch (err) {
      toast.error('Failed to upload picture')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await userAPI.updateProfile({ name: profile.name, phone: profile.phone })
      
      if (user) {
        updateUser({ name: profile.name, phone: profile.phone })
      }
      
      toast.success('Profile info updated!')
    } catch (err) {
      toast.error('Failed to update profile info')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Layout title="My Profile"><div className="loading">Loading profile...</div></Layout>

  return (
    <Layout title="My Profile">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Banner Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #1340a8 100%)',
          borderRadius: 'var(--radius)', padding: '32px 40px', marginBottom: 24,
          color: 'white', display: 'flex', alignItems: 'center', gap: 24,
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)'
        }}>
          {/* Avatar Area */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%', backgroundColor: 'white',
              border: '4px solid rgba(255, 255, 255, 0.4)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '3rem' }}>{profile.role === 'DOCTOR' ? '👨‍⚕️' : '👤'}</span>
              )}
            </div>
            
            <label style={{
              position: 'absolute', bottom: 0, right: -10,
              background: '#f59e0b', color: 'white', width: 36, height: 36,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: '0.2s'
            }} title="Change Photo">
              📷
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 4 }}>
              {profile.name}
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: 0.9 }}>
              <span className={`badge badge-${profile.role === 'DOCTOR' ? 'warning' : 'success'}`} style={{ color: 'black', fontWeight: 700 }}>
                {profile.role}
              </span>
              <span>{profile.email}</span>
            </div>
            {selectedFile && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" style={{ background: '#f59e0b', color: 'black', border: 'none' }} onClick={handlePictureUpload} disabled={saving}>
                  {saving ? 'Uploading...' : 'Save Picture'}
                </button>
                <button className="btn btn-sm btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => { setSelectedFile(null); setPreviewUrl(profile.profilePicture ? (BASE_URL.replace('/api', '') + profile.profilePicture) : '') }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="card" style={{ marginBottom: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--grey-100)', padding: '20px 24px' }}>
            <h3 className="card-title" style={{ fontSize: '1.25rem' }}>Personal Information</h3>
          </div>
          <div className="card-body" style={{ padding: '24px' }}>
            <form onSubmit={handleSaveInfo}>
              <div className="grid-2" style={{ gap: 24, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="form-control"
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="form-control"
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}
                  />
                </div>
              </div>
              
              <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="form-control"
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--grey-200)', background: 'var(--grey-100)', color: 'var(--grey-500)', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--grey-400)', marginTop: 6 }}>Email cannot be changed.</p>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Account Type</label>
                  <input
                    type="text"
                    value={profile.role}
                    disabled
                    className="form-control"
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--grey-200)', background: 'var(--grey-100)', color: 'var(--grey-500)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: 8 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {profile.role === 'DOCTOR' && (
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)', borderLeft: '4px solid #06b6d4',
            padding: '16px 20px', borderRadius: '0 8px 8px 0', display: 'flex', gap: 16,
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '1.5rem' }}>ℹ️</div>
            <div>
              <p style={{ margin: 0, color: '#0e7490', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5 }}>
                To update your professional details (like specialization, hospital affiliation, and consultation fee), please log out and re-register or contact the admin.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ProfilePage
