import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// POST process order with real-time stock validation and deduction
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)

        await connectDB()

        const body = await request.json()
        const { orderItems, tableNumber, customerName, paymentMethod } = body

        console.log(`🍽️ Processing order for table ${tableNumber} with ${orderItems.length} items`)

        // Step 1: Validate all menu items and check stock availability
        const validationResults: any[] = []
        const menuItemsData: any[] = []

        for (const orderItem of orderItems) {
            const menuItem = await MenuItem.findOne({ menuId: orderItem.menuId }).populate('recipe.stockItemId')

            if (!menuItem) {
                return NextResponse.json({
                    message: `Menu item ${orderItem.menuId} not found`,
                    type: "validation_error"
                }, { status: 400 })
            }

            // Check if menu item can be prepared with current stock
            const availability = await menuItem.canBePrepared(orderItem.quantity)

            if (!availability.available) {
                return NextResponse.json({
                    message: `Cannot prepare ${menuItem.name}`,
                    details: availability.missingIngredients,
                    type: "stock_unavailable",
                    unavailableItem: {
                        menuId: orderItem.menuId,
                        name: menuItem.name,
                        missingIngredients: availability.missingIngredients
                    }
                }, { status: 409 }) // 409 Conflict for stock issues
            }

            menuItemsData.push({
                orderItem,
                menuItem,
                availability
            })

            validationResults.push({
                menuId: orderItem.menuId,
                name: menuItem.name,
                quantity: orderItem.quantity,
                available: true
            })
        }

        console.log(`✅ All ${orderItems.length} items validated and available`)

        // Step 2: Generate order number
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
        const orderCount = await Order.countDocuments({
            createdAt: {
                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
        })
        const orderNumber = `ORD-${dateStr}-${String(orderCount + 1).padStart(3, '0')}`

        // Step 3: Create order object
        const orderData = {
            orderNumber,
            items: orderItems.map((item: any, index: number) => ({
                menuItemId: menuItemsData[index].menuItem._id.toString(),
                menuId: item.menuId,
                name: menuItemsData[index].menuItem.name,
                quantity: item.quantity,
                price: menuItemsData[index].menuItem.price,
                status: "pending",
                modifiers: item.modifiers || [],
                notes: item.notes || ""
            })),
            totalAmount: orderItems.reduce((sum: number, item: any, index: number) =>
                sum + (menuItemsData[index].menuItem.price * item.quantity), 0
            ),
            status: "pending",
            paymentMethod: paymentMethod || "cash",
            customerName: customerName || "",
            tableNumber: tableNumber.toString(),
            createdBy: decoded.id
        }

        // Step 4: Create the order first
        const newOrder = new Order(orderData)
        await newOrder.save()

        console.log(`📝 Order ${orderNumber} created successfully`)

        // Step 5: Consume stock for each menu item
        const stockConsumptionLog: any[] = []

        for (const { orderItem, menuItem } of menuItemsData) {
            const consumptionResult = await menuItem.consumeIngredients(orderItem.quantity)

            if (!consumptionResult.success) {
                // If stock consumption fails, we need to rollback the order
                await Order.findByIdAndDelete(newOrder._id)

                console.error(`❌ Stock consumption failed for ${menuItem.name}:`, consumptionResult.errors)

                return NextResponse.json({
                    message: `Stock consumption failed for ${menuItem.name}`,
                    details: consumptionResult.errors,
                    type: "stock_consumption_error"
                }, { status: 500 })
            }

            stockConsumptionLog.push({
                menuItem: menuItem.name,
                quantity: orderItem.quantity,
                ingredientsConsumed: menuItem.recipe.map((ingredient: any) => ({
                    name: ingredient.stockItemName,
                    consumed: ingredient.quantityRequired * orderItem.quantity,
                    unit: ingredient.unit
                }))
            })
        }

        console.log(`🔄 Stock consumed successfully for order ${orderNumber}:`, stockConsumptionLog)

        // Step 6: Return success response with order details and stock consumption log
        const response = {
            success: true,
            order: {
                ...newOrder.toObject(),
                _id: newOrder._id.toString()
            },
            stockConsumption: stockConsumptionLog,
            validation: validationResults,
            message: `Order ${orderNumber} processed successfully. Stock has been deducted.`
        }

        return NextResponse.json(response, { status: 201 })

    } catch (error: any) {
        console.error("❌ Process order error:", error)
        return NextResponse.json({
            message: error.message || "Failed to process order",
            type: "server_error"
        }, { status: 500 })
    }
}

// GET check menu item availability (for real-time validation)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const menuIds = searchParams.get("menuIds")?.split(",") || []
        const quantities = searchParams.get("quantities")?.split(",").map(Number) || []

        await validateSession(request)

        await connectDB()

        const availabilityCheck: any[] = []

        for (let i = 0; i < menuIds.length; i++) {
            const menuId = menuIds[i]
            const quantity = quantities[i] || 1

            const menuItem = await MenuItem.findOne({ menuId })
            if (!menuItem) {
                availabilityCheck.push({
                    menuId,
                    available: false,
                    reason: "Menu item not found"
                })
                continue
            }

            const availability = await menuItem.canBePrepared(quantity)
            availabilityCheck.push({
                menuId,
                name: menuItem.name,
                available: availability.available,
                missingIngredients: availability.missingIngredients,
                requestedQuantity: quantity
            })
        }

        return NextResponse.json({
            availabilityCheck,
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Check availability error:", error)
        return NextResponse.json({
            message: error.message || "Failed to check availability"
        }, { status: 500 })
    }
}