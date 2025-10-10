import { NextRequest, NextResponse } from 'next/server'
import { getAppDomain } from '@/lib/utils'

/**
 * Create JackPot Frame
 * 
 * This frame allows creators to set up a new JackPot directly within Farcaster.
 * Users input amount and number of winners, then create the pot.
 * 
 * Frame Flow:
 * 1. User sees create frame with input field
 * 2. User enters "amount, winners" (e.g., "50, 15")
 * 3. User clicks "Create JackPot"
 * 4. System creates pot and shows success frame
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const castId = searchParams.get('castId')

  // Frame for creating JackPot with input field (dual name/property for compatibility)
  const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="fc:frame" content="vNext" />
    <meta name="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=create&castId=${castId}" />
    <meta name="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=create&castId=${castId}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:input:text" content="Amount, Winners (e.g., 50, 15)" />
    <meta name="fc:frame:input:text" content="Amount, Winners (e.g., 50, 15)" />
    <meta property="fc:frame:button:1" content="Create JackPot" />
    <meta name="fc:frame:button:1" content="Create JackPot" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta name="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:button:2" content="Cancel" />
    <meta name="fc:frame:button:2" content="Cancel" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta name="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:post_url" content="${getAppDomain()}/api/frame/create" />
    <meta name="fc:frame:post_url" content="${getAppDomain()}/api/frame/create" />
    <title>Create JackPot</title>
  </head>
  <body>
    <h1>Create JackPot</h1>
    <p>Set up your JackPot for this post!</p>
  </body>
</html>`

  return new NextResponse(frameHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * Process Create JackPot Request
 * 
 * Handles the form submission from the create frame.
 * Parses the input, validates it, and creates the JackPot.
 * 
 * Input Format: "amount, winners" (e.g., "50, 15")
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const input = formData.get('input') as string
  const castId = formData.get('castId') as string

  // Parse input: "amount, winners" format
  const [amountStr, winnersStr] = input.split(',').map(s => s.trim())
  const amount = amountStr
  const winners = winnersStr

  // Validate inputs
  if (!amount || !winners || !castId) {
    return new NextResponse('Missing required fields', { status: 400 })
  }

  // Create JackPot via smart contract
  // TODO: Integrate with actual smart contract
  const potId = await createJackPot(amount, winners, castId)

  // Return success frame
  const successFrame = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="fc:frame" content="vNext" />
    <meta name="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=success&potId=${potId}" />
    <meta name="fc:frame:image" content="${getAppDomain()}/api/frame/image?action=success&potId=${potId}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="Share JackPot" />
    <meta name="fc:frame:button:1" content="Share JackPot" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta name="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:post_url" content="${getAppDomain()}/api/frame/success" />
    <meta name="fc:frame:post_url" content="${getAppDomain()}/api/frame/success" />
    <title>JackPot Created</title>
  </head>
  <body>
    <h1>JackPot Created!</h1>
    <p>Your JackPot is ready. Share this post to let others claim!</p>
  </body>
</html>`

  return new NextResponse(successFrame, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * Create JackPot Smart Contract Integration
 * 
 * TODO: Integrate with actual smart contract
 * This function should:
 * 1. Validate input parameters
 * 2. Call createPot function on contract
 * 3. Return the pot ID
 * 4. Handle errors appropriately
 */
async function createJackPot(amount: string, winners: string, castId: string) {
  // TODO: Integrate with actual smart contract
  // For now, return a mock pot ID
  return `0x${Math.random().toString(16).substr(2, 64)}`
}
