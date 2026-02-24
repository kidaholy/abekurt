"use client"

import { useEffect, useState } from "react"

interface AnimatedWelcomeProps {
  title: string
  subtitle?: string
  onComplete?: () => void
}

export function AnimatedWelcome({ title, subtitle, onComplete }: AnimatedWelcomeProps) {
  const [showTitle, setShowTitle] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowTitle(true), 300)
    const timer2 = setTimeout(() => setShowSubtitle(true), 800)
    const timer3 = setTimeout(() => setShowParticles(true), 1200)
    const timer4 = setTimeout(() => onComplete?.(), 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Animated background particles */}
      {showParticles && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent rounded-full animate-particle-float opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center relative z-10">
        {/* Main title */}
        {showTitle && (
          <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-bounce-in">
            <span className="animate-neon-flicker bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
        )}

        {/* Subtitle */}
        {showSubtitle && subtitle && (
          <p className="text-xl md:text-2xl text-muted-foreground animate-slide-in-up animate-typewriter">
            {subtitle}
          </p>
        )}

        {/* Loading animation */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-accent rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}