'use client'

import Link from 'next/link'
import { useAccount, useDisconnect } from 'wagmi'
import { Home as HomeIcon, Plus, Eye, Wifi, LogOut } from 'lucide-react'
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
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { address: miniKitAddress, isConnected: miniKitConnected, disconnect: miniKitDisconnect } = useMiniKitWallet()
  
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
  const disconnect = isFarcaster ? miniKitDisconnect : wagmiDisconnect

  // Truncate address for display
  const truncatedAddress = userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Top Header with Wallet Info */}
      {mounted && isConnected && (
        <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Wallet Address */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{truncatedAddress}</span>
              </div>
              
              {/* Disconnect Button */}
              <button
                onClick={() => disconnect()}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-2xl">
          <div className="max-w-md mx-auto px-4 py-2 safe-area-inset-bottom">
            <div className="flex items-center justify-around">
              {/* Home */}
              <Link
                href="/"
                className={`flex flex-col items-center py-3 px-4 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <HomeIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Home</span>
              </Link>

              {/* Create Pot */}
              <Link
                href="/create"
                className={`flex flex-col items-center py-3 px-4 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/create' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <div className={`p-3 rounded-md shadow-lg mb-1 ${
                  pathname === '/create' 
                    ? 'bg-gradient-to-r from-blue-700 to-blue-800' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700'
                }`}>
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">Create Pot</span>
              </Link>

              {/* View Pots */}
              <Link
                href="/view"
                className={`flex flex-col items-center py-3 px-4 rounded-md transition-all duration-200 transform active:scale-95 ${
                  pathname === '/view' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Eye className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">View Pots</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
