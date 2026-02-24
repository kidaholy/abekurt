"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from "lucide-react"

interface ConfirmationCardProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  icon?: React.ReactNode
}

export function ConfirmationCard({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon
}: ConfirmationCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          cardBg: 'bg-red-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white',
          defaultIcon: <Trash2 className="w-6 h-6" />
        }
      case 'warning':
        return {
          cardBg: 'bg-amber-50',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          confirmBg: 'bg-amber-600 hover:bg-amber-700',
          confirmText: 'text-white',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        }
      case 'success':
        return {
          cardBg: 'bg-green-50',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmBg: 'bg-green-600 hover:green-700',
          confirmText: 'text-white',
          defaultIcon: <CheckCircle className="w-6 h-6" />
        }
      case 'info':
      default:
        return {
          cardBg: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white',
          defaultIcon: <Info className="w-6 h-6" />
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-[40px] p-8 custom-shadow max-w-md w-full transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center ${styles.iconColor}`}>
            {icon || styles.defaultIcon}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 bubbly-text">
            {title}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 ${styles.confirmBg} ${styles.confirmText} font-bold py-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 custom-shadow`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Success notification card for showing results
interface NotificationCardProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'info'
  autoClose?: boolean
  duration?: number
}

export function NotificationCard({
  isOpen,
  onClose,
  title,
  message,
  type = 'success',
  autoClose = true,
  duration = 4000
}: NotificationCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      if (autoClose) {
        const timer = setTimeout(() => {
          onClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          icon: <X className="w-5 h-5" />
        }
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          icon: <Info className="w-5 h-5" />
        }
      case 'success':
      default:
        return {
          bg: 'bg-green-50 border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          icon: <CheckCircle className="w-5 h-5" />
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-[200] transform transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`bg-white rounded-[30px] p-6 custom-shadow max-w-sm border-2 ${styles.bg}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center ${styles.iconColor} flex-shrink-0`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold ${styles.textColor} mb-1`}>
              {title}
            </h3>
            <p className={`text-sm ${styles.textColor} opacity-80 whitespace-pre-line`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}