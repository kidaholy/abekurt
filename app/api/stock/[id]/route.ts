import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// GET single stock item with full history
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const { id } = await params
        const stockItem = await Stock.findById(id).populate('restockHistory.restockedBy', 'name email').lean()

        if (!stockItem) {
            return NextResponse.json({ message: "Stock item not found" }, { status: 404 })
        }

        const serializedStock = {
            ...stockItem,
            _id: stockItem._id.toString(),
            totalValue: (stockItem.quantity || 0) * (stockItem.unitCost || 0),
            isLowStock: stockItem.trackQuantity && (stockItem.quantity || 0) <= (stockItem.minLimit || 0),
            isLowStoreStock: stockItem.trackQuantity && (stockItem.storeQuantity || 0) <= (stockItem.storeMinLimit || 0),
            isOutOfStock: stockItem.trackQuantity && (stockItem.quantity || 0) <= 0,
            availableForOrder: stockItem.trackQuantity ? (stockItem.status === 'active' && (stockItem.quantity || 0) > 0) : true,

            restockHistory: stockItem.restockHistory?.map((entry: any) => ({
                ...entry,
                _id: entry._id?.toString(),
                restockedBy: entry.restockedBy ? {
                    ...entry.restockedBy,
                    _id: entry.restockedBy._id?.toString()
                } : null
            })) || []
        }

        return NextResponse.json(serializedStock)
    } catch (error: any) {
        console.error("❌ Get stock item error:", error)
        return NextResponse.json({ message: error.message || "Failed to get stock item" }, { status: 500 })
    }
}

// PUT update stock item or restock
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { id } = await params

        const stockItem = await Stock.findById(id)
        if (!stockItem) {
            return NextResponse.json({ message: "Stock item not found" }, { status: 404 })
        }

        // Check if this is a restock operation
        if (body.action === 'restock' && body.quantityAdded && body.totalPurchaseCost) {
            console.log(`🔄 Restocking ${stockItem.name}: +${body.quantityAdded} ${stockItem.unit} for total cost ${body.totalPurchaseCost} Br / selling at ${body.newUnitCost || stockItem.unitCost} per unit`)

            // Calculate purchase cost per unit
            const purchaseCostPerUnit = Number(body.totalPurchaseCost) / Number(body.quantityAdded)

            stockItem.addToStore(
                Number(body.quantityAdded),
                Number(body.totalPurchaseCost),
                Number(body.newUnitCost || stockItem.unitCost),
                purchaseCostPerUnit,
                body.notes || `Restocked via admin panel`,
                decoded.id
            )

            await stockItem.save()

            // Create Store Log for better tracking
            const StoreLog = (await import("@/lib/models/store-log")).default
            await StoreLog.create({
                stockId: stockItem._id,
                type: 'PURCHASE',
                quantity: Number(body.quantityAdded),
                unit: stockItem.unit,
                pricePerUnit: Number(body.totalPurchaseCost) / Number(body.quantityAdded),
                totalPrice: Number(body.totalPurchaseCost),
                user: decoded.id,
                notes: body.notes || "Manual restock (Store)"
            })

            const serializedStock = {
                ...stockItem.toObject(),
                _id: stockItem._id.toString(),
                totalValue: stockItem.quantity * stockItem.averagePurchasePrice,
                sellingValue: stockItem.quantity * stockItem.unitCost,
                profitMargin: stockItem.unitCost > 0 ? ((stockItem.unitCost - stockItem.averagePurchasePrice) / stockItem.unitCost * 100).toFixed(1) : 0,
                isLowStock: stockItem.trackQuantity && stockItem.quantity <= stockItem.minLimit,
                isLowStoreStock: stockItem.trackQuantity && stockItem.storeQuantity <= stockItem.storeMinLimit,
                isOutOfStock: stockItem.trackQuantity && stockItem.quantity <= 0,
                availableForOrder: stockItem.trackQuantity ? (stockItem.status === 'active' && stockItem.quantity > 0) : true
            }

            return NextResponse.json({
                ...serializedStock,
                message: `Successfully restocked ${body.quantityAdded} ${stockItem.unit}. New total: ${stockItem.quantity} ${stockItem.unit}. Investment: ${body.totalPurchaseCost.toLocaleString()} Br`
            })
        }

        // Regular update operation
        const allowedUpdates = ['name', 'category', 'unit', 'unitType', 'minLimit', 'storeMinLimit', 'trackQuantity', 'showStatus', 'status', 'storeQuantity', 'totalInvestment']
        const updateData: any = {}



        for (const key of allowedUpdates) {
            if (body[key] !== undefined) {

                    updateData[key] = body[key]
            }
        }

        // Handle totalPurchaseCost mapping to totalInvestment if provided
        if (body.totalPurchaseCost !== undefined) {
            updateData.totalInvestment = Number(body.totalPurchaseCost)
            updateData.averagePurchasePrice = Number(body.totalPurchaseCost)
        }

        // Handle direct quantity/price updates (for admin corrections)
        if (body.quantity !== undefined) {
            updateData.quantity = Math.max(0, Number(body.quantity))
        }
        if (body.averagePurchasePrice !== undefined) {
            updateData.averagePurchasePrice = Math.max(0, Number(body.averagePurchasePrice))
        }
        if (body.unitCost !== undefined) {
            updateData.unitCost = Math.max(0, Number(body.unitCost))
        }

        // Auto-update unitType if unit changes
        if (body.unit !== undefined) {
            const unit = body.unit.toLowerCase()
            if (['kg', 'g', 'gram', 'kilogram'].includes(unit)) {
                updateData.unitType = 'weight'
            } else if (['l', 'ml', 'liter', 'litre', 'milliliter'].includes(unit)) {
                updateData.unitType = 'volume'
            } else {
                updateData.unitType = 'count'
            }
        }

        Object.assign(stockItem, updateData)



        await stockItem.save()
        


        const serializedStock = {
            ...stockItem.toObject(),
            _id: stockItem._id.toString(),
            totalValue: stockItem.quantity * stockItem.averagePurchasePrice,
            sellingValue: stockItem.quantity * stockItem.unitCost,
            profitMargin: stockItem.unitCost > 0 ? ((stockItem.unitCost - stockItem.averagePurchasePrice) / stockItem.unitCost * 100).toFixed(1) : 0,
            isLowStock: stockItem.trackQuantity && stockItem.quantity <= stockItem.minLimit,
            isLowStoreStock: stockItem.trackQuantity && stockItem.storeQuantity <= stockItem.storeMinLimit,
            isOutOfStock: stockItem.trackQuantity && stockItem.quantity <= 0,
            availableForOrder: stockItem.trackQuantity ? (stockItem.status === 'active' && stockItem.quantity > 0) : true
        }

        return NextResponse.json(serializedStock)
    } catch (error: any) {
        console.error("❌ Update stock error:", error)
        return NextResponse.json({ message: error.message || "Failed to update stock item" }, { status: 500 })
    }
}

// DELETE stock item
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const { id } = await params
        const { searchParams } = new URL(request.url)
        const source = searchParams.get("source") // 'stock' or 'store'
        
        const stockItem = await Stock.findById(id)

        if (!stockItem) {
            return NextResponse.json({ message: "Stock item not found" }, { status: 404 })
        }

        // If deleting from Store page - only clear store quantity
        if (source === 'store') {
            const hasActiveStock = (stockItem.quantity || 0) > 0
            
            // Always keep the record, just clear store quantity
            stockItem.storeQuantity = 0
            await stockItem.save()
            
            if (hasActiveStock) {
                return NextResponse.json({
                    message: "Item removed from Store. Active stock in POS remains.",
                    keepInPOS: true
                })
            } else {
                return NextResponse.json({
                    message: "Item removed from Store. Record kept for history.",
                    keepRecord: true
                })
            }
        }

        // If deleting from Stock/POS page - only clear active quantity
        const hasStoreQuantity = (stockItem.storeQuantity || 0) > 0
        
        // Always keep the record, just clear active stock
        stockItem.quantity = 0
        stockItem.status = 'out_of_stock'
        await stockItem.save()
        
        if (hasStoreQuantity) {
            return NextResponse.json({
                message: "Stock removed from POS, but kept in Store because it has remaining quantity.",
                keepInStore: true
            })
        } else {
            return NextResponse.json({
                message: "Stock removed from POS. Record kept for history.",
                keepRecord: true
            })
        }
    } catch (error: any) {
        console.error("❌ Delete stock error:", error)
        return NextResponse.json({ message: error.message || "Failed to delete stock item" }, { status: 500 })
    }
}