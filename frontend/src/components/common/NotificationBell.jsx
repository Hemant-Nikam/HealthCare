import React, { useState, useEffect, useRef } from 'react'
import { notificationAPI } from '../../services/api'
import { Link } from 'react-router-dom'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.get()
      setNotifications(res.data.notifications)
      setUnreadCount(res.data.unreadCount)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    }
  }

  const handleOpen = async () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      try {
        await notificationAPI.markRead()
        setUnreadCount(0)
      } catch (err) {
        console.error('Failed to mark notifications as read', err)
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
        title="Notifications"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
          <div className="py-2 bg-gray-50 border-b border-gray-200 px-4">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`px-4 py-3 border-b border-gray-100 ${notif.isRead ? 'bg-white' : 'bg-blue-50'}`}>
                  <p className="text-sm text-gray-800">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="py-2 bg-gray-50 border-t border-gray-200 text-center">
            <Link to="/appointments" className="text-sm text-blue-600 hover:text-blue-800" onClick={() => setIsOpen(false)}>
              View Appointments
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
