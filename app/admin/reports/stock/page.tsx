"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StockReportRedirect() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to the new comprehensive stock usage report
        router.replace("/admin/reports/stock-usage")
    }, [router])

    return (
        <div className="min-h-screen bg-white p-8 flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-gray-400">Redirecting to Enhanced Stock Usage Report...</p>
            </div>
        </div>
    )
}