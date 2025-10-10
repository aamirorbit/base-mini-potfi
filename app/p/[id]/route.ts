import { NextRequest, NextResponse } from 'next/server'
import { getAppDomain } from '@/lib/utils'

/**
 * Pot-Specific Frame Route
 * 
 * This creates a frame for a specific JackPot that users can claim from.
 * The frame is embedded in Farcaster posts and allows direct claiming.
 * 
 * URL: /p/{potId}
 * Purpose: Show claimable JackPot frame for specific pot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const potId = params.id
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'claim'
  
  // Get cast ID from the request (if available)
  // Note: In frame context, castId will be provided by Farcaster in POST requests
  const castId = searchParams.get('castId') || 'auto-detect'
  
  const appDomain = getAppDomain()
  
  // Generate Mini App embed for this specific pot (2025 format)
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${appDomain}/api/frame/image?action=claim&potId=${potId}`,
    button: {
      title: "🎰 Claim JackPot",
      action: {
        type: "launch_miniapp",
        url: `${appDomain}/claim/${potId}?castId=${castId}`,
        name: "JackPot",
        splashImageUrl: `${appDomain}/icon.png`,
        splashBackgroundColor: "#667eea"
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
    <meta property="og:title" content="🎰 JackPot - Claim Your Share!" />
    <meta property="og:description" content="Engage with this post (Like + Comment + Recast) to claim your randomized share of the JackPot!" />
    <meta property="og:image" content="${appDomain}/api/frame/image?action=claim&potId=${potId}" />
    <meta property="og:url" content="${appDomain}/p/${potId}" />
    <meta property="og:type" content="website" />
    
    <title>🎰 JackPot - Claim Your Share!</title>
  </head>
  <body>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
      <h1 style="font-size: 3rem; margin-bottom: 1rem;">🎰 JackPot</h1>
      <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Engage with this post to claim your share!</p>
      <p style="font-size: 1rem; opacity: 0.8;">Pot ID: ${potId.slice(0, 8)}...</p>
      <p style="font-size: 0.9rem; margin-top: 2rem; opacity: 0.7;">Like ❤️ + Comment 💬 + Recast 🔄 to claim!</p>
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
 * Handle Frame Button Interactions for Specific Pot
 * 
 * Processes button clicks from the pot-specific frame.
 * Handles claiming and viewing details.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const potId = params.id
  const formData = await request.formData()
  const buttonIndex = formData.get('buttonIndex') as string
  const fid = formData.get('fid') as string // Farcaster user ID
  const castId = formData.get('castId') as string
  
  const appDomain = getAppDomain()

  if (buttonIndex === '1') {
    // Claim JackPot button clicked
    try {
      // TODO: Verify engagement requirements (Like + Comment + Recast)
      // For now, we'll simulate the check
      const hasEngaged = await checkEngagement(fid, castId)
      
      if (!hasEngaged) {
        // Show engagement requirements frame
        const requirementsFrame = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${appDomain}/api/frame/image?action=requirements&potId=${potId}" />
              <meta property="fc:frame:button:1" content="✅ I've Engaged - Try Again" />
              <meta property="fc:frame:button:2" content="❓ How to Engage" />
              <meta property="fc:frame:post_url" content="${appDomain}/p/${potId}" />
              <title>Engagement Required</title>
            </head>
            <body>
              <h1>Engagement Required</h1>
              <p>Please Like ❤️, Comment 💬, and Recast 🔄 this post to claim!</p>
            </body>
          </html>
        `
        return new NextResponse(requirementsFrame, {
          headers: { 'Content-Type': 'text/html' },
        })
      }

      // Process the claim
      const claimResult = await processClaim(potId, fid, castId)
      
      // Show success frame
      const successFrame = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${appDomain}/api/frame/image?action=claimed&amount=${claimResult.amount}&potId=${potId}" />
            <meta property="fc:frame:button:1" content="🎉 Share Success" />
            <meta property="fc:frame:button:2" content="🔗 View Transaction" />
            <meta property="fc:frame:post_url" content="${appDomain}/p/${potId}/success" />
            <title>Claimed Successfully!</title>
          </head>
          <body>
            <h1>🎉 Claimed Successfully!</h1>
            <p>You received ${claimResult.amount} USDC!</p>
            <p>Transaction: ${claimResult.transactionHash}</p>
          </body>
        </html>
      `

      return new NextResponse(successFrame, {
        headers: { 'Content-Type': 'text/html' },
      })

    } catch (error) {
      console.error('Claim error:', error)
      
      // Show error frame
      const errorFrame = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${appDomain}/api/frame/image?action=error&potId=${potId}" />
            <meta property="fc:frame:button:1" content="🔄 Try Again" />
            <meta property="fc:frame:button:2" content="❓ Get Help" />
            <meta property="fc:frame:post_url" content="${appDomain}/p/${potId}" />
            <title>Claim Error</title>
          </head>
          <body>
            <h1>❌ Claim Error</h1>
            <p>Something went wrong. Please try again!</p>
          </body>
        </html>
      `
      
      return new NextResponse(errorFrame, {
        headers: { 'Content-Type': 'text/html' },
      })
    }
  } else if (buttonIndex === '2') {
    // View Details button clicked
    const detailsFrame = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${appDomain}/api/frame/image?action=details&potId=${potId}" />
          <meta property="fc:frame:button:1" content="🎰 Back to Claim" />
          <meta property="fc:frame:button:2" content="🔗 View on Explorer" />
          <meta property="fc:frame:post_url" content="${appDomain}/p/${potId}" />
          <title>JackPot Details</title>
        </head>
        <body>
          <h1>📊 JackPot Details</h1>
          <p>Pot ID: ${potId}</p>
          <p>View details about this JackPot</p>
        </body>
      </html>
    `
    
    return new NextResponse(detailsFrame, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return new NextResponse('Invalid action', { status: 400 })
}

/**
 * Check if user has engaged with the post
 * TODO: Integrate with Neynar API to check actual engagement
 */
async function checkEngagement(fid: string, castId: string): Promise<boolean> {
  // TODO: Implement actual engagement checking
  // For now, return true to allow testing
  console.log(`Checking engagement for FID ${fid} on cast ${castId}`)
  return true // Temporary - should check Like + Comment + Recast
}

/**
 * Process the JackPot claim
 * TODO: Integrate with smart contract
 */
async function processClaim(potId: string, fid: string, castId: string) {
  // TODO: Integrate with actual smart contract claim function
  // This should:
  // 1. Generate permit signature
  // 2. Call smart contract claim function
  // 3. Return actual transaction hash and amount
  
  console.log(`Processing claim for pot ${potId}, user ${fid}, cast ${castId}`)
  
  // Mock response for now
  return {
    amount: (Math.random() * 10 + 1).toFixed(2), // Random amount between 1-11 USDC
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
  }
}
