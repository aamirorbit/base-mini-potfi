'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Home as HomeIcon, Plus, Eye, MessageCircle, Wallet, X, AlertCircle, ExternalLink, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useMiniAppContext } from '@/app/components/MiniAppProvider'
import { useState, useEffect } from 'react'

interface NeynarUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
}

interface MobileLayoutProps {
  children: React.ReactNode
  showBottomNav?: boolean
}

export default function MobileLayout({ children, showBottomNav = true }: MobileLayoutProps) {
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [fetchedUserProfile, setFetchedUserProfile] = useState<NeynarUser | null>(null)

  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()
  const { userProfile: contextUserProfile } = useMiniAppContext()
  
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

  // Load user profile
  useEffect(() => {
    if (mounted && isConnected && userAddress && isFarcaster) {
      loadUserProfile()
    }
  }, [mounted, isConnected, userAddress, isFarcaster])

  async function loadUserProfile() {
    if (!userAddress) return
    
    // If we have profile from context, use it
    if (contextUserProfile?.username) {
      setFetchedUserProfile({
        fid: contextUserProfile.fid || 0,
        username: contextUserProfile.username,
        display_name: contextUserProfile.displayName || contextUserProfile.username,
        pfp_url: contextUserProfile.avatarUrl || ''
      })
      return
    }
    
    // Otherwise, fetch from API
    try {
      const response = await fetch(`/api/user/profile?address=${userAddress}`)
      const data = await response.json()
      
      if (response.ok && data.user) {
        setFetchedUserProfile(data.user)
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  // Display name: username if available, otherwise truncated address
  const displayName = fetchedUserProfile?.username 
    ? `@${fetchedUserProfile.username}` 
    : userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''

  return (
    <main className="min-h-screen bg-card flex flex-col">
      {/* Top Header with User Info */}
      {mounted && isConnected && (
        <div className="gradient-hero shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Beta Badge + User Info */}
              <div className="flex items-center space-x-3">
                {/* Beta Badge - Clickable */}
                <button
                  onClick={() => setShowBetaModal(true)}
                  className="bg-yellow-500/20 border border-yellow-400/50 px-2 py-0.5 rounded-md transition-all duration-200 hover:bg-yellow-500/30 hover:scale-105 active:scale-95"
                >
                  <span className="text-xs font-bold text-yellow-300">BETA</span>
                </button>
                
                {/* User Profile */}
                <div className="flex items-center space-x-2">
                  {/* Avatar */}
                  {fetchedUserProfile?.pfp_url ? (
                    <img 
                      src={fetchedUserProfile.pfp_url} 
                      alt={fetchedUserProfile.username}
                      className="w-7 h-7 rounded-md object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center border border-white/20">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {/* Name/Address */}
                  <span className="text-sm font-semibold text-white">
                    {displayName}
                  </span>
                </div>
              </div>
              
              {/* Support Button */}
              <a
                href="https://t.me/+_fXXrjRRqu41Yzdk"
                target="_blank"
                rel="noopener noreferrer"
                className="relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] btn-uppercase overflow-hidden inline-block"
                style={{
                  background: 'linear-gradient(180deg, #B8941F 0%, #D4AF37 20%, #D4AF37 80%, #A67C00 100%)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.4)',
                  border: '1px solid #8B7310',
                  color: '#2A1F00',
                  textShadow: '0 1px 1px rgba(255, 215, 0, 0.3)'
                }}
              >
                <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-2xl">
          <div className="max-w-md mx-auto px-2 py-2 safe-area-inset-bottom">
            <div className="flex items-center justify-around">
              {/* Home */}
              <Link
                href="/"
                className="flex flex-col items-center py-2 px-4 rounded-md transition-all duration-200 transform active:scale-95"
              >
                <div className={`p-3 rounded-md mb-1 transition-all duration-200 ${
                  pathname === '/' 
                    ? 'gradient-hero scale-105 shadow-lg' 
                    : 'bg-transparent'
                }`}>
                  <HomeIcon className={`w-6 h-6 transition-colors duration-200 ${
                    pathname === '/' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs font-semibold transition-colors duration-200 ${
                  pathname === '/' ? 'text-primary' : 'text-gray-600'
                }`}>Home</span>
              </Link>

              {/* Create */}
              <Link
                href="/create"
                className="flex flex-col items-center py-2 px-4 rounded-md transition-all duration-200 transform active:scale-95"
              >
                <div className={`p-3 rounded-md mb-1 transition-all duration-200 ${
                  pathname === '/create' 
                    ? 'gradient-hero scale-105 shadow-lg' 
                    : 'bg-transparent'
                }`}>
                  <Plus className={`w-6 h-6 transition-colors duration-200 ${
                    pathname === '/create' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs font-semibold transition-colors duration-200 ${
                  pathname === '/create' ? 'text-primary' : 'text-gray-600'
                }`}>Create</span>
              </Link>

              {/* View */}
              <Link
                href="/view"
                className="flex flex-col items-center py-2 px-4 rounded-md transition-all duration-200 transform active:scale-95"
              >
                <div className={`p-3 rounded-md mb-1 transition-all duration-200 ${
                  pathname === '/view' 
                    ? 'gradient-hero scale-105 shadow-lg' 
                    : 'bg-transparent'
                }`}>
                  <Eye className={`w-6 h-6 transition-colors duration-200 ${
                    pathname === '/view' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs font-semibold transition-colors duration-200 ${
                  pathname === '/view' ? 'text-primary' : 'text-gray-600'
                }`}>View</span>
              </Link>

              {/* Profile */}
              <Link
                href="/profile"
                className="flex flex-col items-center py-2 px-4 rounded-md transition-all duration-200 transform active:scale-95"
              >
                <div className={`p-3 rounded-md mb-1 transition-all duration-200 ${
                  pathname === '/profile' 
                    ? 'gradient-hero scale-105 shadow-lg' 
                    : 'bg-transparent'
                }`}>
                  <Wallet className={`w-6 h-6 transition-colors duration-200 ${
                    pathname === '/profile' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs font-semibold transition-colors duration-200 ${
                  pathname === '/profile' ? 'text-primary' : 'text-gray-600'
                }`}>Profile</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Beta Information Modal */}
      {showBetaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl rounded-md max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-md flex items-center justify-center border border-yellow-400/50">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Beta Version</h3>
              </div>
              <button
                onClick={() => setShowBetaModal(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  🚧 This is a Beta Release
                </p>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  PotFi is currently in beta testing. While we've worked hard to make it stable, you may encounter bugs or unexpected behavior.
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">What to expect:</p>
                <ul className="space-y-1.5 ml-4">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Some features may be experimental</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Occasional bugs or performance issues</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>UI/UX improvements in progress</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Regular updates and fixes</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  🐛 Found a Bug?
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  Help us improve by reporting any issues you encounter. Your feedback is valuable!
                </p>
                <a
                  href="https://t.me/+_fXXrjRRqu41Yzdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-md text-sm transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join Telegram Support</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowBetaModal(false)}
                className="w-full bg-gray-800/90 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-md text-sm transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
