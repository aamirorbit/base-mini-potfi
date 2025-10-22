import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { MiniAppProvider } from './components/MiniAppProvider'
import { getAppDomain } from '@/lib/utils'
import React from 'react'

const appDomain = getAppDomain()

export const metadata: Metadata = {
  metadataBase: new URL(appDomain),
  title: 'PotFi - Decentralized Prize Pots',
  description: 'Create and claim prize pots on Base. Instant claims with jackpot chances!',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: 'PotFi - Decentralized Prize Pots',
    description: 'Create and claim prize pots on Base. Instant claims with jackpot chances!',
    images: ['/og.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PotFi - Decentralized Prize Pots',
    description: 'Create and claim prize pots on Base',
    images: [`${appDomain}/og.png`],
  },
  other: {
    // Farcaster Mini App embed metadata (proper format)
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: `${appDomain}/og.png`,
      button: {
        title: "Open PotFi",
        action: {
          type: "launch_frame",
          name: "PotFi",
          url: appDomain,
          splashImageUrl: `${appDomain}/icon.png`,
          splashBackgroundColor: "#f7f7f7"
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
      <body>
        <Providers>
          <MiniAppProvider>
            {children}
          </MiniAppProvider>
        </Providers>
      </body>
    </html>
  )
}
