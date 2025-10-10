# Alchemy Setup for PotFi

## ✅ Required for Production

PotFi uses **Alchemy Growth Plan** to scan blockchain events efficiently.

---

## 🚀 Quick Setup

### 1. Create Alchemy Account

1. Go to: **https://alchemy.com**
2. Sign up (free)
3. Verify your email

### 2. Create Base Mainnet App

1. Click **"+ Create New App"**
2. Fill in:
   - **Chain**: Base
   - **Network**: Mainnet
   - **Name**: PotFi (or any name)
3. Click **"Create App"**

### 3. Upgrade to Growth Plan

**⚠️ Important:** Free tier only allows scanning 10 blocks at a time!

1. Go to **Settings** → **Plan & Billing**
2. Click **"Upgrade"**
3. Select **"Growth Plan"** ($49/month)
4. This unlocks:
   - ✅ Large block range scanning (1M+ blocks)
   - ✅ Higher rate limits
   - ✅ Better reliability

### 4. Get API Key

1. Go to your app dashboard
2. Click **"API Keys"** tab
3. Click **"View Key"**
4. Copy the API Key

### 5. Add to Environment

Add to `.env.local`:

```bash
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### 6. Restart Server

```bash
yarn dev
```

---

## 📊 What It Does

### Scans Blockchain Events

The app uses Alchemy to:
- Scan last **1,000,000 blocks** (~23 days on Base)
- Find all `PotCreated` events
- Get pot details
- Track claims and jackpots

### Performance

| Metric | Value |
|--------|-------|
| **Speed** | ~400ms |
| **Blocks Scanned** | 1,000,000 |
| **History** | ~23 days |
| **Rate Limit** | 660 CU/s |

---

## 💰 Pricing

### Growth Plan ($49/month)

- **Included**: 400M compute units/month
- **Extra**: $12 per 100M CUs
- **Base Mainnet**: 0.1 CU per call

### Estimated Usage (1,000 users/day)

```
View Pots: 1,000 requests/day × 30 days = 30,000 requests
Claim Page: 100 requests/day × 30 days = 3,000 requests
Total: ~33,000 requests/month

Compute Units: 33,000 × 10 = 330,000 CU
Cost: $49/month (within included 400M CUs)
```

✅ **Easily within free included quota!**

---

## 🧪 Test Your Setup

Run the test script:

```bash
node test-blockchain-scan.js
```

**Expected output:**

```
✅ Latest block: 36654394
✅ Query completed in: 388 ms
📦 Found events: 2
🎉 SUCCESS! Found 2 pot(s)
```

If you see errors:
- ❌ "10 block range" → Upgrade not applied yet (wait 5-10 min)
- ❌ "503 error" → Public RPC (check API key)
- ❌ "401 error" → Invalid API key

---

## 📋 Checklist

- [ ] Create Alchemy account
- [ ] Create Base Mainnet app
- [ ] Upgrade to Growth Plan
- [ ] Copy API key
- [ ] Add `ALCHEMY_API_KEY` to `.env.local`
- [ ] Restart dev server
- [ ] Test with `node test-blockchain-scan.js`
- [ ] Verify "View Pots" page works

---

## 🔍 Troubleshooting

### "Under the Free tier plan, you can make eth_getLogs requests with up to a 10 block range"

**Solution:** Upgrade hasn't taken effect yet.
- Wait 5-10 minutes
- Generate a new API key
- Check plan in dashboard

### "HTTP request failed. Status: 503"

**Solution:** No Alchemy key or wrong key.
- Check `.env.local` has `ALCHEMY_API_KEY`
- Verify key is correct
- Restart server

### "View Pots" page shows no data

**Solutions:**
1. Check console for errors
2. Verify contract address is correct
3. Make sure you've created at least one pot
4. Check if pots are older than 23 days (out of scan range)

---

## 💡 Why Alchemy?

### Alternatives Considered

| Method | Speed | Cost | Reliability | Status |
|--------|-------|------|-------------|--------|
| **BaseScan API** | N/A | FREE | N/A | ❌ Deprecated |
| **Public RPC** | 5-10s | FREE | ❌ Poor | ⚠️ Unreliable |
| **Alchemy Free** | N/A | FREE | N/A | ❌ 10 block limit |
| **Alchemy Growth** | 0.4s | $49/mo | ✅ Excellent | ✅ **Chosen** |
| **The Graph** | 0.5s | FREE | ✅ Good | 🔄 Complex setup |

**Alchemy Growth is the best balance of:**
- ✅ Speed
- ✅ Reliability  
- ✅ Simple setup
- ✅ Reasonable cost

---

## 📱 Production Deployment

When deploying to production (Vercel):

1. Add to **Vercel Environment Variables**:
   ```
   ALCHEMY_API_KEY=your_key_here
   ```

2. Redeploy:
   ```bash
   git push
   ```

3. Verify in Vercel logs:
   ```
   🔗 Using RPC: Alchemy (Growth Plan)
   ✅ Found X PotCreated events in Yms
   ```

---

## ✅ You're Done!

Your app now uses Alchemy for fast, reliable blockchain scanning! 🎉

**Next:** Create some pots and test the "View Pots" page!
