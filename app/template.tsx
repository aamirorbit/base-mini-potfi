'use client'

import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import MobileLayout from './components/MobileLayout'
import LandingPage from './components/LandingPage'

interface TemplateProps {
  children: React.ReactNode
}

export default function Template({ children }: TemplateProps) {
  const pathname = usePathname()
  const [isMiniApp, setIsMiniApp] = useState(false)
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
      
      // Check if we're in any mini app environment
      const inMiniApp = isInIframe || isFarcasterUA || isBaseApp
      
      setIsMiniApp(inMiniApp)
      setIsFarcaster(inMiniApp) // Use MiniKit wallet for any mini app context
      
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

  // Show landing page only if NOT in any mini app context
  if (!isMiniApp) {
    return <LandingPage />
  }

  return (
    <MobileLayout showBottomNav={shouldShowBottomNav}>
      <div className="mb-10">
      {children}
      </div>
    </MobileLayout>
  )
}
