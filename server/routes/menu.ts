import express, { type Request, type Response } from "express"
import { authenticate, authorize } from "../middleware/auth"
import MenuItem from "../models/MenuItem"

const router = express.Router()

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const items = await MenuItem.find()
    res.json(items)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu items" })
  }
})

router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    const item = new MenuItem(req.body)
    await item.save()
    res.status(201).json(item)
  } catch (error) {
    res.status(500).json({ message: "Failed to create menu item" })
  }
})

router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(item)
  } catch (error) {
    res.status(500).json({ message: "Failed to update menu item" })
  }
})

router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id)
    res.json({ message: "Menu item deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete menu item" })
  }
})

export default router
