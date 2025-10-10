# BaseScan API Setup for PotFi

## ⚠️ IMPORTANT: Etherscan API for Base

**Good news!** Etherscan API v2 works across **all chains** including Base!

The same Etherscan API key works for:
- ✅ Ethereum mainnet (`api.etherscan.io`)
- ✅ Base network (`api.basescan.org`)
- ✅ Optimism, Arbitrum, Polygon, etc.

**You can use either:**
- Your existing Etherscan API key, OR
- Create a new one specifically for Base

## Why BaseScan API is Better

Instead of scanning blockchain logs directly (slow, expensive), we use BaseScan's pre-indexed data:

### Comparison:

| Method | Speed | Cost | Reliability | History |
|--------|-------|------|-------------|---------|
| **Direct RPC** | 5-10s | High compute | ❌ Often fails | Last ~23 days |
| **Alchemy RPC** | 1-2s | 300 CU/call | ✅ Good | Full history |
| **BaseScan API** | 0.5-1s | FREE! | ✅ Excellent | Full history |

**BaseScan wins because:**
- ✅ **FREE** (100k calls/day on free tier)
- ✅ **Pre-indexed** (no blockchain scanning needed)
- ✅ **Fast** (purpose-built for this)
- ✅ **Full history** (from block 0)
- ✅ **Simple** (just REST API calls)

## Setup Steps

### 1. Get Etherscan API Key (FREE)

**Option A: Use existing Etherscan key**
- If you already have an Etherscan API key, use it!
- Works on Base via `api.basescan.org`

**Option B: Create new key**
1. Go to https://etherscan.io/myapikey (or https://basescan.org/myapikey)
2. Sign up (free account)
3. Create a new API key
4. Copy your API key

**Free Tier Limits:**
- 5 calls/second
- 100,000 calls/day
- More than enough for most apps!

### 2. Add to Environment

Add to your `.env.local` (use either variable name):

```bash
# Option 1: Use ETHERSCAN_API_KEY (if you have one)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Option 2: Use BASESCAN_API_KEY (Base-specific)
BASESCAN_API_KEY=your_api_key_here

# The app will use whichever is available
```

### 3. Restart Server

```bash
yarn dev
# or
npm run dev
```

### 4. Test

Go to `/view` page - should load instantly!

## How It Works

### Old Way (Direct RPC):
```
Your App → RPC Node → Scan millions of blocks → Filter events → Return
Time: 5-10 seconds
```

### New Way (BaseScan):
```
Your App → BaseScan API → Pre-indexed database → Return
Time: 0.5-1 seconds
```

## What We Query

### Get All PotCreated Events:
```
GET https://api.basescan.org/api?
  module=logs
  &action=getLogs
  &address=0x5cE8e7db92493884CD5642F7828711FeCAF66656
  &topic0=0xedbc7e1f4902e524d9cab0ffcc13f86772988eae02f52b3a34acaa7681b58fc4
  &fromBlock=0
  &toBlock=latest
  &apikey=YOUR_KEY
```

### Filter by Creator:
```
&topic1=0x000000000000000000000000{creatorAddress}
&topic0_1_opr=and
```

## Benefits for Your App

1. **View Pots Page**
   - Loads 10x faster
   - No more 503 errors
   - Shows ALL pots (not just last 23 days)

2. **No Alchemy Required**
   - BaseScan is sufficient for most use cases
   - Still use Alchemy for contract reads (faster RPC)

3. **Cost Savings**
   - BaseScan: FREE (100k calls/day)
   - Alchemy: 300M compute units/month
   - Use BaseScan for logs, Alchemy for reads = Best combo!

## Rate Limits

### Without API Key (Public):
- 1 call per 5 seconds
- Very limited

### With Free API Key:
- 5 calls per second
- 100,000 calls per day
- Perfect for most apps!

### Pro Plan ($199/month):
- 50 calls per second
- Unlimited daily calls
- Priority support

## Monitoring Usage

Check your usage at: https://basescan.org/myapikey

Shows:
- Calls today
- Calls this month
- Rate limit status

## Troubleshooting

### "Max rate limit reached"
- You're making too many calls per second
- Add a delay between calls
- Or upgrade to Pro plan

### "Invalid API Key"
- Check `.env.local` has correct key
- Restart dev server
- Key should start with a letter

### "No records found"
- Normal if user has no pots
- App handles this gracefully

## Best Practices

1. **Cache Results**
   - Cache pot data for 30-60 seconds
   - Reduces API calls

2. **Use Pagination**
   - BaseScan supports `page` and `offset` params
   - For users with many pots

3. **Combine with Alchemy**
   - BaseScan for historical logs
   - Alchemy for real-time contract reads
   - Best of both worlds!

## Cost Analysis (Monthly)

For an app with 10,000 users:

| Provider | API | Monthly Cost |
|----------|-----|--------------|
| **BaseScan** | getLogs | $0 (free tier) |
| **Alchemy** | Contract reads | $0-49 (free/growth) |
| **Total** | Combined | **$0-49/month** |

Compare to running your own node: $500-1000/month!

---

## Summary

✅ **Use BaseScan for:**
- Getting event logs
- Transaction history
- Historical data

✅ **Use Alchemy for:**
- Contract reads (faster RPC)
- Real-time data
- Higher reliability

This combo gives you the best performance at the lowest cost! 🚀

