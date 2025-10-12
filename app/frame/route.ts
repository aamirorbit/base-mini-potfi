import { NextRequest, NextResponse } from 'next/server'
import { getAppDomain } from '@/lib/utils'

/**
 * Main Farcaster Frame Entry Point
 * 
 * This frame serves as the main entry point for JackPot functionality.
 * Users can either create a new JackPot or claim an existing one.
 * 
 * Frame Flow:
 * 1. User sees main frame with two buttons
 * 2. "Create JackPot" → Redirects to create flow
 * 3. "Claim JackPot" → Redirects to claim flow
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'start'
  const potId = searchParams.get('potId')
  const castId = searchParams.get('castId')

  // Generate dynamic frame image based on action
  const appDomain = getAppDomain()
  const imageUrl = `${appDomain}/api/frame/image?action=${action}&potId=${potId}&castId=${castId}`
  
  // Mini App embed for main frame (2025 format)
  const miniAppEmbed = {
    version: "1",
    imageUrl: imageUrl,
    button: {
      title: "🎰 Play JackPot",
      action: {
        type: "launch_miniapp",
        url: `${appDomain}`,
        name: "JackPot",
        splashImageUrl: `${appDomain}/icon.png`,
        splashBackgroundColor: "#0000FF"
      }
    }
  }

  const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- 2025 Mini App embed format -->
    <meta name="fc:miniapp" content='${JSON.stringify(miniAppEmbed)}' />
    <!-- Backward compatibility -->
    <meta name="fc:frame" content='${JSON.stringify({...miniAppEmbed, button: {...miniAppEmbed.button, action: {...miniAppEmbed.button.action, type: "launch_frame"}}})}' />
    
    <!-- Open Graph metadata -->
    <meta property="og:title" content="🎰 JackPot - Social Tips with a Twist" />
    <meta property="og:description" content="Create or claim JackPots with randomized USDC rewards on Base!" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${appDomain}/frame" />
    <meta property="og:type" content="website" />
    
    <title>🎰 JackPot Frame</title>
  </head>
  <body>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; background: linear-gradient(135deg, #0000FF 0%, #0000aa 100%); color: white; text-align: center;">
      <h1 style="font-size: 3rem; margin-bottom: 1rem;">🎰 JackPot</h1>
      <p style="font-size: 1.2rem;">Social tips with a jackpot twist!</p>
    </div>
  </body>
</html>`

  return new NextResponse(frameHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * Handle Frame Button Interactions
 * 
 * Processes button clicks from the main frame and redirects to appropriate flows.
 * 
 * Button 1: Create JackPot → Redirects to create flow
 * Button 2: Claim JackPot → Redirects to claim flow
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const buttonIndex = formData.get('buttonIndex') as string
  const castId = formData.get('castId') as string
  const potId = formData.get('potId') as string

  // Handle frame interactions based on button pressed
  const appDomain = getAppDomain()
  
  if (buttonIndex === '1') {
    // Create JackPot flow - redirect to create frame
    return NextResponse.redirect(`${appDomain}/api/frame/create?castId=${castId}`)
  } else if (buttonIndex === '2') {
    // Claim JackPot flow - redirect to claim frame
    return NextResponse.redirect(`${appDomain}/api/frame/claim?potId=${potId}&castId=${castId}`)
  }

  return new NextResponse('Invalid action', { status: 400 })
}
