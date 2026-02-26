"use client"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { ShieldAlert, ArrowLeft, Home, LogOut } from "lucide-react"
import { motion } from "framer-motion"

export default function UnauthorizedPage() {
    const { user, logout } = useAuth()
    const router = useRouter()

    const handleGoHome = () => {
        if (!user) {
            router.push("/login")
            return
        }

        const roleHome: Record<string, string> = {
            admin: "/admin",
            cashier: "/cashier",
            chef: "/chef",
            display: "/display",
            store_keeper: "/admin/store"
        }

        router.push(roleHome[user.role] || "/login")
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full text-center space-y-8">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="relative inline-block"
                >
                    <div className="w-32 h-32 bg-red-50 rounded-[2.5rem] flex items-center justify-center relative z-10 mx-auto shadow-xl shadow-red-100/50 border border-red-100">
                        <ShieldAlert className="w-16 h-16 text-red-500" />
                    </div>
                    <div className="absolute -inset-4 bg-red-100/30 rounded-[3rem] blur-2xl -z-0 opacity-50" />
                </motion.div>

                <div className="space-y-4">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-black text-gray-900 tracking-tight"
                    >
                        Access Denied
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-500 font-bold leading-relaxed"
                    >
                        It looks like you don't have the necessary permissions to access this area.
                        Please contact your administrator if you believe this is an error.
                    </motion.p>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-6 flex flex-col gap-3"
                >
                    <button
                        onClick={handleGoHome}
                        className="w-full bg-[#8B4513] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-[#6F370F] transition-all shadow-xl shadow-[#8B4513]/20 flex items-center justify-center gap-2 group"
                    >
                        <Home className="w-4 h-4" />
                        Return to Dashboard
                        <ArrowLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={logout}
                            className="flex-1 bg-white border-2 border-red-50 text-red-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-3 h-3" />
                            Sign Out
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]"
                >
                    Abekut Inventory System • Security Protocol 403
                </motion.div>
            </div>
        </div>
    )
}
