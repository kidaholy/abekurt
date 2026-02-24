import express from "express"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/database"
import { setupSocketHandlers } from "./socket-handler"

import authRoutes from "./routes/auth"
import ordersRoutes from "./routes/orders"
import menuRoutes from "./routes/menu"
import usersRoutes from "./routes/users"

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" },
})

// Middleware
app.use(cors())
app.use(express.json())

// Connect Database
connectDB()

// Setup Socket handlers
setupSocketHandlers(io)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/orders", ordersRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/orders", ordersRoutes)
app.use("/api/menu", menuRoutes)
app.use("/api/users", usersRoutes)

// Export io for use in routes
export { io }

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Socket.io listening for connections`)
})
