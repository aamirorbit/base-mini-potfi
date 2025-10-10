# Alchemy Enhanced APIs for PotFi

## Why Alchemy?

Alchemy provides enhanced APIs that are faster and more reliable than raw RPC calls, plus they have indexed data APIs.

## Setup

### 1. Get API Key
1. Sign up at https://www.alchemy.com/
2. Create a Base Mainnet app
3. Copy your API key

### 2. Update Environment
```env
# .env.local
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ALCHEMY_API_KEY=YOUR_API_KEY
```

### 3. Use Alchemy SDK (Better than raw RPC)

Install:
```bash
npm install alchemy-sdk
```

Update `/app/api/pots/route.ts`:

```typescript
import { Alchemy, Network } from 'alchemy-sdk'

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.BASE_MAINNET,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get('creator')
    
    // Get logs using Alchemy (much faster than public RPC)
    const logs = await alchemy.core.getLogs({
      address: jackpotAddress,
      topics: [
        // PotCreated event signature
        '0x...' // Your event signature
      ],
      fromBlock: 'earliest', // Alchemy handles this efficiently
      toBlock: 'latest',
    })
    
    // Rest of your logic...
    
  } catch (error) {
    console.error('Alchemy fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch pots' }, { status: 500 })
  }
}
```

## Benefits

✅ **Much faster** than public RPC
✅ **Higher rate limits** (300 compute units/sec on free tier)
✅ **99.9% uptime** SLA
✅ **Archive node access** (full history)
✅ **Enhanced APIs** (transfers, NFTs, etc.)
✅ **Free tier**: 300M compute units/month

## Cost
- **Free tier**: Sufficient for most apps
- **Growth tier**: $49/month for 400M compute units
- **Scale tier**: Custom pricing

## Alternative: Use Alchemy Notify (Webhooks)

Even better - get notified when events happen!

```typescript
// Setup webhook in Alchemy dashboard
// Alchemy will POST to your endpoint when PotCreated event fires

// /app/api/alchemy-webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Alchemy sends you the decoded event
  const { event, log } = body
  
  if (event.name === 'PotCreated') {
    // Store in your database
    await storePotInDB({
      id: event.args.id,
      creator: event.args.creator,
      amount: event.args.amount,
      // ...
    })
  }
  
  return NextResponse.json({ received: true })
}
```

This way you have instant updates without polling!

