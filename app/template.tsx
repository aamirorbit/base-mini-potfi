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
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wallet connections
  const { isConnected: wagmiConnected } = useAccount()
  const { isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    // Detect if running in Farcaster
    if (typeof window !== 'undefined') {
      setIsFarcaster(window.parent !== window)
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

  if (!isFarcaster) {
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
