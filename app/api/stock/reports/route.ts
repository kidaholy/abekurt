import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// GET stock health & movement report
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const format = searchParams.get("format") || "json" // json, csv, pdf
        const period = searchParams.get("period") || "month" // today, week, month, year, all
        const category = searchParams.get("category")

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        // Calculate date range for restock filtering
        const now = new Date()
        let startDate = new Date()

        switch (period) {
            case "today":
                startDate.setHours(0, 0, 0, 0)
                break
            case "week":
                const day = now.getDay()
                const diff = now.getDate() - day + (day === 0 ? -6 : 1)
                startDate = new Date(now.setDate(diff))
                startDate.setHours(0, 0, 0, 0)
                break
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1)
                break
            case "all":
                startDate = new Date(2000, 0, 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        // Build query
        let query: any = {}
        if (category) {
            query.category = category
        }

        const stockItems = await Stock.find(query).sort({ name: 1 }).lean()

        // Process each stock item for the report
        const reportData = stockItems.map(item => {
            // Filter restock history for the period
            const periodRestocks = item.restockHistory?.filter((restock: any) =>
                new Date(restock.date) >= startDate
            ) || []

            // Calculate period totals
            const periodRestockVolume = periodRestocks.reduce((sum: number, restock: any) =>
                sum + (restock.quantityAdded || 0), 0
            )
            const periodRestockCost = periodRestocks.reduce((sum: number, restock: any) =>
                sum + (restock.totalCost || 0), 0
            )

            return {
                // Item Details
                name: item.name,
                category: item.category,
                unit: item.unit,
                unitType: item.unitType,

                // Current Status
                currentBalance: item.quantity || 0,
                storeQuantity: item.storeQuantity || 0,
                totalHandled: (item.quantity || 0) + (item.storeQuantity || 0),
                unitCost: item.unitCost || 0,
                averagePurchasePrice: item.averagePurchasePrice || 0,
                totalValue: (item.quantity || 0) * (item.unitCost || 0),
                storeValue: (item.storeQuantity || 0) * (item.averagePurchasePrice || 0),
                totalAssetValue: ((item.quantity || 0) + (item.storeQuantity || 0)) * (item.averagePurchasePrice || 0),
                totalInvestment: item.totalInvestment || 0,
                status: item.status,
                minLimit: item.minLimit || 0,

                // Lifetime Totals
                totalPurchased: item.totalPurchased || 0,
                totalConsumed: item.totalConsumed || 0,

                // Period Specific (based on selected period)
                periodRestockVolume,
                periodRestockCost,
                periodRestockCount: periodRestocks.length,

                // Health Indicators
                isLowStock: item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0),
                isOutOfStock: item.trackQuantity && (item.quantity || 0) <= 0,
                availableForOrder: item.trackQuantity ? (item.status === 'active' && (item.quantity || 0) > 0) : true,

                // Last Restock Info
                lastRestockDate: item.restockHistory?.length > 0 ?
                    item.restockHistory[item.restockHistory.length - 1].date : null,
                lastRestockAmount: item.restockHistory?.length > 0 ?
                    item.restockHistory[item.restockHistory.length - 1].quantityAdded : 0,
            }
        })

        // Calculate summary statistics
        const summary = {
            totalItems: reportData.length,
            totalValue: reportData.reduce((sum, item) => sum + item.totalValue, 0),
            lowStockItems: reportData.filter(item => item.isLowStock).length,
            outOfStockItems: reportData.filter(item => item.isOutOfStock).length,
            activeItems: reportData.filter(item => item.status === 'active').length,
            periodRestockCost: reportData.reduce((sum, item) => sum + item.periodRestockCost, 0),
            periodRestockVolume: reportData.reduce((sum, item) => sum + item.periodRestockVolume, 0),
            categories: [...new Set(reportData.map(item => item.category))],
            reportPeriod: period,
            reportDate: now.toISOString(),
            dateRange: {
                from: startDate.toISOString(),
                to: now.toISOString()
            }
        }

        const response = {
            summary,
            items: reportData,
            metadata: {
                generatedAt: now.toISOString(),
                generatedBy: decoded.email || decoded.id,
                format,
                period,
                category: category || 'all'
            }
        }

        // Handle different export formats
        if (format === "csv") {
            const csvHeaders = [
                "Name", "Category", "Unit", "Current Balance", "Unit Cost", "Total Value",
                "Status", "Min Limit", "Total Purchased", "Total Consumed",
                "Period Restock Volume", "Period Restock Cost", "Is Low Stock", "Is Out of Stock",
                "Last Restock Date", "Last Restock Amount"
            ]

            const csvRows = reportData.map(item => [
                item.name,
                item.category,
                item.unit,
                item.currentBalance,
                item.unitCost,
                item.totalValue,
                item.status,
                item.minLimit,
                item.totalPurchased,
                item.totalConsumed,
                item.periodRestockVolume,
                item.periodRestockCost,
                item.isLowStock ? 'Yes' : 'No',
                item.isOutOfStock ? 'Yes' : 'No',
                item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : 'Never',
                item.lastRestockAmount
            ])

            const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.map(cell =>
                    typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
                ).join(','))
            ].join('\n')

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="stock-report-${period}-${now.toISOString().split('T')[0]}.csv"`
                }
            })
        }

        return NextResponse.json(response)
    } catch (error: any) {
        console.error("❌ Stock report error:", error)
        return NextResponse.json({ message: error.message || "Failed to generate stock report" }, { status: 500 })
    }
}