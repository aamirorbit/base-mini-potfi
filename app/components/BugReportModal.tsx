'use client'

import { useState } from 'react'
import { X, Bug, Send, MessageCircle, ExternalLink, Loader2 } from 'lucide-react'

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
  userAddress?: string
  userFid?: number
  username?: string
}

export default function BugReportModal({ 
  isOpen, 
  onClose, 
  userAddress,
  userFid,
  username 
}: BugReportModalProps) {
  const [bugReport, setBugReport] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!bugReport.trim()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report: bugReport,
          userAddress,
          userFid,
          username,
        }),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setBugReport('')
        setTimeout(() => {
          onClose()
          setSubmitStatus('idle')
        }, 2000)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Failed to submit bug report:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 max-w-md w-full max-h-[80vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
              <Bug className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Report a Bug</h3>
              <p className="text-xs text-gray-600 font-medium">Help us improve!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Telegram Support Link - Top */}
        <div className="mb-4">
          <a
            href="https://t.me/+_fXXrjRRqu41Yzdk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-800/90 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Or Chat with Team on Telegram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Encouraging Message */}
        <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 rounded-md p-4 mb-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            <span className="font-bold">Spotted something sus? 👀</span>
            <br />
            Drop us the deets! Every bug you report helps us level up PotFi. 
            Your feedback = our glow-up ✨
          </p>
        </div>

        {/* Bug Report Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What's broken? Tell us everything! 🔍
          </label>
          <textarea
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            placeholder="Example: When I tried to claim a pot, the transaction got stuck and nothing happened... Also the button kept spinning forever 😅"
            className="w-full px-4 py-3 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-lg"
            rows={5}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Include what you were doing, what went wrong, and what you expected to happen
          </p>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md shadow-lg mb-4">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <p className="text-sm font-medium">Report sent! Thanks for helping us improve 🎉</p>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md shadow-lg mb-4">
            <div className="flex items-center space-x-2">
              <Bug className="w-4 h-4" />
              <p className="text-sm font-medium">Oops! Failed to send. Try again or hit us up on Telegram</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !bugReport.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

