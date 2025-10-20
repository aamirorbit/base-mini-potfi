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

  // Load user profile when wallet connects
  useEffect(() => {
    if (mounted && isConnected && userAddress) {
      loadUserProfile()
    }
  }, [mounted, isConnected, userAddress])

  // Update profile when context profile becomes available
  useEffect(() => {
    if (contextUserProfile?.username && !fetchedUserProfile) {
      console.log('✅ [MobileLayout] Context profile became available:', contextUserProfile)
      setFetchedUserProfile({
        fid: contextUserProfile.fid || 0,
        username: contextUserProfile.username,
        display_name: contextUserProfile.displayName || contextUserProfile.username,
        pfp_url: contextUserProfile.avatarUrl || ''
      })
    }
  }, [contextUserProfile])

  async function loadUserProfile() {
    console.log('🔍 [MobileLayout] Loading user profile...', {
      userAddress,
      contextUserProfile
    })
    
    if (!userAddress) {
      console.warn('⚠️ [MobileLayout] No user address available')
      return
    }
    
    // If we have profile from context, use it
    if (contextUserProfile?.username) {
      console.log('✅ [MobileLayout] Using profile from context:', contextUserProfile)
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
      console.log('📡 [MobileLayout] Fetching profile from API for address:', userAddress)
      const response = await fetch(`/api/user/profile?address=${userAddress}`)
      const data = await response.json()
      
      console.log('📥 [MobileLayout] API response:', data)
      
      if (response.ok && data.user) {
        console.log('✅ [MobileLayout] Profile loaded from API:', data.user)
        setFetchedUserProfile(data.user)
      } else {
        console.warn('⚠️ [MobileLayout] No profile found in API response')
      }
    } catch (error) {
      console.error('❌ [MobileLayout] Failed to load user profile:', error)
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
            <div className="flex items-center justify-between gap-3">
              {/* User Profile + Beta Badge */}
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {/* Avatar */}
                {fetchedUserProfile?.pfp_url ? (
                  <img 
                    src={fetchedUserProfile.pfp_url} 
                    alt={fetchedUserProfile.username}
                    className="w-8 h-8 rounded-md object-cover border border-white/20 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center border border-white/20 flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* Name/Address + Beta Badge */}
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-sm font-semibold text-white truncate">
                    {displayName}
                  </span>
                  
                  {/* Beta Badge - Clickable */}
                  <button
                    onClick={() => setShowBetaModal(true)}
                    className="relative px-2 py-1 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                      border: '1px solid rgba(255, 215, 0, 0.6)'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: 'skewX(-20deg)' }}></div>
                    <span className="relative text-xs font-extrabold text-gray-900 tracking-wide" style={{ textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)' }}>BETA</span>
                  </button>
                </div>
              </div>
              
              {/* Support Button */}
              <a
                href="https://t.me/+_fXXrjRRqu41Yzdk"
                target="_blank"
                rel="noopener noreferrer"
                className="relative px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] btn-uppercase overflow-hidden flex-shrink-0"
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
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.85) 100%)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowBetaModal(false)}
        >
          <div 
            className="relative max-w-sm w-full animate-in zoom-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Background Card */}
            <div className="relative bg-white/95 backdrop-blur-2xl rounded-xl shadow-2xl overflow-hidden border border-white/20">
              {/* Decorative gradient header */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700"></div>
              
              {/* Header with gradient background */}
              <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 p-5 border-b border-gray-200/50">
                <button
                  onClick={() => setShowBetaModal(false)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-white/80 rounded-lg transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-600 group-hover:text-gray-900 group-hover:rotate-90 transition-all duration-200" />
                </button>
                
                <div className="flex items-start space-x-3 pr-8">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Beta Version</h3>
                    <p className="text-sm text-gray-600 font-medium">Early Access Release</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Beta Notice */}
                <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200/50 rounded-xl p-4 shadow-sm">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">🚧</span>
                      <p className="text-sm font-bold text-yellow-900">Work in Progress</p>
                    </div>
                    <p className="text-sm text-yellow-800 leading-relaxed">
                      PotFi is in active development. While we strive for stability, expect some rough edges.
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5">
                  <p className="text-sm font-bold text-gray-900">What to expect:</p>
                  <div className="space-y-2">
                    {[
                      { icon: '⚡', text: 'Experimental features' },
                      { icon: '🐛', text: 'Occasional bugs' },
                      { icon: '✨', text: 'Frequent updates' },
                      { icon: '🚀', text: 'Rapid improvements' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 transition-all duration-200 hover:bg-white/80 hover:scale-[1.02]">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support CTA */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-blue-100" />
                      <p className="text-sm font-bold text-white">Need Help?</p>
                    </div>
                    <p className="text-sm text-blue-100 mb-3 leading-relaxed">
                      Report bugs or get support from our team
                    </p>
                    <a
                      href="https://t.me/+_fXXrjRRqu41Yzdk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full bg-white hover:bg-blue-50 text-blue-600 font-bold py-3 px-4 rounded-lg text-sm transition-all duration-200 shadow-md transform active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Join Telegram</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => setShowBetaModal(false)}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg transform active:scale-[0.98]"
                >
                  Got it, thanks! 👍
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
