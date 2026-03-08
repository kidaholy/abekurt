import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { connectDB } from "@/lib/db"
import Settings from "@/lib/models/settings"

export async function GET(request: Request) {
  try {
    await connectDB()

    // Get public settings (logo, app name, etc.)
    const publicSettings = await (Settings as any).find({
      key: { $in: ["logo_url", "favicon_url", "app_name", "app_tagline", "vat_rate", "enable_cashier_printing"] }
    }).lean()

    // Convert to key-value object
    const settingsObject = publicSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Provide defaults if settings don't exist
    const defaultSettings = {
      logo_url: "",
      favicon_url: "",
      app_name: "Prime Addis",
      app_tagline: "Coffee Management",
      enable_cashier_printing: "true",
      ...settingsObject
    }

    return NextResponse.json(defaultSettings)
  } catch (error: any) {
    console.error("Get public settings error:", error)
    // Return defaults on error
    return NextResponse.json({
      logo_url: "",
      app_name: "Prime Addis",
      app_tagline: "Coffee Management"
    })
  }
}