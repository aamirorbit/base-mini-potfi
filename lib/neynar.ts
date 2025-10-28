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

  async checkEngagement(fid: number, castHash: string): Promise<EngagementStatus> {
    try {
      console.log(`Checking engagement for FID ${fid} on cast ${castHash}`)
      const cast = await this.getCast(castHash)
      console.log('Cast data:', JSON.stringify(cast, null, 2))
      
      // Check if the cast author is the same as the user trying to claim
      // If so, they automatically pass all engagement requirements (can't recast/like own cast)
      const isOwnCast = cast.author.fid === fid
      console.log(`Is own cast: ${isOwnCast}`)
      
      // If it's the user's own cast, they automatically pass all requirements
      if (isOwnCast) {
        console.log('✅ Auto-passing - user is the cast author')
        return {
          liked: true,
          recasted: true,
          replied: true
        }
      }
      
      // Use dedicated reactions endpoint for accurate engagement data
      // This endpoint works with Starter plan
      const [liked, recasted, replied] = await Promise.all([
        this.checkUserLikedCast(fid, castHash),
        this.checkUserRecastedCast(fid, castHash),
        this.checkUserRepliedToCast(fid, castHash)
      ])

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

  async checkUserLikedCast(fid: number, castHash: string): Promise<boolean> {
    try {
      // Use reactions endpoint to check if user liked the cast
      // Endpoint: GET /farcaster/reactions/user?fid={fid}&type=likes&limit=100
      const response = await fetch(
        `${this.baseUrl}/farcaster/reactions/user?fid=${fid}&type=likes&limit=100`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        console.error(`Failed to fetch likes for FID ${fid}: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()
      const reactions = data.reactions || []
      
      // Check if any of the likes are for this specific cast
      const hasLiked = reactions.some((reaction: any) => 
        reaction.cast?.hash === castHash || reaction.target_hash === castHash
      )
      
      console.log(`✅ Like check: FID ${fid} ${hasLiked ? 'HAS' : 'HAS NOT'} liked cast ${castHash}`)
      return hasLiked
    } catch (error) {
      console.error(`Error checking if user liked cast:`, error)
      return false
    }
  }

  async checkUserRecastedCast(fid: number, castHash: string): Promise<boolean> {
    try {
      // Use reactions endpoint to check if user recasted the cast
      // Endpoint: GET /farcaster/reactions/user?fid={fid}&type=recasts&limit=100
      const response = await fetch(
        `${this.baseUrl}/farcaster/reactions/user?fid=${fid}&type=recasts&limit=100`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        console.error(`Failed to fetch recasts for FID ${fid}: ${response.status} ${response.statusText}`)
        return false
      }

      const data = await response.json()
      const reactions = data.reactions || []
      
      // Check if any of the recasts are for this specific cast
      const hasRecasted = reactions.some((reaction: any) => 
        reaction.cast?.hash === castHash || reaction.target_hash === castHash
      )
      
      console.log(`✅ Recast check: FID ${fid} ${hasRecasted ? 'HAS' : 'HAS NOT'} recasted cast ${castHash}`)
      return hasRecasted
    } catch (error) {
      console.error(`Error checking if user recasted cast:`, error)
      return false
    }
  }

  async checkUserRepliedToCast(fid: number, castHash: string): Promise<boolean> {
    try {
      // Method 1: Check cast conversation/replies
      // Get all replies to the cast and check if user is among them
      const response = await fetch(
        `${this.baseUrl}/farcaster/cast/conversation?identifier=${castHash}&type=hash&reply_depth=1&include_chronological_parent_casts=false&limit=100`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const conversation = data.conversation?.cast?.direct_replies || []
        
        // Check if any of the direct replies are from this user
        const hasReplied = conversation.some((reply: any) => reply.author?.fid === fid)
        
        if (hasReplied) {
          console.log(`✅ Reply check: FID ${fid} HAS replied to cast ${castHash}`)
          return true
        }
      }

      // Method 2: Fallback - check user's recent casts
      console.log(`ℹ️ No reply found in conversation, checking user's recent casts...`)
      const userCasts = await this.getUserCastsAlternative(fid, 50)
      
      // Check if any of the user's casts are replies to the target cast
      const hasReplied = userCasts.some(userCast => 
        userCast.parent_hash === castHash || 
        userCast.thread_hash === castHash
      )
      
      console.log(`✅ Reply check: FID ${fid} ${hasReplied ? 'HAS' : 'HAS NOT'} replied to cast ${castHash}`)
      return hasReplied
    } catch (error) {
      console.error('Error checking user replies:', error)
      return false
    }
  }

  // Alternative method to get user's casts (for Starter plan)
  async getUserCastsAlternative(fid: number, limit = 50): Promise<NeynarCast[]> {
    try {
      // Try the feed endpoint first
      let response = await fetch(
        `${this.baseUrl}/farcaster/feed/user/casts?fid=${fid}&limit=${limit}`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        // Fallback: try user profile with recent casts
        response = await fetch(
          `${this.baseUrl}/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
          {
            headers: {
              'api_key': this.apiKey,
            },
          }
        )
      }

      if (response.ok) {
        const data = await response.json()
        return data.casts || data.users?.[0]?.casts || []
      }

      return []
    } catch (error) {
      console.error(`Error fetching casts for FID ${fid}:`, error)
      return []
    }
  }

  async validateEngagement(fid: number, castHash: string): Promise<boolean> {
    const engagement = await this.checkEngagement(fid, castHash)
    return engagement.liked && engagement.recasted && engagement.replied
  }

  async getCastsByFid(fid: number, limit = 25): Promise<NeynarCast[]> {
    try {
      const response = await fetch(`${this.baseUrl}/farcaster/feed/user?fid=${fid}&limit=${limit}`, {
        headers: {
          'api_key': this.apiKey,
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch casts for FID ${fid}: ${response.status} ${response.statusText}`)
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
}

export const neynarClient = new NeynarClient(process.env.NEYNAR_API_KEY!)
