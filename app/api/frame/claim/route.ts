import { NextRequest, NextResponse } from 'next/server'
import { neynarClient } from '@/lib/neynar'
import { getAppDomain } from '@/lib/utils'

/**
 * Claim JackPot Frame
 * 
 * This frame allows users to claim their share of a JackPot.
 * Users must first engage with the post (Like + Comment + Recast).
 * 
 * Frame Flow:
 * 1. User sees claim frame with claim button
 * 2. User clicks "Claim JackPot"
 * 3. System verifies engagement requirements
 * 4. If valid, processes claim and shows success
 * 5. If invalid, shows requirements frame
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const potId = searchParams.get('potId')
  const castId = searchParams.get('castId')

  // Frame for claiming JackPot (dual name/property for compatibility)
  const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="fc:frame" content="vNext" />
    <meta name="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=claim&potId=${potId}&castId=${castId}" />
    <meta name="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=claim&potId=${potId}&castId=${castId}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="Claim JackPot" />
    <meta name="fc:frame:button:1" content="Claim JackPot" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta name="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:button:2" content="View Details" />
    <meta name="fc:frame:button:2" content="View Details" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta name="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:post_url" content="${getAppDomain()}/api/frame/claim" />
    <meta name="fc:frame:post_url" content="${getAppDomain()}/api/frame/claim" />
    <title>Claim JackPot</title>
  </head>
  <body>
    <h1>Claim JackPot</h1>
    <p>Engage with this post to claim your share!</p>
  </body>
</html>`

  return new NextResponse(frameHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * Process Claim JackPot Request
 * 
 * Handles the claim request from the claim frame.
 * Verifies engagement requirements and processes the claim.
 * 
 * Engagement Requirements:
 * - Like the post
 * - Comment on the post  
 * - Recast the post
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const buttonIndex = formData.get('buttonIndex') as string
  const potId = formData.get('potId') as string
  const castId = formData.get('castId') as string
  const fid = formData.get('fid') as string // Farcaster user ID

  if (buttonIndex === '1') {
    // Claim JackPot
    try {
      // Verify engagement requirements (Like + Comment + Recast)
      const engagement = await neynarClient.checkEngagement(Number(fid), castId as string)
      
      if (!engagement.liked || !engagement.recasted || !engagement.replied) {
        // Show engagement requirements
        const requirementsFrame = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=requirements" />
              <meta property="fc:frame:button:1" content="Try Again" />
              <meta property="fc:frame:post_url" content="${getAppDomain()}/api/frame/claim" />
              <title>Engagement Required</title>
            </head>
            <body>
              <h1>Engagement Required</h1>
              <p>Please Like, Comment, and Recast this post to claim!</p>
            </body>
          </html>
        `
        return new NextResponse(requirementsFrame, {
          headers: { 'Content-Type': 'text/html' },
        })
      }

      // Process claim
      const claimResult = await processClaim(potId as string, fid as string, castId as string)
      
      // Show success frame
      const successFrame = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=claimed&amount=${claimResult.amount}" />
            <meta property="fc:frame:button:1" content="Share Success" />
            <meta property="fc:frame:post_url" content="${getAppDomain()}/api/frame/success" />
            <title>Claimed Successfully</title>
          </head>
          <body>
            <h1>Claimed Successfully!</h1>
            <p>You received ${claimResult.amount} USDC!</p>
          </body>
        </html>
      `

      return new NextResponse(successFrame, {
        headers: { 'Content-Type': 'text/html' },
      })

    } catch (error) {
      console.error('Claim error:', error)
      return new NextResponse('Error processing claim', { status: 500 })
    }
  }

  return new NextResponse('Invalid action', { status: 400 })
}

/**
 * Process JackPot Claim
 * 
 * TODO: Integrate with actual smart contract
 * This function should:
 * 1. Generate permit signature
 * 2. Call claim function on contract
 * 3. Return claim amount and transaction hash
 * 4. Handle errors appropriately
 */
async function processClaim(potId: string, fid: string, castId: string) {
  // TODO: Integrate with actual smart contract
  // For now, return mock data
  return {
    amount: '5.25',
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
  }
}
