'use client'

import { X, AlertCircle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  onRetry?: () => void
  showHomeButton?: boolean
}

export function ErrorModal({ 
  isOpen, 
  onClose, 
  title = "Something went wrong",
  message,
  onRetry,
  showHomeButton = false
}: ErrorModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  // Parse user-friendly error messages
  const getFriendlyMessage = (error: string): string => {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('user rejected') || errorLower.includes('user denied')) {
      return "You cancelled the transaction. No worries, you can try again whenever you're ready!"
    }
    if (errorLower.includes('insufficient funds') || errorLower.includes('insufficient balance')) {
      return "You don't have enough funds in your wallet to complete this transaction. Please add more funds and try again."
    }
    if (errorLower.includes('gas') && errorLower.includes('required exceeds allowance')) {
      return "Not enough gas to process the transaction. Please add more ETH to your wallet for gas fees."
    }
    if (errorLower.includes('nonce too low')) {
      return "Transaction nonce issue. Please refresh the page and try again."
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return "Network connection issue. Please check your internet connection and try again."
    }
    if (errorLower.includes('timeout')) {
      return "Transaction took too long to process. Please try again."
    }
    if (errorLower.includes('already claimed') || errorLower.includes('already used')) {
      return "You've already claimed from this pot. Each wallet can only claim once."
    }
    if (errorLower.includes('not active') || errorLower.includes('inactive')) {
      return "This pot is no longer active. It may have been completed or expired."
    }
    if (errorLower.includes('engagement') || errorLower.includes('like') || errorLower.includes('recast') || errorLower.includes('comment')) {
      return "Please make sure you've liked, commented, and recasted the original post before claiming."
    }
    if (errorLower.includes('approval') || errorLower.includes('allowance')) {
      return "Token approval failed. Please try approving the tokens again."
    }
    
    // Return original message if no match
    return error
  }

  const friendlyMessage = getFriendlyMessage(message)
  const isUserRejection = message.toLowerCase().includes('user rejected') || message.toLowerCase().includes('user denied')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-md max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              isUserRejection ? 'bg-blue-100' : 'bg-yellow-100'
            }`}>
              <AlertCircle className={`w-5 h-5 ${
                isUserRejection ? 'text-blue-600' : 'text-yellow-600'
              }`} />
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
          <p className="text-sm text-gray-700 leading-relaxed">
            {friendlyMessage}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {onRetry && (
            <button
              onClick={() => {
                onClose()
                onRetry()
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
          
          {showHomeButton && (
            <button
              onClick={() => {
                onClose()
                router.push('/')
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-md text-sm transition-all flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`w-full font-medium py-2.5 px-4 rounded-md text-sm transition-all ${
              onRetry || showHomeButton 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
            }`}
          >
            {isUserRejection ? 'Got it' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

