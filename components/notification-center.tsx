"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error"
  message: string
  timestamp: Date | string
  read: boolean
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastCheck, setLastCheck] = useState<Date>(new Date())
  const { token } = useAuth()

  // Poll for new notifications every 3 seconds
  useEffect(() => {
    if (!token) return

    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const newNotifications = await response.json()

          // Filter for notifications newer than last check
          const recentNotifications = newNotifications.filter(
            (notif: Notification) => {
              const notifTime = new Date(notif.timestamp)
              return notifTime > lastCheck
            }
          )

          if (recentNotifications.length > 0) {
            setNotifications(prev => {
              const combined = [...recentNotifications, ...prev]
              return combined.slice(0, 10) // Keep only latest 10
            })

            setLastCheck(new Date())

            // Play notification sound
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
              audio.volume = 0.3
              audio.play().catch(() => { }) // Ignore errors if audio fails
            } catch (error) {
              // Ignore audio errors
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    // Initial fetch
    fetchNotifications()

    // Set up polling (every 5 seconds)
    const interval = setInterval(fetchNotifications, 5000)
    return () => clearInterval(interval)
  }, [token, lastCheck])

  // Auto-remove notifications after 8 seconds
  useEffect(() => {
    notifications.forEach(notif => {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id))
      }, 8000)
    })
  }, [notifications])

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`p-4 rounded-lg shadow-lg animate-bounce-in hover-glow cursor-pointer ${getNotificationColor(notif.type)}`}
          onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
        >
          <p className="font-semibold">{notif.message}</p>
          <p className="text-xs opacity-75 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
        </div>
      ))}
    </div>
  )
}

function getNotificationColor(type: Notification["type"]) {
  switch (type) {
    case "success":
      return "bg-success/20 text-success border border-success/30"
    case "error":
      return "bg-danger/20 text-danger border border-danger/30"
    case "warning":
      return "bg-warning/20 text-warning border border-warning/30"
    default:
      return "bg-info/20 text-info border border-info/30"
  }
}
