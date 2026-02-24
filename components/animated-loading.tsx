"use client"

interface AnimatedLoadingProps {
  message?: string
  type?: "coffee" | "food" | "general"
}

export function AnimatedLoading({ message = "Loading...", type = "general" }: AnimatedLoadingProps) {
  const getIcon = () => {
    switch (type) {
      case "coffee":
        return "☕"
      case "food":
        return "🍽️"
      default:
        return "⭐"
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        {/* Rotating outer ring */}
        <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        
        {/* Pulsing inner icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl animate-bounce-gentle">{getIcon()}</span>
        </div>
        
        {/* Floating particles around loader */}
        <div className="absolute -inset-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent rounded-full animate-particle-float opacity-60"
              style={{
                left: `${50 + 30 * Math.cos((i * Math.PI * 2) / 8)}%`,
                top: `${50 + 30 * Math.sin((i * Math.PI * 2) / 8)}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Animated text */}
      <p className="text-muted-foreground mt-6 animate-pulse-glow font-medium">
        {message}
      </p>
      
      {/* Loading dots */}
      <div className="flex space-x-1 mt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-accent rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}