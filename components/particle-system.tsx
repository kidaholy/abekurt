"use client"

import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
}

export function ParticleSystem() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const colors = [
      "rgba(184, 134, 11, 0.6)", // Gold
      "rgba(255, 215, 0, 0.4)",  // Light Gold
      "rgba(255, 165, 0, 0.5)",  // Orange
      "rgba(255, 255, 255, 0.3)", // White
    ]

    // Create initial particles
    const initialParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    setParticles(initialParticles)

    const animateParticles = () => {
      setParticles(prev => 
        prev.map(particle => {
          let nextX = particle.x + particle.speedX
          let nextY = particle.y + particle.speedY
          
          // Wrap around screen boundaries
          if (nextX > window.innerWidth) nextX = 0
          if (nextX < 0) nextX = window.innerWidth
          if (nextY > window.innerHeight) nextY = 0
          if (nextY < 0) nextY = window.innerHeight
          
          return {
            ...particle,
            x: nextX,
            y: nextY,
          }
        })
      )
    }

    const interval = setInterval(animateParticles, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="particles">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle animate-float"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color,
            opacity: particle.opacity,
            animationDelay: `${particle.id * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}