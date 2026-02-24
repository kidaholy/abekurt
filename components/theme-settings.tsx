"use client"

import React, { useState } from 'react'
import { useTheme } from '@/context/theme-context'
import { Settings, Palette, Sun, Moon, Coffee, Monitor } from 'lucide-react'

interface ThemeSettingsProps {
  className?: string
}

export function ThemeSettings({ className = '' }: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themes = [
    {
      id: 'light' as const,
      name: 'Light Mode',
      description: 'Bright yellow and white with high contrast text',
      icon: Sun,
      preview: 'bg-gradient-to-br from-yellow-100 to-white'
    },
    {
      id: 'dark' as const,
      name: 'Dark Mode', 
      description: 'Cozy evening coffee shop ambiance',
      icon: Moon,
      preview: 'bg-gradient-to-br from-gray-900 to-amber-900'
    }
  ]

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label="Theme settings"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium">Theme</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Settings Panel */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Palette className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Theme Settings</h3>
                <p className="text-xs text-muted-foreground">Customize your coffee shop experience</p>
              </div>
            </div>

            <div className="space-y-3">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon
                const isSelected = theme === themeOption.id
                
                return (
                  <button
                    key={themeOption.id}
                    onClick={() => {
                      setTheme(themeOption.id)
                      setIsOpen(false)
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02] ${
                      isSelected 
                        ? 'border-accent bg-accent/5 shadow-md' 
                        : 'border-border hover:border-accent/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${themeOption.preview}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${isSelected ? 'text-accent' : 'text-card-foreground'}`}>
                            {themeOption.name}
                          </span>
                          {isSelected && (
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {themeOption.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coffee className="w-3 h-3" />
                <span>Theme changes are saved automatically</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for mobile/small spaces
export function CompactThemeSettings() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-lg bg-card hover:bg-muted border border-border flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Sun className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  )
}