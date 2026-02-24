"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useSettings } from "@/context/settings-context"
import { Logo } from "@/components/logo"
import Link from "next/link"
import Image from "next/image"
import type React from "react"

import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { settings } = useSettings()
  const { t } = useLanguage()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#e2e7d8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#f5bc6b]"></div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">

      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-[#D2691E] rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#CD853F] rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full z-10">

        {/* Brand Card */}
        <div className="bg-[#8B4513] rounded-[50px] p-10 flex flex-col justify-between text-white custom-shadow relative overflow-hidden min-h-[500px] group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Logo size="lg" showText={true} textColor="text-[#e2e7d8]" />
            </div>
            <h1 className="text-5xl font-bold mb-4 leading-tight bubbly-text">
              {t("login.manage")} <br /> <span className="text-[#f5bc6b]">{t("login.deliciously")}</span>
            </h1>
            <p className="text-lg opacity-80 max-w-sm">
              {t("login.description")}
            </p>
          </div>


          {/* Decorative Circle/Image */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#ffffff] rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500"></div>
          <Image
            src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop"
            alt="Coffee Background"
            fill
            className="object-cover opacity-20 mix-blend-overlay pointer-events-none"
          />
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-[50px] p-10 flex flex-col justify-center custom-shadow relative">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2 bubbly-text">{t("login.title")}</h2>
            <p className="text-gray-500 font-medium">{t("login.subtitle")}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl mb-6 text-sm font-bold border-l-4 border-red-500 flex items-center gap-2 animate-bounce-custom">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">{t("login.emailLabel")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f3f4f6] px-6 py-4 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-white focus:bg-white transition-all text-[#1a1a1a]"
                placeholder="chef@primeaddis.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">{t("login.passwordLabel")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f3f4f6] px-6 py-4 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-white focus:bg-white transition-all text-[#1a1a1a]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white font-bold text-lg py-4 rounded-2xl hover:bg-[#D2691E] hover:text-[#1a1a1a] hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-lg bubbly-button"
            >
              {loading ? t("login.brewing") : t("login.logIn")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/" className="text-gray-400 font-bold hover:text-[#2d5a41] transition-colors text-sm">
              ← {t("login.backHome")}
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
