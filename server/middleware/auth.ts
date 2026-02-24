import { verifyToken } from "../../lib/auth"
import type { Request, Response, NextFunction } from "express"

declare global {
  namespace Express {
    interface Request {
      userId?: string
      role?: string
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = verifyToken(token)
    req.userId = decoded.id
    req.role = decoded.role
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid token" })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ message: "Forbidden" })
    }
    next()
  }
}
