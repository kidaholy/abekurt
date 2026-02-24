import express, { type Request, type Response } from "express"
import { authenticate, authorize } from "../middleware/auth"
import User from "../models/User"

const router = express.Router()

router.get("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password")
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" })
  }
})

router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: "Failed to update user" })
  }
})

router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: "User deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" })
  }
})

export default router
