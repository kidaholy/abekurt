"use client"

import Image from "next/image"
import { useLanguage } from "@/context/language-context"

interface MenuItemCardProps {
  menuId?: string
  name: string
  price: number
  description?: string
  image?: string
  category: string
  preparationTime?: number
  onAddToCart: () => void
  isSelected?: boolean
  index?: number
}

export function MenuItemCard({
  menuId,
  name,
  price,
  description,
  image,
  category,
  preparationTime,
  onAddToCart,
  isSelected = false,
  index = 0,
}: MenuItemCardProps) {
  const { t } = useLanguage()
  const getCategoryEmoji = (cat: string) => {
    const emojiMap: Record<string, string> = {
      "Hot Coffee": "☕",
      "Iced & Cold Coffee": "🧊",
      "Tea & Infusions": "🍵",
      "Hot Specialties": "🔥",
      "Drinks": "🥤",
      "Juice": "🧃",
      "Mojito": "🍹",
      Breakfast: "🥞",
      Salad: "🥗",
      Burrito: "🌯",
      Burgers: "🍔",
      Wraps: "🌯",
      Sandwich: "🥪",
      Pasta: "🍝",
      Chicken: "🍗",
      "Ethiopian Taste": "🇪🇹",
    }
    return emojiMap[cat] || "🍴"
  }

  return (
    <div
      className={`group card-base hover:shadow-2xl transition-all transform hover:-translate-y-2 cursor-pointer animate-slide-in-up overflow-hidden border-2 ${isSelected ? "border-accent shadow-lg shadow-accent/50" : "border-border"
        }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Item Image */}
      <div className="relative w-full h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg overflow-hidden mb-2">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Fallback to category emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="text-6xl opacity-70 animate-float">${getCategoryEmoji(category)}</div></div>`;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-70 animate-float">{getCategoryEmoji(category)}</div>
          </div>
        )}

        {/* Animated overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />

        {/* Price badge */}
        <div className="absolute top-1 right-1 bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
          {price} {t("common.currencyBr")}
        </div>

        {/* Category icon */}
        <div className="absolute top-1 left-1 text-lg">
          {getCategoryEmoji(category)}
        </div>

        {/* Menu ID Badge */}
        {menuId && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono border border-white/20">
            ID: {menuId}
          </div>
        )}
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
      </div>

      {description && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1 group-hover:text-accent/80 transition-colors">{description}</p>}

      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-bold text-accent">{price} {t("common.currencyBr")}</div>
        {preparationTime && (
          <div className="flex items-center gap-0.5 text-[9px] bg-primary/20 text-foreground px-1.5 py-0.5 rounded-full">
            <span>⏱</span> {preparationTime}m
          </div>
        )}
      </div>

      <button
        onClick={onAddToCart}
        className={`w-full py-2 rounded-lg font-bold text-xs transition-all ${isSelected
          ? "bg-accent/30 text-accent border-2 border-accent animate-pulse-glow"
          : "bg-accent text-accent-foreground hover:opacity-90 transform hover:scale-105"
          }`}
      >
        {isSelected ? (
          <>
            <span className="animate-bounce">✓</span> {t("menu.addedToCart")}
          </>
        ) : (
          <>
            <span className="group-hover:animate-wiggle">🛒</span> {t("menu.addToOrder")}
          </>
        )}
      </button>
    </div>
  )
}
