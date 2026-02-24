"use client"

import { useLanguage } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-white/50 backdrop-blur-md hover:bg-white/80 transition-colors custom-shadow">
                    <Languages className="h-5 w-5 text-[#2d5a41]" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-xl bg-white/90 backdrop-blur-md">
                <DropdownMenuItem
                    onClick={() => setLanguage("en")}
                    className={`cursor-pointer rounded-xl mx-1 my-1 transition-colors ${language === "en" ? "bg-[#2d5a41] text-white" : "hover:bg-[#2d5a41]/10"}`}
                >
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage("am")}
                    className={`cursor-pointer rounded-xl mx-1 my-1 transition-colors ${language === "am" ? "bg-[#2d5a41] text-white" : "hover:bg-[#2d5a41]/10"}`}
                >
                    አማርኛ (Amharic)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
