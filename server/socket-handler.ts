import type { Server as SocketIOServer } from "socket.io"
import type { Socket } from "socket.io"
import { verifyToken } from "../lib/auth"

export function setupSocketHandlers(io: SocketIOServer) {
  // Middleware for socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error("Authentication error"))
    }

    try {
      const decoded = verifyToken(token)
      socket.data.userId = decoded.id
      socket.data.role = decoded.role
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id} (${socket.data.role})`)

    // Join room based on role
    socket.join(`role:${socket.data.role}`)
    socket.join(`user:${socket.data.userId}`)

    // Order events
    socket.on("new-order", (order) => {
      console.log("New order received:", order.orderNumber)
      // Broadcast to all chefs
      io.to("role:chef").emit("order-update", order)
      // Notify admin
      io.to("role:admin").emit("notification", {
        type: "info",
        message: `New order: ${order.orderNumber}`,
      })
    })

    socket.on("order-status-change", (orderId, newStatus) => {
      console.log(`Order ${orderId} status changed to ${newStatus}`)
      // Broadcast status change
      io.emit("order-status-updated", { orderId, status: newStatus })
      // Notify cashier if order is ready
      if (newStatus === "ready") {
        io.to("role:cashier").emit("notification", {
          type: "success",
          message: `Order is ready for pickup!`,
        })
      }
    })

    socket.on("kitchen-notification", (message) => {
      io.to("role:cashier").emit("notification", {
        type: "info",
        message: message,
      })
    })

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`)
    })
  })
}
