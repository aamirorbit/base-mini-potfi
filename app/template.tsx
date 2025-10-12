'use client'

import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import MobileLayout from './components/MobileLayout'

interface TemplateProps {
  children: React.ReactNode
}

export default function Template({ children }: TemplateProps) {
  const pathname = usePathname()
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wallet connections
  const { isConnected: wagmiConnected } = useAccount()
  const { isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    // Detect if running in any mini app context (Farcaster or Base app)
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || ''
      const isInIframe = window.parent !== window
      const isFarcasterUA = userAgent.includes('Farcaster')
      const isBaseApp = userAgent.includes('Base') || userAgent.includes('Coinbase')
      
      // Use MiniKit wallet for any mini app context
      const inMiniApp = isInIframe || isFarcasterUA || isBaseApp
      setIsFarcaster(inMiniApp)
      
      console.log('Mini App Detection:', {
        isInIframe,
        isFarcasterUA,
        isBaseApp,
        inMiniApp,
        userAgent: userAgent.substring(0, 100)
      })
    }
  }, [])

  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected

  // Pages that should not show bottom navigation
  const noNavPages = ['/frame', '/api']
  const shouldShowBottomNav = mounted && isConnected && !noNavPages.some(page => pathname.startsWith(page))

  // API routes and frame routes should not be wrapped
  if (pathname.startsWith('/api') || pathname.startsWith('/frame')) {
    return <>{children}</>
  }

  // Always show the app interface
  return (
    <MobileLayout showBottomNav={shouldShowBottomNav}>
      <div className="mb-10">
      {children}
      </div>
    </MobileLayout>
  )
}
