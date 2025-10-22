import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { report, userAddress, userFid, username } = await req.json()

    // Validate required fields
    if (!report || !report.trim()) {
      return NextResponse.json(
        { error: 'Bug report is required' },
        { status: 400 }
      )
    }

    // Get Slack webhook URL from environment
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL is not configured')
      return NextResponse.json(
        { error: 'Bug report system is not configured' },
        { status: 500 }
      )
    }

    // Format user info
    const userInfo = []
    if (username) {
      userInfo.push(`*Username:* @${username}`)
    }
    if (userFid) {
      userInfo.push(`*FID:* ${userFid}`)
    }
    if (userAddress) {
      userInfo.push(`*Wallet:* \`${userAddress}\``)
    }

    const userInfoText = userInfo.length > 0 ? userInfo.join('\n') : '*User:* Anonymous'

    // Create Slack message payload
    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🐛 PotFi Bug Report',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: userInfoText
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Bug Report:*\n${report}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📱 App: *PotFi* | Submitted at: <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|${new Date().toISOString()}>`
            }
          ]
        }
      ]
    }

    // Send to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    })

    if (!slackResponse.ok) {
      console.error('Failed to send to Slack:', slackResponse.statusText)
      return NextResponse.json(
        { error: 'Failed to send bug report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Bug report submitted successfully' 
    })
  } catch (error) {
    console.error('Error processing bug report:', error)
    return NextResponse.json(
      { error: 'Failed to process bug report' },
      { status: 500 }
    )
  }
}

