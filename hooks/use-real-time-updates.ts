"use client"

import { useEffect, useRef } from 'react'

interface UseRealTimeUpdatesOptions {
  onUpdate: () => void
  interval?: number
  enabled?: boolean
}

export function useRealTimeUpdates({ 
  onUpdate, 
  interval = 1000, 
  enabled = true 
}: UseRealTimeUpdatesOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    onUpdate()

    // Set up polling interval
    intervalRef.current = setInterval(onUpdate, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [onUpdate, interval, enabled])

  // Add visibility change listener for immediate refresh when tab becomes active
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onUpdate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [onUpdate, enabled])

  // Add focus listener for immediate refresh when window gets focus
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      onUpdate()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [onUpdate, enabled])

  // Add localStorage listener for cross-page updates
  useEffect(() => {
    if (!enabled) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated' || e.key === 'menuUpdated' || e.key === 'userUpdated') {
        onUpdate()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [onUpdate, enabled])

  // Add keyboard shortcut for manual refresh (F5 or Ctrl+R)
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault()
        onUpdate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onUpdate, enabled])

  // Return function to trigger manual update
  return {
    triggerUpdate: onUpdate,
    setUpdateFlag: (flag: string) => {
      localStorage.setItem(flag, Date.now().toString())
    }
  }
}

// Utility function to trigger updates across all pages
export function triggerGlobalUpdate(updateType: 'orderUpdated' | 'newOrderCreated' | 'menuUpdated' | 'userUpdated') {
  localStorage.setItem(updateType, Date.now().toString())
}

// Utility function for optimistic updates
export function useOptimisticUpdate<T>(
  data: T[],
  setData: (data: T[]) => void,
  updateFn: (items: T[]) => T[],
  revertFn: () => void
) {
  return async (apiCall: () => Promise<boolean>) => {
    // Apply optimistic update
    const newData = updateFn(data)
    setData(newData)

    try {
      const success = await apiCall()
      if (!success) {
        // Revert on failure
        revertFn()
      }
    } catch (error) {
      // Revert on error
      revertFn()
    }
  }
}