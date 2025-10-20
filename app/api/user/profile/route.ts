import { NextRequest, NextResponse } from 'next/server'
import { neynarClient } from '@/lib/neynar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const fid = searchParams.get('fid')
    
    if (!address && !fid) {
      return NextResponse.json(
        { error: 'Either address or fid parameter is required' },
        { status: 400 }
      )
    }

    let user = null

    // Try to get user by FID if provided
    if (fid) {
      try {
        user = await neynarClient.getUserByFid(parseInt(fid))
      } catch (error) {
        console.error('Failed to get user by FID:', error)
      }
    }

    // Fallback to address lookup
    if (!user && address) {
      user = await neynarClient.getUserByAddress(address)
    }

    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'No Farcaster profile found for this address'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      user: {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url
      }
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

