'use client'

import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import { detectBaseAppEnvironment } from '@/lib/environment'
import MobileLayout from './components/MobileLayout'

interface TemplateProps {
  children: React.ReactNode
}

export default function Template({ children }: TemplateProps) {
  const pathname = usePathname()
  const [isBaseApp, setIsBaseApp] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wallet connections
  const { isConnected: wagmiConnected } = useAccount()
  const { isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    // Detect if running in Base mini app
    const env = detectBaseAppEnvironment()
    setIsBaseApp(env.isBaseApp)
  }, [])

  const isConnected = isBaseApp ? miniKitConnected : wagmiConnected

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
