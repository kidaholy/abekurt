import type React from "react"
import type { Metadata } from "next"
import { Fredoka } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/context/theme-context"
import { SettingsProvider } from "@/context/settings-context"
import { NotificationCenter } from "@/components/notification-center"

const fredoka = Fredoka({ subsets: ["latin"] })

export const dynamic = "force-dynamic"
export const revalidate = 0

import { connectDB } from "@/lib/db"
import Settings from "@/lib/models/settings"

export async function generateMetadata(): Promise<Metadata> {
  const settingsObj: Record<string, string> = {}

  try {
    await connectDB()
    const settings = await Settings.find({
      key: { $in: ["logo_url", "app_name", "app_tagline"] }
    }).lean()

    settings.forEach((s) => {
      settingsObj[s.key] = s.value
    })
  } catch (err) {
    console.error("Failed to fetch settings for metadata:", err)
    // Fallback settings will be handled below
  }

  // Add cache-busting timestamp
  const timestamp = Date.now()
  const logoUrl = settingsObj.logo_url
    ? (settingsObj.logo_url.startsWith('data:') ? settingsObj.logo_url : `${settingsObj.logo_url}${settingsObj.logo_url.includes('?') ? '&' : '?'}v=${timestamp}`)
    : "/icon.svg"

  const appName = settingsObj.app_name || "Prime Addis"

  return {
    title: `${appName} - Management System`,
    description: settingsObj.app_tagline || "Coffee Shop Management System",
    icons: {
      icon: [
        { url: logoUrl, sizes: 'any' },
        { url: logoUrl, type: 'image/png' },
      ],
      shortcut: [logoUrl],
      apple: [
        { url: logoUrl },
      ],
    },
  }
}

import { LanguageProvider } from "@/context/language-context"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fredoka.className} antialiased bg-white overflow-x-hidden`} suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            <SettingsProvider>
              <AuthProvider>
                <NotificationCenter />
                {children}
              </AuthProvider>
            </SettingsProvider>
          </ThemeProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
