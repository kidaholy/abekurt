let io: any
try {
  io = require("socket.io-client").default || require("socket.io-client")
} catch {
  // Fallback for environments where socket.io-client is not available
  io = null
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

let socket: any = null

export function getSocket() {
  if (!socket && io) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
