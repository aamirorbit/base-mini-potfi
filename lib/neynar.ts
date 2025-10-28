// Enhanced Neynar API client for Farcaster integration
// Following Base Mini Apps Guide best practices

export interface NeynarUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  follower_count: number
  following_count: number
  verified_addresses?: {
    eth_addresses: string[]
    sol_addresses: string[]
  }
}

export interface NeynarCast {
  hash: string
  text: string
  author: NeynarUser
  timestamp: string
  parent_hash?: string
  thread_hash?: string
  reactions?: {
    likes: { fid: number }[]
    recasts: { fid: number }[]
    likes_count?: number
    recasts_count?: number
  }
  replies?: {
    count: number
  }
}

export interface EngagementStatus {
  liked: boolean
  recasted: boolean
  replied: boolean
}

export class NeynarClient {
  private apiKey: string
  private baseUrl = 'https://api.neynar.com/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getUserByFid(fid: number): Promise<NeynarUser> {
    const response = await fetch(`${this.baseUrl}/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'api_key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }

    const data = await response.json()
    return data.users[0]
  }

  async getUserByAddress(address: string): Promise<NeynarUser | null> {
    try {
      // Normalize address to lowercase (Ethereum standard)
      const normalizedAddress = address.toLowerCase()
      
      const response = await fetch(`${this.baseUrl}/farcaster/user/bulk-by-address?addresses=${normalizedAddress}`, {
        headers: {
          'api_key': this.apiKey,
        },
      })

      console.log('Neynar getUserByAddress response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Neynar API error:', response.status, errorText)
        return null
      }

      const data = await response.json()
      console.log('Neynar getUserByAddress response:', JSON.stringify(data, null, 2))
      
      // Handle different possible response structures
      
      // Most common: object with address as key, containing array of users
      // Example: { "0xabcd...": [{ fid: 123, ... }] }
      if (typeof data === 'object' && !Array.isArray(data)) {
        const addresses = Object.keys(data)
        if (addresses.length > 0) {
          const users = data[addresses[0]]
          if (Array.isArray(users) && users.length > 0) {
            console.log('✅ Found user in address-keyed response:', users[0].username)
            return users[0]
          }
        }
      }
      
      // Alternative format: { users: [...] }
      if (data.users && data.users.length > 0) {
        console.log('✅ Found user in users array:', data.users[0].username)
        return data.users[0]
      }
      
      // Some APIs return data directly in an array
      if (Array.isArray(data) && data.length > 0) {
        console.log('✅ Found user in direct array:', data[0].username)
        return data[0]
      }
      
      // Check if there's a single user object
      if (data.user) {
        console.log('✅ Found user in user field:', data.user.username)
        return data.user
      }
      
      console.log('❌ No user found in any expected format')
      return null
    } catch (error) {
      console.error('Error fetching user by address:', error)
      return null
    }
  }

  async getCast(castHash: string): Promise<NeynarCast> {
    const response = await fetch(`${this.baseUrl}/farcaster/cast?identifier=${castHash}&type=hash`, {
      headers: {
        'api_key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch cast: ${response.statusText}`)
    }

    const data = await response.json()
    return data.cast
  }

  async getCastWithViewerContext(castHash: string, viewerFid: number): Promise<any> {
    // Use viewer_fid parameter to get viewer_context which includes if this user liked/recasted
    const response = await fetch(
      `${this.baseUrl}/farcaster/cast?identifier=${castHash}&type=hash&viewer_fid=${viewerFid}`,
      {
        headers: {
          'api_key': this.apiKey,
        },
      }
    )

    if (!response.ok) {
      console.error(`Failed to fetch cast with viewer context: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch cast: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Cast with viewer_context:', JSON.stringify(data.cast?.viewer_context, null, 2))
    return data.cast
  }

  async checkEngagement(fid: number, castHash: string): Promise<EngagementStatus> {
    try {
      console.log(`Checking engagement for FID ${fid} on cast ${castHash}`)
      
      // Get cast with viewer context to see if this specific user has engaged
      const cast = await this.getCastWithViewerContext(castHash, fid)
      console.log('Cast data:', JSON.stringify(cast, null, 2))
      
      // Check if the cast author is the same as the user trying to claim
      // If so, they automatically pass all engagement requirements (can't recast/like own cast)
      const isOwnCast = cast.author.fid === fid
      console.log(`Is own cast: ${isOwnCast}`)
      
      // Check viewer_context for this specific user's reactions
      const likedByUser = cast.viewer_context?.liked || false
      const recastedByUser = cast.viewer_context?.recasted || false
      
      // If it's the user's own cast, they automatically pass all requirements
      // (You can't like/recast/reply to your own cast on Farcaster)
      const liked = isOwnCast || likedByUser
      const recasted = isOwnCast || recastedByUser
      
      console.log(`Liked by user (viewer_context): ${likedByUser}, Is own cast: ${isOwnCast}, Final liked: ${liked}`)
      console.log(`Recasted by user (viewer_context): ${recastedByUser}, Is own cast: ${isOwnCast}, Final recasted: ${recasted}`)
      
      // For replies - check if user has replied to this cast
      // If it's their own cast, they automatically pass (creator gets credit)
      const replied = isOwnCast ? true : await this.checkUserRepliedToCast(fid, castHash)

      console.log(`Engagement status for FID ${fid}:`, { liked, recasted, replied })

      return {
        liked,
        recasted,
        replied
      }
    } catch (error) {
      console.error('Error checking engagement:', error)
      return {
        liked: false,
        recasted: false,
        replied: false
      }
    }
  }

  async checkUserRepliedToCast(fid: number, castHash: string): Promise<boolean> {
    try {
      // Method 1: Check cast conversation/replies directly
      const replies = await this.getCastReplies(castHash)
      const hasRepliedInThread = replies.some(reply => reply.author.fid === fid)
      
      if (hasRepliedInThread) {
        console.log(`✅ Reply check: User ${fid} found in cast replies`)
        return true
      }
      
      // Method 2: Fallback - Get user's recent casts to check if they replied to this cast
      const userCasts = await this.getCastsByFid(fid, 100) // Check last 100 casts
      
      // Check if any of the user's casts are replies to the target cast
      const hasReplied = userCasts.some(userCast => 
        userCast.parent_hash === castHash || 
        userCast.thread_hash === castHash
      )
      
      console.log(`Reply check: Found ${userCasts.length} user casts, hasReplied: ${hasReplied}`)
      return hasReplied
    } catch (error) {
      console.error('Error checking user replies:', error)
      // On error, return false to be safe (unless it's their own cast, which is handled above)
      return false
    }
  }

  async getCastReplies(castHash: string, limit = 100): Promise<NeynarCast[]> {
    try {
      // Use conversation endpoint to get all replies to a cast
      const response = await fetch(
        `${this.baseUrl}/farcaster/cast/conversation?identifier=${castHash}&type=hash&reply_depth=1&include_chronological_parent_casts=false&limit=${limit}`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        console.error(`Failed to fetch cast replies: ${response.status} ${response.statusText}`)
        return []
      }

      const data = await response.json()
      
      // The conversation endpoint returns direct replies in the conversation.cast.direct_replies array
      const directReplies = data.conversation?.cast?.direct_replies || []
      console.log(`Found ${directReplies.length} direct replies to cast ${castHash}`)
      
      return directReplies
    } catch (error) {
      console.error('Error fetching cast replies:', error)
      return []
    }
  }

  async validateEngagement(fid: number, castHash: string): Promise<boolean> {
    const engagement = await this.checkEngagement(fid, castHash)
    return engagement.liked && engagement.recasted && engagement.replied
  }

  async getCastsByFid(fid: number, limit = 25): Promise<NeynarCast[]> {
    try {
      // Try the user feed endpoint first (works with most Neynar plans)
      const response = await fetch(
        `${this.baseUrl}/farcaster/feed/user/casts?fid=${fid}&limit=${limit}&include_replies=true`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        console.error(`Failed to fetch casts for FID ${fid}: ${response.status} ${response.statusText}`)
        
        // If 404, try alternative endpoint
        if (response.status === 404) {
          console.log(`Trying alternative endpoint for FID ${fid}...`)
          return await this.getCastsByFidAlternative(fid, limit)
        }
        
        // Return empty array instead of throwing - user might not have casts
        return []
      }

      const data = await response.json()
      return data.casts || []
    } catch (error) {
      console.error(`Error fetching casts for FID ${fid}:`, error)
      // Return empty array on error to fail gracefully
      return []
    }
  }

  async getCastsByFidAlternative(fid: number, limit = 25): Promise<NeynarCast[]> {
    try {
      // Alternative: Use feed endpoint
      const response = await fetch(
        `${this.baseUrl}/farcaster/feed?feed_type=filter&filter_type=fids&fids=${fid}&with_recasts=false&limit=${limit}`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        console.error(`Alternative endpoint also failed for FID ${fid}: ${response.status}`)
        return []
      }

      const data = await response.json()
      return data.casts || []
    } catch (error) {
      console.error(`Error with alternative endpoint for FID ${fid}:`, error)
      return []
    }
  }
}

export const neynarClient = new NeynarClient(process.env.NEYNAR_API_KEY!)
