import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Settings from "@/lib/models/settings"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)

    // Only admins can access settings
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    await connectDB()

    const settings = await Settings.find({}).lean()

    // Convert to key-value object for easier frontend usage
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        updatedAt: setting.updatedAt
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json(settingsObject)
  } catch (error: any) {
    console.error("Get settings error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get settings" }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const decoded = await validateSession(request)

    // Only admins can update settings
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    await connectDB()

    const { key, value, type, description } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json({ message: "Key and value are required" }, { status: 400 })
    }

    // Update or create setting
    const setting = await Settings.findOneAndUpdate(
      { key },
      {
        key,
        value: String(value),
        type: type || "string",
        description
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    )

    console.log(`✅ Setting updated: ${key} = ${value}`)
    return NextResponse.json(setting)
  } catch (error: any) {
    console.error("Update settings error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to update setting" }, { status })
  }
}