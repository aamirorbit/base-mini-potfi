'use client'

import { AlertTriangle, ExternalLink } from 'lucide-react'

interface BaseMiniAppWarningProps {
  appUrl?: string
}

export function BaseMiniAppWarning({ appUrl }: BaseMiniAppWarningProps) {
  const defaultAppUrl = 'https://wallet.coinbase.com/miniapps/potfi'
  const finalUrl = appUrl || defaultAppUrl

  const handleOpenInBaseMiniApp = () => {
    // Try to open in Base Mini App
    if (typeof window !== 'undefined') {
      window.open(finalUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 max-w-md w-full">
        {/* Icon */}
        <div className="w-16 h-16 bg-yellow-500 rounded-md flex items-center justify-center mb-4 mx-auto shadow-lg">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
          Coming Soon on Farcaster
        </h2>

        {/* Message */}
        <p className="text-sm font-medium text-gray-600 text-center mb-6">
          PotFi is currently only available in the <span className="font-bold text-gray-900">Base Mini App</span>. 
          We're working on bringing full Farcaster support soon! For now, please open PotFi in the Base Mini App for the complete experience.
        </p>

        {/* Features list */}
        <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 rounded-md p-4 mb-6 space-y-2">
          <p className="text-xs font-bold text-blue-700 mb-2">Available in Base Mini App:</p>
          <ul className="space-y-1.5 text-xs font-medium text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Instant wallet connection</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Create and claim prize pots</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>USDC rewards without gas fees</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Seamless transaction signing</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleOpenInBaseMiniApp}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 mb-3"
        >
          <div className="flex items-center justify-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Open in Base Mini App</span>
          </div>
        </button>

        {/* Additional info */}
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-gray-500">
            Don't have the Base Mini App?
          </p>
          <p className="text-xs font-medium text-blue-600">
            Get it from the Coinbase Wallet app
          </p>
        </div>
      </div>
    </div>
  )
}

