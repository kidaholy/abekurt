import jwt from "jsonwebtoken"
import User from "@/lib/models/user"
import { connectDB } from "@/lib/db"

export interface TokenPayload {
    id: string
    email?: string
    role: string
    floorId?: string
    [key: string]: any
}

function getSecret() {
    return process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, getSecret(), {
        expiresIn: "7d",
    })
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, getSecret()) as TokenPayload
}

/**
 * Validates the session token AND checks if the user is still active in the database.
 * Throws an error if invalid or inactive.
 * Uses a lightweight in-memory cache to reduce DB load for frequent polling.
 */
const sessionCache = new Map<string, { isActive: boolean; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export async function validateSession(request: Request): Promise<TokenPayload> {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token || token.trim() === "" || token === "undefined" || token === "null") {
        throw new Error("Unauthorized: No valid session token provided")
    }

    try {
        const decoded = verifyToken(token)

        // Check Cache
        const cached = sessionCache.get(decoded.id)
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            if (!cached.isActive) {
                throw new Error("Unauthorized: Account deactivated. Please contact administrator.")
            }
            return decoded
        }

        await connectDB()

        // Final source of truth: Database check
        const user = await User.findById(decoded.id).select("isActive name email").lean()

        console.log(`🔐 validateSession - DB CHECK - User ID: ${decoded.id}, Found: ${!!user}, isActive: ${user?.isActive}`)

        if (!user) {
            throw new Error("Unauthorized: User no longer exists")
        }

        // Update Cache
        sessionCache.set(decoded.id, {
            isActive: user.isActive !== false,
            timestamp: Date.now()
        })

        if (user.isActive === false) {
            console.log(`🚫 validateSession - DENIED for ${user.email} (Inactive)`)
            throw new Error("Unauthorized: Account deactivated. Please contact administrator.")
        }

        return decoded
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Unauthorized: Session expired")
        }
        throw error
    }
}
