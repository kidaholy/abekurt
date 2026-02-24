"use client"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

interface AuthHeaderProps {
  title?: string
  description?: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>

          <button
            onClick={logout}
            className="px-3 py-1 text-sm bg-danger text-white rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
