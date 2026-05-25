import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://healthcare-backend-wxmi.onrender.com/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('hc_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ---- Auth ----
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  sendOtp: (email) => api.post('/auth/otp/send', { email }),
  verifyOtp: (email, otp) => api.post('/auth/otp/verify', { email, otp }),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
}

// ---- Appointments ----
export const appointmentAPI = {
  book: (data) => api.post('/appointments', data),
  getByPatient: (id) => api.get(`/appointments/patient/${id}`),
  getByDoctor: (id) => api.get(`/appointments/doctor/${id}`),
  updateStatus: (id, data) => api.patch(`/appointments/${id}/status`, data),
  reschedule: (id, data) => api.patch(`/appointments/${id}/schedule`, data),
  cancel: (id) => api.delete(`/appointments/${id}`)
}

// ---- Users & Profile ----
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfilePicture: (formData) => api.post('/users/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ---- Notifications ----
export const notificationAPI = {
  get: () => api.get('/notifications'),
  markRead: () => api.post('/notifications/mark-read')
}

// ---- Prescriptions ----
export const prescriptionAPI = {
  create: (data) => api.post('/prescriptions', data),
  getByPatient: (id) => api.get(`/prescriptions/patient/${id}`),
  getByDoctor: (id) => api.get(`/prescriptions/doctor/${id}`),
  getById: (id) => api.get(`/prescriptions/${id}`)
}

// ---- Doctor Availability ----
export const availabilityAPI = {
  mark: (data) => api.post('/availability/mark', data),
  getByDoctor: (id) => api.get(`/availability/${id}`),
  remove: (id) => api.delete(`/availability/${id}`),
  check: (doctorId, date, time) => api.get('/availability/check', { params: { doctorId, date, time } })
}

// ---- Billing ----
export const billingAPI = {
  request: (data) => api.post('/billing/request', data),
  getByDoctor: (id) => api.get(`/billing/doctor/${id}`),
  getByPatient: (id) => api.get(`/billing/patient/${id}`),
  pay: (id) => api.patch(`/billing/${id}/pay`),
  doctorStats: (id) => api.get(`/billing/stats/${id}`),
  patientStats: (id) => api.get(`/billing/stats/patient/${id}`)
}

// ---- Admin ----
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  allUsers: () => api.get('/admin/users'),
  patients: () => api.get('/admin/patients'),
  doctors: () => api.get('/admin/doctors'),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`)
}

// ---- AI (Groq via backend) ----
export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
  symptomCheck: (symptoms) => api.post('/ai/symptom-check', { symptoms }),
  analyzeReport: (reportData) => api.post('/ai/analyze-report', { reportData })
}

// ---- Emergency ----
export const emergencyAPI = {
  getContacts: () => api.get('/emergency/contacts'),
  sendAlert: (data) => api.post('/emergency/alert', data)
}

// ---- Telemedicine ----
export const telemedicineAPI = {
  sendInvite: (data) => api.post('/telemedicine/invite', data)
}

// ---- Doctor Profiles & Search ----
export const doctorAPI = {
  saveProfile: (data) => api.post('/doctors/profile', data),
  getProfile: (userId) => api.get(`/doctors/profile/${userId}`),
  search: (params) => api.get('/doctors/search', { params }),
  getReviews: (doctorId) => api.get(`/doctors/${doctorId}/reviews`),
  submitReview: (doctorId, data) => api.post(`/doctors/${doctorId}/reviews`, data),
  checkReview: (doctorId, patientId, appointmentId) =>
    api.get(`/doctors/${doctorId}/reviews/check`, { params: { patientId, appointmentId } }),
}

// ---- Direct Groq AI (Proxy via backend) ----
// chatHistory: array of { role: 'user'|'bot', text: string }
// systemPrompt: string for system instruction
export const groqChat = async (chatHistory, systemPrompt = '') => {
  // Convert our chat history format to OpenAI/Groq format
  const messages = []
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  const history = Array.isArray(chatHistory) ? chatHistory : [{ role: 'user', text: chatHistory }]
  
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    })
  }

  try {
    const res = await api.post('/ai/chat', { messages })
    return res.data.response
  } catch (error) {
    console.error('Groq via backend error:', error)
    return `AI Error: ${error.response?.data?.error || error.message}`
  }
}

export default api
