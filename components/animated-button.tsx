"use client"

import { useState } from "react"

interface AnimatedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "rainbow" | "glow"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
}

export function AnimatedButton({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  disabled = false,
  className = "",
  type = "button"
}: AnimatedButtonProps) {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = () => {
    if (disabled) return
    
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 300)
    
    if (onClick) onClick()
  }

  const getVariantClasses = () => {
    switch (variant) {
      case "rainbow":
        return "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover-rainbow"
      case "glow":
        return "bg-accent text-accent-foreground hover-glow"
      case "secondary":
        return "bg-secondary text-secondary-foreground hover-lift"
      default:
        return "bg-accent text-accent-foreground hover-lift"
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-1.5 text-sm"
      case "lg":
        return "px-8 py-4 text-lg"
      default:
        return "px-6 py-3"
    }
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-lg font-semibold
        transition-all duration-300 ease-out
        transform active:scale-95
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${isClicked ? "animate-shake" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {/* Ripple effect */}
      <span className="absolute inset-0 bg-white/20 transform scale-0 rounded-full transition-transform duration-300 ease-out group-active:scale-100" />
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      
      {/* Shine effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full transition-transform duration-700 ease-out hover:translate-x-full" />
    </button>
  )
}