import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type, timestamp: new Date() }

    setNotifications((prev) => [notification, ...prev])

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const success = useCallback((message, duration) => {
    return addNotification(message, 'success', duration)
  }, [addNotification])

  const error = useCallback((message, duration) => {
    return addNotification(message, 'error', duration)
  }, [addNotification])

  const warning = useCallback((message, duration) => {
    return addNotification(message, 'warning', duration)
  }, [addNotification])

  const info = useCallback((message, duration) => {
    return addNotification(message, 'info', duration)
  }, [addNotification])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll, success, error, warning, info }}>
      {children}
      <NotificationToastContainer />
    </NotificationContext.Provider>
  )
}

function NotificationToastContainer() {
  const { notifications, removeNotification, clearAll } = useContext(NotificationContext)

  if (notifications.length === 0) return null

  const typeStyles = {
    success: 'bg-emerald-500 dark:bg-emerald-600',
    error: 'bg-red-500 dark:bg-red-600',
    warning: 'bg-amber-500 dark:bg-amber-600',
    info: 'bg-blue-500 dark:bg-blue-600',
  }

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'ℹ',
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg border border-slate-200 dark:border-slate-700 animate-slide-in"
        >
          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${typeStyles[notification.type]}`}>
            {typeIcons[notification.type]}
          </span>
          <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            {notification.message}
          </p>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      {notifications.length > 1 && (
        <button
          onClick={clearAll}
          className="mt-2 self-end text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Hapus semua
        </button>
      )}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}