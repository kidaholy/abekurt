"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"

interface NotificationBadgeProps {
  children: React.ReactNode
}

export function NotificationBadge({ children }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return

    const checkNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const notifications = await response.json()
          const unread = notifications.filter((n: any) => !n.read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error("Failed to check notifications:", error)
      }
    }

    // Check immediately
    checkNotifications()

    // Check every 5 seconds
    const interval = setInterval(checkNotifications, 5000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <div className="relative">
      {children}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-danger text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-bounce font-bold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </div>
  )
}