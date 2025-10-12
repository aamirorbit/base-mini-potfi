'use client'

import Link from 'next/link'
import { 
  Coins, 
  Zap, 
  Shield, 
  Users, 
  Trophy, 
  ArrowRight,
  Sparkles,
  Clock,
  DollarSign,
  Share2,
  ExternalLink,
  CheckCircle,
  Plus,
  Link2,
  Target,
  Wallet,
  TrendingUp
} from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const [copied, setCopied] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://potfi.basecitizens.com'

  const handleCopyLink = async () => {
    const linkUrl = 'https://potfi.basecitizens.com'
    try {
      await navigator.clipboard.writeText(linkUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.log('Copy failed')
    }
  }

  const handleShare = async () => {
    const shareText = '🎯 Check out PotFi - Create prize pots and reward your community with instant USDC claims & jackpot chances!'
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PotFi - Decentralized Prize Pots',
          text: shareText,
          url: appUrl
        })
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${appUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-12">
          {/* Farcaster Badge */}
          {/* <div className="flex justify-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-5 py-2.5 rounded-md shadow-sm">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm">Available on Farcaster</span>
            </div>
          </div> */}

          {/* Hero Content */}
          <div className="text-center mb-16">
            {/* App Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-blue-500/20">
              <Coins className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Reward Your Community<br />
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                With Prize Pots
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
              Create decentralized prize pots on Base. Instant USDC claims with exciting jackpot chances. 
              Boost engagement and reward your community like never before.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a
                href="https://warpcast.com/~/composer?text=Create%20prize%20pots%20and%20reward%20your%20community%20with%20PotFi!%20%F0%9F%8E%AF&embeds[]=https://potfi.basecitizens.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                <Share2 className="w-5 h-5" />
                <span>Open on Farcaster</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 shadow-lg border border-gray-200 hover:border-gray-300"
              >
                <Link2 className="w-5 h-5" />
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Stats at bottom of hero */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
              <div className="flex items-center space-x-2 text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Built on Base</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Instant Claims</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Jackpot Rewards</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Why Choose PotFi?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
            The most engaging way to reward your community with real USDC prizes
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Claims</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              No waiting. Users claim USDC prizes instantly with just one click. Fast, seamless, and secure on Base blockchain.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Jackpot Excitement</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Every claim has a chance to win the entire pot! Configure jackpot probabilities to maximize engagement.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Fair</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Smart contracts ensure transparent, tamper-proof distribution. Built on Base for security and low fees.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Timers</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Set custom claim timeouts to create urgency and keep your community engaged with time-sensitive rewards.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">USDC Powered</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Distribute real value with USDC stablecoin. No volatility, just pure rewards your community can use immediately.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-shadow duration-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Community First</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Built for creators, communities, and projects. Boost engagement and show appreciation with meaningful rewards.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-32">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
              Three simple steps to start rewarding your community
            </p>
          </div>

          <div className="relative">
            {/* Connection Line - Desktop Only */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 mx-auto" style={{ width: '60%', left: '20%' }}></div>
            
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">1</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Create a Pot</h3>
                    <p className="text-gray-600 leading-relaxed text-base">
                      Set your prize amount, number of claims, timeout duration, and jackpot probability in seconds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                        <Share2 className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">2</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Share the Link</h3>
                    <p className="text-gray-600 leading-relaxed text-base">
                      Post your pot on Farcaster or share the link with your community to start claiming.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">3</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Watch Engagement Soar</h3>
                    <p className="text-gray-600 leading-relaxed text-base">
                      Your community claims prizes instantly. Track claims in real-time and celebrate jackpot winners!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Farcaster Integration Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-lg p-12 sm:p-16 shadow-2xl text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-xl border border-white/20 px-5 py-2.5 rounded-full mb-8">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm ">Available on Farcaster</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Seamlessly Integrated with Farcaster
            </h2>
            <p className="text-xl text-blue-50 mb-12 leading-relaxed font-light max-w-2xl mx-auto">
              Create and claim prize pots directly in Farcaster. Native Mini App experience with MiniKit wallet integration for instant USDC transactions.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg flex-shrink-0">
                    <Link2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-px h-12 bg-white/30"></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1.5 text-white">One-Click Claims</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">No complex setup. Just connect and claim.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-px h-12 bg-white/30"></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1.5 text-white">Instant Rewards</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">USDC delivered to your wallet immediately.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-px h-12 bg-white/30"></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1.5 text-white">Cast Actions</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">Create pots directly from any cast.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-px h-12 bg-white/30"></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1.5 text-white">Jackpot Rewards</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">Win big with every claim attempt.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <a
                href="https://warpcast.com/~/add-cast-action?actionType=post&name=Create%20Prize%20Pot&icon=gift&postUrl=https%3A%2F%2Fpotfi.basecitizens.com%2Fapi%2Fframe%2Fcreate"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2.5 bg-white hover:bg-gray-50 text-blue-700 font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Cast Action</span>
              </a>
              <a
                href="https://warpcast.com/~/composer?text=Create%20prize%20pots%20on%20Base!%20%F0%9F%8E%AF&embeds[]=https://potfi.basecitizens.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 border border-white/20"
              >
                <Share2 className="w-5 h-5" />
                <span>Open on Farcaster</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 sm:py-32">
        <div className="bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-xl rounded-lg p-12 sm:p-16 shadow-xl border border-gray-100 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Ready to Reward Your Community?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto font-light leading-relaxed">
            Start creating prize pots today and watch your community engagement skyrocket.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://warpcast.com/~/composer?text=Create%20prize%20pots%20on%20Base!%20%F0%9F%8E%AF&embeds[]=https://potfi.basecitizens.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
            >
              <Share2 className="w-5 h-5" />
              <span>Open on Farcaster</span>
            </a>
            <button
              onClick={handleShare}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-8 rounded-xl text-base transition-all duration-200 shadow-lg border border-gray-200 hover:border-gray-300"
            >
              <Link2 className="w-5 h-5" />
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PotFi</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Built on Base • Powered by USDC • Made for Communities
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

