"use client"

import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket"

interface UseSocketOptions {
  events: string[]
  onEvent?: (event: string, data: any) => void
}

export function useSocket({ events, onEvent }: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    const handleConnect = () => {
      console.log("Socket connected")
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log("Socket disconnected")
      setIsConnected(false)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    // Listen to specific events
    events.forEach((event) => {
      socket.on(event, (data: any) => {
        if (onEvent) {
          onEvent(event, data)
        }
      })
    })

    if (socket.connected) {
      setIsConnected(true)
    }

    return () => {
      events.forEach((event) => {
        socket.off(event)
      })
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
    }
  }, [events, onEvent])

  return { isConnected }
}

export function useSocketEmit() {
  return (event: string, data: any) => {
    const socket = getSocket()
    socket.emit(event, data)
  }
}
