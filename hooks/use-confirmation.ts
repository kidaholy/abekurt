"use client"

import { useState, useCallback } from 'react'

interface ConfirmationOptions {
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  icon?: React.ReactNode
}

interface NotificationOptions {
  title: string
  message: string
  type?: 'success' | 'error' | 'info'
  autoClose?: boolean
  duration?: number
}

export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean
    options: ConfirmationOptions
    onConfirm: () => void
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {}
  })

  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean
    options: NotificationOptions
  }>({
    isOpen: false,
    options: { title: '', message: '' }
  })

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        options,
        onConfirm: () => {
          resolve(true)
          setConfirmationState(prev => ({ ...prev, isOpen: false }))
        }
      })
    })
  }, [])

  const notify = useCallback((options: NotificationOptions) => {
    setNotificationState({
      isOpen: true,
      options
    })
  }, [])

  const closeConfirmation = useCallback(() => {
    setConfirmationState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const closeNotification = useCallback(() => {
    setNotificationState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    // Confirmation
    confirmationState,
    confirm,
    closeConfirmation,
    
    // Notification
    notificationState,
    notify,
    closeNotification
  }
}