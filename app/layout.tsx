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
  title: 'PotFi - Decentralized Prize Pots',
  description: 'Create and claim prize pots on Base. Instant claims with jackpot chances!',
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
    // Farcaster Frame v2 tags (proper format, not JSON)
    'fc:frame': 'vNext',
    'fc:frame:image': `${appDomain}/og.png`,
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': '✨ Create Pot',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': `${appDomain}/create`,
    'fc:frame:button:2': '👀 View Pots',
    'fc:frame:button:2:action': 'link',
    'fc:frame:button:2:target': `${appDomain}/view`,
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
