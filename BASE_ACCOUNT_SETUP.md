# Base Account Setup Guide

## Quick Start

Follow these steps to enable Base Account capabilities in your PotFi mini app.

## Prerequisites

1. **Coinbase Developer Platform Account**
   - Sign up at: https://portal.cdp.coinbase.com/
   - Create a new project
   - Generate API key for Paymaster Service

2. **Base Network Configuration**
   - Ensure your contract is deployed on Base Mainnet (Chain ID: 8453)
   - Contract address should be set in environment variables

## Step 1: Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Existing variables
NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS=0xYourContractAddress
NEYNAR_API_KEY=your_neynar_api_key
GATE_SIGNER_PRIVATE_KEY=0xYourPrivateKey
FEE_TREASURY_ADDRESS=0xYourTreasuryAddress

# NEW: Base Account Paymaster Service
NEXT_PUBLIC_COINBASE_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY_HERE
```

## Step 2: Get Coinbase Paymaster API Key

1. Go to https://portal.cdp.coinbase.com/
2. Create a new project or select existing
3. Navigate to "APIs" section
4. Enable "Paymaster Service"
5. Copy your API key
6. Replace `YOUR_API_KEY_HERE` in the environment variable

## Step 3: Update Paymaster Configuration

Open `lib/paymaster.ts` and verify the configuration:

```typescript
const PAYMASTER_SERVICE_URL = process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL || 
  'https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY'
```

## Step 4: Test the Implementation

### Testing with Base Account

1. **Open PotFi in Base App**
   - Launch the mini app in the Base mobile app
   - Your Base Account will be automatically connected

2. **Verify Capability Detection**
   - Open browser console (for development)
   - Look for: `✅ Base Account detected: { atomicBatch: true, paymasterService: true }`

3. **Test Create Pot Flow**
   - Navigate to create pot page
   - Verify "Gas-free transactions enabled" badge appears
   - Verify "One-click pot creation available" badge appears
   - Click "Create Pot"
   - Should see single confirmation for both approve + create
   - Check console for: `🚀 Using Base Account batch transaction`

4. **Test Claim Flow**
   - Open a claim page
   - Verify "Gas-free claim available" badge appears
   - Click "Claim Pot"
   - Should execute without gas fee
   - Check console for: `🚀 Using sponsored gas transaction`

### Testing with Traditional Wallet

1. **Connect MetaMask or Rainbow Wallet**
   - Use WalletConnect or direct connection

2. **Verify Fallback Behavior**
   - No capability badges should appear
   - Create pot should require 2 separate transactions
   - Claim should require gas payment
   - Everything should work as before

## Step 5: Monitor and Optimize

### Monitor Paymaster Usage

1. **Check Coinbase Dashboard**
   - View transaction counts
   - Monitor gas sponsorship costs
   - Track usage patterns

2. **Console Logging**
   - Development: Full verbose logging
   - Production: Error logging only

### Set Usage Limits

Consider implementing:

```typescript
// Optional: Limit gas sponsorship per user
const MAX_SPONSORED_TXS_PER_DAY = 10

// Optional: Limit sponsorship amount
const MAX_GAS_SUBSIDY_USD = 5.00
```

## Troubleshooting

### "Paymaster service not available"
**Cause:** Invalid API key or network mismatch  
**Solution:** 
- Verify API key is correct
- Ensure on Base Mainnet (Chain ID: 8453)
- Check Coinbase Developer Platform status

### "Batch transaction failed, falling back"
**Cause:** Wallet doesn't support `wallet_sendCalls`  
**Solution:** This is expected behavior - transaction will complete sequentially

### "Capability detection not supported"
**Cause:** Wallet doesn't implement EIP-5792  
**Solution:** This is expected for traditional wallets - no action needed

### Type errors with transactions
**Cause:** TypeScript strict mode  
**Solution:** Ensure addresses are typed as \`0x${string}\`

## Security Considerations

### Paymaster Service

1. **API Key Protection**
   - Keep API key in environment variables only
   - Never commit to git
   - Rotate keys periodically

2. **Usage Monitoring**
   - Set up alerts for unusual activity
   - Monitor for abuse patterns
   - Implement rate limiting if needed

3. **Fallback Strategy**
   - Always have fallback to user-paid gas
   - Handle paymaster service outages gracefully
   - Log failures for investigation

### Smart Contract Security

1. **Gas Limits**
   - Set reasonable gas limits for sponsored transactions
   - Prevent gas price manipulation

2. **Transaction Validation**
   - Validate all transaction parameters
   - Check for replay attacks
   - Verify signature authenticity

## Performance Optimization

### Capability Caching

```typescript
// Cache capabilities per session
const [cachedCapabilities, setCachedCapabilities] = useState()

useEffect(() => {
  if (!cachedCapabilities && address) {
    detectCapabilities().then(setCachedCapabilities)
  }
}, [address])
```

### Batch Transaction Optimization

```typescript
// Only batch when it makes sense
if (needsApproval && capabilities.atomicBatch) {
  await batchTransaction()
} else if (!needsApproval) {
  await singleTransaction() // Skip approval
}
```

## Cost Estimation

### Gas Sponsorship Costs

Approximate costs per transaction on Base:

- **Single Claim:** ~$0.01 - $0.02
- **Approve + Create:** ~$0.03 - $0.05
- **Batch Transaction:** ~$0.04 - $0.06 (but only one confirmation)

### Budget Planning

For 1000 users/day:
- If 50% use Base Account
- Average 2 transactions per user
- Estimated cost: $20-40/day

Consider:
- Setting daily budget limits
- Implementing tiered sponsorship
- Reserving gas sponsorship for new users

## Advanced Features

### Future Enhancements

1. **Passkey Authentication**
   ```typescript
   // Add passkey support for Base Account
   const signInWithPasskey = async () => {
     // Implementation using Base Account passkey API
   }
   ```

2. **Auxiliary Funds**
   ```typescript
   // Use auxiliary funds for complex flows
   if (capabilities.auxiliaryFunds) {
     // Leverage multiple funding sources
   }
   ```

3. **Session Keys**
   ```typescript
   // Implement session keys for repeated actions
   const createSessionKey = async () => {
     // Implementation for gasless sessions
   }
   ```

## Support Resources

- **Base Documentation:** https://docs.base.org/base-account
- **Coinbase Developer Portal:** https://portal.cdp.coinbase.com/
- **EIP-5792 Spec:** https://eips.ethereum.org/EIPS/eip-5792
- **Viem Documentation:** https://viem.sh/docs/actions/wallet/writeContract

## Checklist

- [ ] Coinbase Developer Platform account created
- [ ] Paymaster API key obtained
- [ ] Environment variables configured
- [ ] `lib/paymaster.ts` updated with API key
- [ ] Tested with Base Account in Base app
- [ ] Tested with traditional wallet (MetaMask)
- [ ] Verified capability badges appear correctly
- [ ] Confirmed gas-free transactions working
- [ ] Confirmed batch transactions working
- [ ] Fallback behavior tested and working
- [ ] Console logging reviewed
- [ ] Error handling verified
- [ ] Usage monitoring set up
- [ ] Budget limits configured (if needed)

## Success Criteria

✅ Base Account users see capability badges  
✅ Gas-free transactions execute without errors  
✅ Batch transactions complete in single confirmation  
✅ Traditional wallets work unchanged  
✅ Fallbacks trigger gracefully when needed  
✅ No TypeScript or linting errors  
✅ Console logging provides clear feedback  

---

**Status:** Ready for Production  
**Last Updated:** October 2025  
**Maintained By:** PotFi Development Team

