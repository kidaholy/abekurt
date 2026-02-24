"use client"

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/context/theme-context'
import { Sun, Moon, Coffee } from 'lucide-react'

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'coffee'
  className?: string
}

export function ThemeToggle({ variant = 'default', className = '' }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder that matches the button size
    return (
      <div className={`relative inline-flex items-center justify-center rounded-xl w-12 h-12 bg-card border border-border ${className}`}>
        <div className="w-5 h-5 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const baseClasses = "relative inline-flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
  
  const variants = {
    default: "w-12 h-12 bg-card hover:bg-muted border border-border shadow-md hover:shadow-lg",
    compact: "w-8 h-8 bg-transparent hover:bg-muted/50",
    coffee: "w-14 h-14 bg-gradient-to-br from-primary to-primary-light hover:from-primary-light hover:to-primary text-primary-foreground shadow-coffee hover:shadow-coffee-lg"
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {variant === 'coffee' ? (
          <Coffee 
            className={`w-5 h-5 transition-all duration-300 ${
              theme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-180 opacity-70'
            }`}
          />
        ) : (
          <>
            <Sun 
              className={`absolute w-5 h-5 transition-all duration-300 ${
                theme === 'light' 
                  ? 'rotate-0 scale-100 opacity-100' 
                  : 'rotate-90 scale-0 opacity-0'
              }`}
            />
            <Moon 
              className={`absolute w-5 h-5 transition-all duration-300 ${
                theme === 'dark' 
                  ? 'rotate-0 scale-100 opacity-100' 
                  : '-rotate-90 scale-0 opacity-0'
              }`}
            />
          </>
        )}
      </div>
      
      {/* Animated background for coffee variant */}
      {variant === 'coffee' && (
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br transition-opacity duration-300 ${
          theme === 'dark' 
            ? 'from-accent/20 to-secondary/20 opacity-100' 
            : 'from-accent/10 to-secondary/10 opacity-0'
        }`} />
      )}
    </button>
  )
}

// Preset theme toggle components for different use cases
export function HeaderThemeToggle() {
  return <ThemeToggle variant="default" className="ml-2" />
}

export function SidebarThemeToggle() {
  return <ThemeToggle variant="compact" className="text-sidebar-foreground hover:text-sidebar-primary bg-sidebar-accent/30 hover:bg-sidebar-accent/50 border border-sidebar-border/30" />
}

export function CoffeeThemeToggle() {
  return <ThemeToggle variant="coffee" className="animate-pulse-glow" />
}