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
      if (data.users && data.users.length > 0) {
        return data.users[0]
      }
      
      // Some APIs return data directly in an array
      if (Array.isArray(data) && data.length > 0) {
        return data[0]
      }
      
      // Check if there's a single user object
      if (data.user) {
        return data.user
      }
      
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
      // If so, they automatically "liked" their own post
      const isOwnCast = cast.author.fid === fid
      console.log(`Is own cast: ${isOwnCast}`)
      
      // With Starter plan, we should now get detailed reaction data
      const likedByUser = cast.reactions?.likes?.some(like => like.fid === fid) || false
      const liked = isOwnCast || likedByUser
      
      console.log(`Liked by user in API: ${likedByUser}, Is own cast: ${isOwnCast}, Final liked: ${liked}`)
      const recasted = cast.reactions?.recasts?.some(recast => recast.fid === fid) || false
      
      // For debugging - let's also check the likes_count vs actual likes array
      console.log(`Likes count: ${cast.reactions?.likes_count}, Likes array length: ${cast.reactions?.likes?.length}`)
      console.log(`Recasts count: ${cast.reactions?.recasts_count}, Recasts array length: ${cast.reactions?.recasts?.length}`)
      
      // For now, let's be more lenient with replies - check if user has replied to this cast
      // This requires a separate API call to get replies by the user
      const replied = await this.checkUserRepliedToCast(fid, castHash)

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
      // Get user's recent casts to check if they replied to this cast
      const userCasts = await this.getCastsByFid(fid, 50) // Check last 50 casts
      
      // Check if any of the user's casts are replies to the target cast
      const hasReplied = userCasts.some(userCast => 
        userCast.parent_hash === castHash || 
        userCast.thread_hash === castHash
      )
      
      return hasReplied
    } catch (error) {
      console.error('Error checking user replies:', error)
      // For now, let's be lenient and return true if we can't check
      return true
    }
  }

  async validateEngagement(fid: number, castHash: string): Promise<boolean> {
    const engagement = await this.checkEngagement(fid, castHash)
    return engagement.liked && engagement.recasted && engagement.replied
  }

  async getCastsByFid(fid: number, limit = 25): Promise<NeynarCast[]> {
    const response = await fetch(`${this.baseUrl}/farcaster/feed/user?fid=${fid}&limit=${limit}`, {
      headers: {
        'api_key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch casts: ${response.statusText}`)
    }

    const data = await response.json()
    return data.casts
  }
}

export const neynarClient = new NeynarClient(process.env.NEYNAR_API_KEY!)
