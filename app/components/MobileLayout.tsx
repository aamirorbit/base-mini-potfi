'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Home as HomeIcon, Plus, Eye, MessageCircle, Wallet } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useState, useEffect } from 'react'

interface MobileLayoutProps {
  children: React.ReactNode
  showBottomNav?: boolean
}

export default function MobileLayout({ children, showBottomNav = true }: MobileLayoutProps) {
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()
  
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    // Detect if running in Farcaster
    if (typeof window !== 'undefined') {
      setIsFarcaster(window.parent !== window)
    }
  }, [])

  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected
  const userAddress = isFarcaster ? miniKitAddress : wagmiAddress

  // Truncate address for display
  const truncatedAddress = userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''

  return (
    <main className="min-h-screen bg-card flex flex-col">
      {/* Top Header with Wallet Info */}
      {mounted && isConnected && (
        <div className="gradient-hero shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Wallet Address */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-white font-mono">{truncatedAddress}</span>
              </div>
              
              {/* Support Button */}
              <a
                href="https://t.me/+_fXXrjRRqu41Yzdk"
                target="_blank"
                rel="noopener noreferrer"
                className="relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] btn-uppercase overflow-hidden inline-block"
                style={{
                  background: 'linear-gradient(180deg, #D4AF37 0%, #F4D03F 10%, #FFF8DC 50%, #F4D03F 90%, #C9A535 100%)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.3)',
                  border: '1px solid #B8941F',
                  color: '#4A3700',
                  textShadow: '0 1px 1px rgba(255, 255, 255, 0.4)'
                }}
              >
                <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.3) 48%, rgba(255, 255, 255, 0.3) 52%, transparent 100%)' }}></div>
                <div className="relative flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>Support</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 pt-6 pb-20">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>

      {/* Bottom Navigation Menu */}
      {showBottomNav && isConnected && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl">
          <div className="max-w-md mx-auto px-2 py-2 safe-area-inset-bottom">
            <div className="flex items-center justify-around">
              {/* Home */}
              <Link
                href="/"
                className={`flex flex-col items-center py-2 px-3 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/' ? 'text-primary' : 'text-gray-600 hover:text-primary'
                }`}
              >
                <HomeIcon className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">Home</span>
              </Link>

              {/* Create */}
              <Link
                href="/create"
                className={`flex flex-col items-center py-2 px-3 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/create' ? 'text-primary' : 'text-gray-600 hover:text-primary'
                }`}
              >
                <div className={`p-2 rounded-md shadow-lg mb-1 ${
                  pathname === '/create' 
                    ? 'bg-primary-dark' 
                    : 'gradient-hero'
                }`}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold">Create</span>
              </Link>

              {/* View */}
              <Link
                href="/view"
                className={`flex flex-col items-center py-2 px-3 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/view' ? 'text-primary' : 'text-gray-600 hover:text-primary'
                }`}
              >
                <Eye className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">View</span>
              </Link>

              {/* Profile */}
              <Link
                href="/profile"
                className={`flex flex-col items-center py-2 px-3 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/profile' ? 'text-primary' : 'text-gray-600 hover:text-primary'
                }`}
              >
                <Wallet className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">Profile</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
