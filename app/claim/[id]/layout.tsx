import { Metadata } from 'next'
import { headers } from 'next/headers'

async function getPotDetails(potId: string) {
  try {
    // Get the base URL from headers
    const headersList = headers()
    const host = headersList.get('host') || 'potfi.basecitizens.com'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Fetch pot details from our API
    const response = await fetch(`${baseUrl}/api/pots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ potId }),
      cache: 'no-store' // Always get fresh data for social sharing
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.success ? data : null
  } catch (error) {
    console.error('Error fetching pot details for metadata:', error)
    return null
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: { id: string } 
}): Promise<Metadata> {
  const potId = params.id
  const potDetails = await getPotDetails(potId)
  
  // Get base URL for OG images
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://potfi.basecitizens.com'
  
  if (potDetails && potDetails.active) {
    const amount = potDetails.amount || 0
    const standardClaim = potDetails.standardClaim || 0.01
    const remaining = potDetails.remainingAmount || amount
    const jackpotProb = potDetails.jackpotProbability || 1
    
    return {
      title: `🎯 Claim ${amount} USDC Pot | PotFi`,
      description: `💰 Standard Claim: ${standardClaim} USDC | 🎲 Jackpot Chance: ${jackpotProb}% | 💎 ${remaining} USDC remaining! Click to claim your share!`,
      openGraph: {
        title: `🎯 Claim ${amount} USDC Prize Pot`,
        description: `💰 Get ${standardClaim} USDC instantly or hit the ${amount} USDC jackpot!\n\n🎲 Current Jackpot Chance: ${jackpotProb}%\n💎 ${remaining} USDC still available\n\nConnect your wallet and claim now!`,
        images: [
          {
            url: `${baseUrl}/api/frame/image?action=claim&potId=${potId}&amount=${amount}&standardClaim=${standardClaim}&remaining=${remaining}&jackpotProb=${jackpotProb}`,
            width: 1200,
            height: 630,
            alt: 'PotFi - Claim Prize Pot'
          }
        ],
        type: 'website',
        siteName: 'PotFi',
      },
      twitter: {
        card: 'summary_large_image',
        title: `🎯 Claim ${amount} USDC Pot`,
        description: `💰 ${standardClaim} USDC standard claim | 🎲 ${jackpotProb}% jackpot chance | 💎 ${remaining} USDC left!`,
        images: [`${baseUrl}/api/frame/image?action=claim&potId=${potId}&amount=${amount}`],
      },
      other: {
        // Farcaster Mini App embed metadata (proper format)
        'fc:miniapp': JSON.stringify({
          version: "1",
          imageUrl: `${baseUrl}/api/frame/image?action=claim&potId=${potId}&amount=${amount}&standardClaim=${standardClaim}&remaining=${remaining}&jackpotProb=${jackpotProb}`,
          button: {
            title: `Claim ${standardClaim} USDC`,
            action: {
              type: "launch_frame",
              name: "PotFi - Claim Pot",
              url: `${baseUrl}/claim/${potId}`,
              splashImageUrl: `${baseUrl}/icon.png`,
              splashBackgroundColor: "#f7f7f7"
            }
          }
        })
      }
    }
  } else if (potDetails && !potDetails.active) {
    // Pot is inactive
    return {
      title: `❌ Pot Inactive | PotFi`,
      description: `This pot has been closed. ${potDetails.claimedAmount || 0} USDC was claimed by ${potDetails.claimed || 0} people.`,
      openGraph: {
        title: `❌ Pot Closed`,
        description: `This pot is no longer active.\n\nTotal Claimed: ${potDetails.claimedAmount || 0} USDC\nClaims Made: ${potDetails.claimed || 0}`,
        images: [
          {
            url: `${baseUrl}/og.png`,
            width: 1200,
            height: 630,
            alt: 'PotFi - Pot Closed'
          }
        ],
        type: 'website',
        siteName: 'PotFi',
      },
      twitter: {
        card: 'summary_large_image',
        title: `❌ Pot Closed`,
        description: `This pot is no longer active. ${potDetails.claimed || 0} claims were made.`,
        images: [`${baseUrl}/og.png`],
      }
    }
  }
  
  // Fallback metadata if pot details can't be fetched
  return {
    title: `🎯 Claim Prize Pot | PotFi`,
    description: `Claim your share of this prize pot! Get USDC instantly or hit the jackpot!`,
    openGraph: {
      title: `🎯 Claim Prize Pot`,
      description: `Connect your wallet and claim your share! Each claim gives you a chance to win the jackpot!`,
      images: [
        {
          url: `${baseUrl}/og.png`,
          width: 1200,
          height: 630,
          alt: 'PotFi - Claim Prize Pot'
        }
      ],
      type: 'website',
      siteName: 'PotFi',
    },
    twitter: {
      card: 'summary_large_image',
      title: `🎯 Claim Prize Pot`,
      description: `Get USDC instantly or hit the jackpot! Connect your wallet to claim.`,
      images: [`${baseUrl}/og.png`],
    },
    other: {
      'fc:miniapp': JSON.stringify({
        version: "1",
        imageUrl: `${baseUrl}/og.png`,
        button: {
          title: "Claim Now",
          action: {
            type: "launch_frame",
            name: "PotFi - Claim Pot",
            url: `${baseUrl}/claim/${potId}`,
            splashImageUrl: `${baseUrl}/icon.png`,
            splashBackgroundColor: "#f7f7f7"
          }
        }
      })
    }
  }
}

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

