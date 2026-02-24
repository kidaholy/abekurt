"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import en from "@/locales/en.json"
import am from "@/locales/am.json"

type Language = "en" | "am"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const translations = { en, am }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en")

    useEffect(() => {
        const savedLang = localStorage.getItem("language") as Language
        if (savedLang && (savedLang === "en" || savedLang === "am")) {
            setLanguageState(savedLang)
        }
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem("language", lang)
        document.documentElement.lang = lang
    }

    const t = (keyPath: string) => {
        const keys = keyPath.split(".")
        let current: any = translations[language]

        for (const key of keys) {
            if (current[key] === undefined) {
                return keyPath
            }
            current = current[key]
        }

        return current
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
