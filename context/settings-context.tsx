"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AppSettings {
  logo_url: string
  app_name: string
  app_tagline: string
  vat_rate: string
}

interface SettingsContextType {
  settings: AppSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    logo_url: "",
    app_name: "Prime Addis",
    app_tagline: "Coffee Management",
    vat_rate: "0.08"
  })
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      const response = await fetch("/api/settings/public")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}