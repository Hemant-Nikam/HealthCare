import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hc_token')
    const stored = localStorage.getItem('hc_user')
    if (token && stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const data = res.data
    localStorage.setItem('hc_token', data.token)
    localStorage.setItem('hc_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const register = async (formData) => {
    const res = await authAPI.register(formData)
    const data = res.data
    localStorage.setItem('hc_token', data.token)
    localStorage.setItem('hc_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const googleLogin = async (credential) => {
    const res = await authAPI.googleLogin(credential)
    const data = res.data
    localStorage.setItem('hc_token', data.token)
    localStorage.setItem('hc_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('hc_token')
    localStorage.removeItem('hc_user')
    setUser(null)
  }

  const updateUser = (updatedFields) => {
    const updatedUser = { ...user, ...updatedFields }
    localStorage.setItem('hc_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
