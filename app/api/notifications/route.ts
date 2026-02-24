import { NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { getNotifications, addNotification as addNotif, markAsRead } from "@/lib/notifications"



export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      // Return empty notifications array instead of error for unauthenticated users
      return NextResponse.json([])
    }

    try {
      const decoded = await validateSession(request)
      // Get notifications for the user's role
      const userNotifications = getNotifications(decoded.role, decoded.id)
      return NextResponse.json(userNotifications)
    } catch (sessionError: any) {
      // If token is invalid or deactivated, return empty array for notifications
      console.log("Session validation failed for notifications, returning empty:", sessionError.message)
      return NextResponse.json([])
    }
  } catch (error: any) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ message: error.message || "Failed to get notifications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await validateSession(request)

    const body = await request.json()
    const { type, message, targetRole, targetUser } = body

    const notification = addNotif(type || "info", message, targetRole, targetUser)

    return NextResponse.json(notification, { status: 201 })
  } catch (error: any) {
    console.error("Create notification error:", error)
    return NextResponse.json({ message: error.message || "Failed to create notification" }, { status: 500 })
  }
}

