'use client'

import { X, AlertCircle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message,
  confirmText = "Continue",
  cancelText = "Cancel",
  confirmButtonClass
}: ConfirmModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-md max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-blue-100">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleConfirm}
            className={confirmButtonClass || "w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm"}
          >
            {confirmText}
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-800/90 hover:bg-gray-900 text-white font-medium py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}

