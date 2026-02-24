"use client"

import Image from "next/image"
import { useSettings } from "@/context/settings-context"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
  textColor?: string
}

export function Logo({ size = "md", showText = true, className = "", textColor }: LogoProps) {
  const { settings, loading } = useSettings()

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl"
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse`} />
        {showText && (
          <div className="hidden sm:block">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-1" />
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      {settings.logo_url ? (
        <div className={`${sizeClasses[size]} relative overflow-hidden rounded-full border-2 border-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
          <Image
            src={settings.logo_url}
            alt={`${settings.app_name} Logo`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 32px, 48px"
          />
        </div>
      ) : (
        <div className={`${sizeClasses[size]} bg-[#f4a261] rounded-full flex items-center justify-center font-bold text-white text-2xl transition-transform duration-300 swirl-s select-none group-hover:rotate-12`}>
          {settings.app_name.charAt(0).toUpperCase()}
        </div>
      )}
      
      {showText && (
        <div className="hidden sm:block">
          <h1 className={`${textSizeClasses[size]} font-bold brand-font ${textColor || 'text-sidebar-foreground'}`}>
            {settings.app_name}
          </h1>
          <p className={`text-xs ${textColor ? textColor.replace('text-', 'text-').replace('-foreground', '') + '/70' : 'text-sidebar-foreground/70'}`}>
            {settings.app_tagline}
          </p>
        </div>
      )}
    </div>
  )
}