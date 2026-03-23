import MenuItem from "./models/menu-item"
import Stock from "./models/stock"

/**
 * Calculates the total stock consumption for a list of order items.
 * Handles both Recipe system and Legacy stockItemId/reportQuantity system.
 */
export async function calculateStockConsumption(items: any[]) {
    const stockConsumptionMap = new Map<string, number>()
    const menuItemIds = items.map(i => i.menuItemId)
    const linkedMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).populate('stockItemId')

    for (const orderItem of items) {
        const menuData = linkedMenuItems.find(m => m._id.toString() === orderItem.menuItemId)
        if (!menuData) continue

        // 1. Check Recipe System (Priority)
        if (menuData.recipe && menuData.recipe.length > 0) {
            for (const ingredient of menuData.recipe) {
                if (ingredient.stockItemId) {
                    const stockId = ingredient.stockItemId.toString()
                    const consumptionAmount = (ingredient.quantityRequired || 0) * orderItem.quantity
                    stockConsumptionMap.set(stockId, (stockConsumptionMap.get(stockId) || 0) + consumptionAmount)
                }
            }
        }
        // 2. Fallback to Legacy System
        else if (menuData.stockItemId && menuData.reportQuantity > 0) {
            const stockId = (menuData.stockItemId as any)._id.toString()
            const consumptionAmount = menuData.reportQuantity * orderItem.quantity
            stockConsumptionMap.set(stockId, (stockConsumptionMap.get(stockId) || 0) + consumptionAmount)
        }
    }

    return stockConsumptionMap
}

/**
 * Adjusts stock levels based on a consumption map and a direction.
 * direction: -1 to DEDUCT stock (order creation)
 * direction: 1 to RESTORE stock (order cancellation)
 */
export async function applyStockAdjustment(consumptionMap: Map<string, number>, direction: -1 | 1) {
    if (consumptionMap.size === 0) return []

    const stockIds = Array.from(consumptionMap.keys())
    const stockItems = await Stock.find({ _id: { $in: stockIds } })

    const bulkOps = []
    const results = []

    for (const stockItem of stockItems) {
        if (!stockItem.trackQuantity) continue

        const stockId = stockItem._id.toString()
        const amount = consumptionMap.get(stockId) || 0
        const change = amount * direction

        const oldQuantity = stockItem.quantity || 0
        const newQuantity = Math.max(0, oldQuantity + change)

        const totalConsumedChange = direction === -1 ? amount : -amount
        const newTotalConsumed = Math.max(0, (stockItem.totalConsumed || 0) + totalConsumedChange)

        let newStatus = stockItem.status
        if (newQuantity > 0 && (stockItem.status === 'finished' || stockItem.status === 'out_of_stock')) {
            newStatus = 'active'
        } else if (newQuantity === 0 && stockItem.status !== 'out_of_stock' && stockItem.status !== 'finished') {
            newStatus = 'out_of_stock'
        }

        bulkOps.push({
            updateOne: {
                filter: { _id: stockItem._id },
                update: {
                    $set: {
                        quantity: newQuantity,
                        totalConsumed: newTotalConsumed,
                        status: newStatus
                    }
                }
            }
        })

        results.push({
            name: stockItem.name,
            oldQuantity,
            newQuantity,
            change: direction === -1 ? -amount : amount
        })
    }

    if (bulkOps.length > 0) {
        await Stock.bulkWrite(bulkOps)
    }

    return results
}
