import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { MiniAppProvider } from './components/MiniAppProvider'
import { getAppDomain } from '@/lib/utils'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

const appDomain = getAppDomain()

export const metadata: Metadata = {
  title: 'JackPot - Decentralized Lottery',
  description: 'A decentralized lottery system built on Base',
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: 'JackPot - Decentralized Lottery',
    description: 'A decentralized lottery system built on Base',
    images: ['/og.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: `${appDomain}/og.png`,
      button: {
        title: "🎰 Play JackPot",
        action: {
          type: "launch_miniapp",
          name: "JackPot",
          url: appDomain,
          splashImageUrl: `${appDomain}/icon.png`,
          splashBackgroundColor: "#667eea"
        }
      }
    }),
    // Backward compatibility
    'fc:frame': JSON.stringify({
      version: "1",
      imageUrl: `${appDomain}/og.png`,
      button: {
        title: "🎰 Play JackPot",
        action: {
          type: "launch_frame",
          name: "JackPot",
          url: appDomain,
          splashImageUrl: `${appDomain}/icon.png`,
          splashBackgroundColor: "#667eea"
        }
      }
    })
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <MiniAppProvider>
            {children}
          </MiniAppProvider>
        </Providers>
      </body>
    </html>
  )
}
