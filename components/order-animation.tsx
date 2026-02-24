"use client"

import { useLanguage } from "@/context/language-context"

interface OrderAnimationProps {
  orderNumber: string
  totalItems: number
  isVisible: boolean
}

export function OrderAnimation({ orderNumber, totalItems, isVisible }: OrderAnimationProps) {
  const { t } = useLanguage()

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" />

      {/* Lightning Fast Success Splash */}
      <div className="relative bg-white border-4 border-[#2d5a41] rounded-[40px] p-10 text-center shadow-[0_30px_60px_rgba(0,0,0,0.3)] animate-scale-in max-w-sm mx-4 overflow-hidden">
        {/* Top Progress Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#2d5a41] animate-progress-fast" />

        {/* Animated Icon */}
        <div className="text-8xl mb-6 animate-bounce-gentle">✨</div>

        {/* Success Text */}
        <h2 className="text-4xl font-black text-gray-900 mb-2 leading-tight">
          {t("cashier.checkoutSuccess")}
        </h2>

        {/* Order Card Container */}
        <div className="bg-[#2d5a41]/10 py-3 px-6 rounded-2xl inline-block mb-6 border border-[#2d5a41]/20">
          <p className="text-2xl text-[#2d5a41] font-black tracking-tighter">
            {t("cashier.orderIdPrefix")}{orderNumber}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-3 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
          <span className="w-2 h-2 rounded-full bg-[#2d5a41] animate-ping" />
          <span>{t("cashier.chefPreparing")}</span>
        </div>

        {/* Floating Particles for Flair */}
        <div className="absolute -top-4 -right-4 text-2xl animate-float-slow opacity-50">🎈</div>
        <div className="absolute -bottom-4 -left-4 text-2xl animate-float-slow delay-700 opacity-50">✨</div>
      </div>
    </div>
  )
}
