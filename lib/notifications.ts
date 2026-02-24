// Simple in-memory notification store
// In production, this should be replaced with Redis or a database

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error"
  message: string
  timestamp: Date
  targetRole?: string
  targetUser?: string
  read: boolean
}

let notifications: Notification[] = []

export function addNotification(
  type: "info" | "success" | "warning" | "error",
  message: string,
  targetRole?: string,
  targetUser?: string
): Notification {
  const notification: Notification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    message,
    timestamp: new Date(),
    targetRole,
    targetUser,
    read: false
  }

  notifications.unshift(notification)
  
  // Keep only last 100 notifications
  notifications = notifications.slice(0, 100)
  
  console.log(`📢 Notification added: ${message} (${targetRole || 'all'})`)
  
  return notification
}

export function getNotifications(userRole?: string, userId?: string): Notification[] {
  return notifications.filter(
    notif => 
      !notif.targetRole || 
      notif.targetRole === userRole ||
      notif.targetUser === userId
  ).slice(0, 10) // Get latest 10 notifications
}

export function markAsRead(notificationId: string): boolean {
  const notification = notifications.find(n => n.id === notificationId)
  if (notification) {
    notification.read = true
    return true
  }
  return false
}

export function clearOldNotifications(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  notifications = notifications.filter(n => n.timestamp > oneHourAgo)
}