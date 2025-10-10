# The Graph Subgraph Setup for PotFi

## Why Use The Graph?

Instead of querying RPC directly (slow, rate-limited), The Graph indexes all blockchain events and provides fast GraphQL queries.

## Setup Steps

### 1. Install Graph CLI
```bash
npm install -g @graphprotocol/graph-cli
```

### 2. Initialize Subgraph
```bash
graph init --studio potfi-subgraph
```

### 3. Create `subgraph.yaml`
```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: PotFi
    network: base
    source:
      address: "0x5cE8e7db92493884CD5642F7828711FeCAF66656"
      abi: PotFi
      startBlock: 20000000  # Your contract deployment block
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Pot
        - Claim
      abis:
        - name: PotFi
          file: ./abis/PotFi.json
      eventHandlers:
        - event: PotCreated(indexed bytes32,indexed address,address,uint256,uint128)
          handler: handlePotCreated
        - event: StandardClaim(indexed bytes32,indexed address,uint256,uint256)
          handler: handleStandardClaim
        - event: JackpotClaim(indexed bytes32,indexed address,uint256,uint256,uint256)
          handler: handleJackpotClaim
        - event: Swept(indexed bytes32,indexed address,uint256)
          handler: handleSwept
      file: ./src/mapping.ts
```

### 4. Create `schema.graphql`
```graphql
type Pot @entity {
  id: Bytes! # pot ID
  creator: Bytes!
  token: Bytes!
  amount: BigInt!
  claimedAmount: BigInt!
  standardClaim: BigInt!
  createdAt: BigInt!
  timeoutSecs: Int!
  active: Boolean!
  claims: [Claim!]! @derivedFrom(field: "pot")
  claimCount: Int!
  jackpotWinner: Bytes
  jackpotAmount: BigInt
}

type Claim @entity {
  id: Bytes! # transaction hash + log index
  pot: Pot!
  claimer: Bytes!
  amount: BigInt!
  fee: BigInt!
  timestamp: BigInt!
  isJackpot: Boolean!
}
```

### 5. Create `src/mapping.ts`
```typescript
import { PotCreated, StandardClaim, JackpotClaim, Swept } from "../generated/PotFi/PotFi"
import { Pot, Claim } from "../generated/schema"

export function handlePotCreated(event: PotCreated): void {
  let pot = new Pot(event.params.id)
  pot.creator = event.params.creator
  pot.token = event.params.token
  pot.amount = event.params.amount
  pot.claimedAmount = BigInt.fromI32(0)
  pot.standardClaim = event.params.standardClaim
  pot.createdAt = event.block.timestamp
  pot.active = true
  pot.claimCount = 0
  pot.save()
}

export function handleStandardClaim(event: StandardClaim): void {
  let claim = new Claim(event.transaction.hash.concat(event.logIndex.toHexString()))
  claim.pot = event.params.id
  claim.claimer = event.params.to
  claim.amount = event.params.net
  claim.fee = event.params.fee
  claim.timestamp = event.block.timestamp
  claim.isJackpot = false
  claim.save()

  // Update pot
  let pot = Pot.load(event.params.id)
  if (pot) {
    pot.claimedAmount = pot.claimedAmount.plus(event.params.net)
    pot.claimCount = pot.claimCount + 1
    pot.save()
  }
}

export function handleJackpotClaim(event: JackpotClaim): void {
  let claim = new Claim(event.transaction.hash.concat(event.logIndex.toHexString()))
  claim.pot = event.params.id
  claim.claimer = event.params.to
  claim.amount = event.params.net
  claim.fee = event.params.fee
  claim.timestamp = event.block.timestamp
  claim.isJackpot = true
  claim.save()

  // Update pot
  let pot = Pot.load(event.params.id)
  if (pot) {
    pot.claimedAmount = pot.claimedAmount.plus(event.params.net)
    pot.claimCount = pot.claimCount + 1
    pot.jackpotWinner = event.params.to
    pot.jackpotAmount = event.params.net
    pot.active = false
    pot.save()
  }
}

export function handleSwept(event: Swept): void {
  let pot = Pot.load(event.params.id)
  if (pot) {
    pot.active = false
    pot.save()
  }
}
```

### 6. Deploy
```bash
# Authenticate
graph auth --studio <DEPLOY_KEY>

# Build
graph codegen && graph build

# Deploy
graph deploy --studio potfi-subgraph
```

### 7. Query in Your App

Update `/app/api/pots/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get('creator')
    
    // Query The Graph instead of RPC
    const query = `
      query GetPots($creator: Bytes) {
        pots(
          where: { creator: $creator }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          creator
          token
          amount
          claimedAmount
          standardClaim
          createdAt
          timeoutSecs
          active
          claimCount
          jackpotWinner
          jackpotAmount
          claims {
            id
            claimer
            amount
            timestamp
            isJackpot
          }
        }
      }
    `
    
    const response = await fetch(
      'https://api.studio.thegraph.com/query/<YOUR_SUBGRAPH_ID>/potfi-subgraph/version/latest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { creator: creatorAddress?.toLowerCase() }
        })
      }
    )
    
    const { data } = await response.json()
    
    // Transform and return
    const pots = data.pots.map(pot => ({
      id: pot.id,
      creator: pot.creator,
      amount: Number(pot.amount) / 1e6,
      claimedAmount: Number(pot.claimedAmount) / 1e6,
      remainingAmount: (Number(pot.amount) - Number(pot.claimedAmount)) / 1e6,
      claimCount: pot.claimCount,
      createdAt: Number(pot.createdAt) * 1000,
      status: pot.active ? 'active' : 'completed',
      jackpotWinner: pot.jackpotWinner,
      // ... more fields
    }))
    
    return NextResponse.json({ pots, success: true })
    
  } catch (error) {
    console.error('Subgraph fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch pots' }, { status: 500 })
  }
}
```

## Benefits

✅ **10-100x faster** than RPC queries
✅ **No rate limits** on free tier (1M queries/month)
✅ **Historical data** automatically indexed
✅ **Real-time updates** (syncs every few seconds)
✅ **Complex queries** easy with GraphQL
✅ **Free tier** sufficient for most apps

## Cost
- **Free tier**: 100K queries/month
- **Growth plan**: $49/month for 3M queries/month
- Much cheaper than running your own indexer!

