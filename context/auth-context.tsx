"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cashier" | "chef" | "display"
  floorId?: string
  floorName?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth from localStorage and set up global interceptor
  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))

      // Initial health check: Verify if the user is still active
      fetch("/api/system-check", {
        headers: { Authorization: `Bearer ${storedToken}` }
      }).then(res => {
        if (res.status === 401) {
          console.warn("🚫 Initial check failed: Account deactivated or token invalid. Logging out.")
          logout()
        }
      }).catch(err => console.error("Health check failed:", err))
    }
    setLoading(false)

    // Global fetch interceptor to handle 401s (deactivation/expired session)
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        // Check if we are already on login page or calling login/system-check to avoid loops
        const url = args[0] instanceof Request ? args[0].url : String(args[0])
        const isAuthRequest = url.includes("/api/auth/login") || url.includes("/api/system-check")
        const isLoginPage = window.location.pathname === "/login"

        if (!isAuthRequest && !isLoginPage) {
          console.warn("🚫 401 Unauthorized detected globally. Forcing logout.")
          logout()
        }
      }
      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      let errorMessage = "Login failed"
      try {
        const error = await response.json()
        errorMessage = error.message || errorMessage
      } catch (e) {
        errorMessage = `Server Error: ${response.status}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Update state and storage immediately
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))

    // Route based on role
    const roleRoutes: Record<string, string> = {
      admin: "/admin",
      cashier: "/cashier",
      chef: "/chef",
      display: "/display",
    }
    router.push(roleRoutes[data.user.role] || "/login")
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token,
        hasRole: (roles) => (user ? roles.includes(user.role) : false),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
