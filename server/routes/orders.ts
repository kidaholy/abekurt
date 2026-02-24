import express, { type Request, type Response } from "express"
import { authenticate, authorize } from "../middleware/auth"
import Order from "../../lib/models/order"

const router = express.Router()

const generateOrderNumber = () => {
  return "ORD-" + Date.now()
}

router.post("/", authenticate, authorize("cashier"), async (req: Request, res: Response) => {
  try {
    const { items, totalAmount, paymentMethod, tableNumber, notes } = req.body

    const order = new Order({
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod,
      tableNumber,
      notes,
      cashierId: req.userId,
      status: "pending",
      paymentStatus: "paid",
    })

    await order.save()
    res.status(201).json(order)
  } catch (error) {
    res.status(500).json({ message: "Failed to create order" })
  }
})

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const query: any = {}
    if (req.role === "chef") {
      query.status = { $ne: "completed" }
    }
    const orders = await Order.find(query).sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" })
  }
})

router.put("/:id/status", authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status" })
  }
})

export default router
