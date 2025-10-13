# Base Account Implementation Guide

## Overview

PotFi mini app now fully supports Base Account capabilities, providing enhanced user experience for users with Base Accounts while maintaining backward compatibility with traditional wallets.

## Features Implemented

### 1. Capability Detection
- **Automatic detection** of Base Account features
- Support for `atomicBatch`, `paymasterService`, and `auxiliaryFunds`
- Graceful fallback for traditional wallets
- Real-time capability checking via EIP-5792

### 2. Sponsored Gas Transactions
- **Gas-free transactions** when using Base Account with paymaster service
- Automatic fallback to regular transactions if sponsorship fails
- Visual indicators showing when gas-free transactions are available
- Integrated Coinbase Paymaster Service

### 3. Batch Transactions
- **One-click pot creation**: Approve + Create in a single transaction
- **One-click claims**: Optimized single-confirmation flow
- Atomic execution with automatic rollback on failure
- Sequential fallback for wallets without batch support

## File Structure

```
/hooks
  ├── useBaseAccountCapabilities.ts  # Detects Base Account features
  ├── useBatchTransactions.ts        # Handles atomic batch transactions
  ├── useSmartWallet.ts              # Unified wallet hook with capabilities
  └── useMiniKitWallet.ts            # Existing MiniKit integration

/lib
  └── paymaster.ts                   # Paymaster service configuration

/app
  ├── create/page.tsx                # Enhanced with batch + sponsored gas
  └── claim/[id]/page.tsx            # Enhanced with sponsored gas
```

## Key Components

### useBaseAccountCapabilities Hook

```typescript
const capabilities = useBaseAccountCapabilities(address)

// Returns:
{
  atomicBatch: boolean         // Can batch multiple transactions
  paymasterService: boolean    // Can sponsor gas fees
  auxiliaryFunds: boolean      // Can use auxiliary funds
  isLoading: boolean          // Still detecting capabilities
  hasCapabilities: boolean    // Has any Base Account features
}
```

### useSmartWallet Hook

Unified wallet interface that combines MiniKit wallet with Base Account detection:

```typescript
const smartWallet = useSmartWallet(isFarcasterEnv)

// Provides:
- address, chainId, isConnected (wallet state)
- capabilities (Base Account features)
- canSponsorGas (whether gas sponsorship is available)
- gasSponsorshipMessage (user-friendly status)
- connect, disconnect, switchToBase (actions)
```

### useBatchTransactions Hook

Enables atomic batch transactions with automatic fallback:

```typescript
const { writeBatch } = useBatchTransactions()

// Execute multiple transactions atomically
await writeBatch([
  {
    address: USDC,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount]
  },
  {
    address: potfiAddress,
    abi: potfiAbi,
    functionName: 'createPot',
    args: [...]
  }
], capabilities)
```

## Transaction Flows

### Create Pot Flow (with Base Account)

1. **User clicks "Create Pot"**
2. **Capability check:**
   - If `atomicBatch` supported: Execute approve + create in one transaction
   - If only `paymasterService`: Execute approve, then create (both gas-free)
   - If neither: Traditional two-step with user paying gas
3. **Visual feedback:**
   - Shows "Gas-free transaction enabled" badge
   - Shows "One-click pot creation available" badge
4. **Transaction execution:**
   - Uses `wallet_sendCalls` for batch transactions
   - Includes paymaster capability for gas sponsorship
   - Falls back gracefully if not supported

### Claim Flow (with Base Account)

1. **User clicks "Claim Pot"**
2. **Capability check:**
   - If `paymasterService` available: Gas-free claim
   - Otherwise: User pays gas
3. **Visual feedback:**
   - Shows "Gas-free claim available" badge
4. **Transaction execution:**
   - Attempts sponsored transaction via `wallet_sendCalls`
   - Falls back to regular transaction if sponsorship fails

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Coinbase Paymaster Service URL (Base mainnet)
NEXT_PUBLIC_COINBASE_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
```

### Paymaster Service

Located in `lib/paymaster.ts`:

```typescript
// Update with your Coinbase Developer Platform API key
const PAYMASTER_SERVICE_URL = 
  'https://api.developer.coinbase.com/rpc/v1/base/v7HqDLjJY4e28qgIDAAN4JNYXnz88mJZ'
```

## User Experience Benefits

### For Base Account Users:
- ✅ **Zero ETH required** - Pay no gas fees
- ✅ **One-click flows** - Approve + Create in single transaction
- ✅ **Faster transactions** - Fewer confirmations needed
- ✅ **Better UX** - Seamless, frictionless experience

### For Traditional Wallet Users:
- ✅ **Full compatibility** - Everything works as before
- ✅ **Automatic fallback** - Smooth degradation to standard flows
- ✅ **No breaking changes** - Existing functionality preserved

## Testing

### Test Scenarios

1. **Base Account with Full Capabilities:**
   ```
   - Connect with Base Account
   - Verify "Gas-free" badge appears
   - Verify "One-click" badge appears
   - Create pot: Should batch approve + create
   - Claim pot: Should execute without gas fee
   ```

2. **Traditional Wallet:**
   ```
   - Connect with MetaMask/Rainbow/etc
   - No capability badges should appear
   - Create pot: Should require 2 separate transactions
   - Claim pot: Should require gas payment
   ```

3. **Fallback Scenarios:**
   ```
   - Start with Base Account
   - Disable paymaster service
   - Verify graceful fallback to regular transactions
   - No errors or broken flows
   ```

## Browser Console Logging

The implementation includes comprehensive logging for debugging:

- `✅` Success messages (green checkmark)
- `🚀` Feature activation (rocket)
- `🎯` Important data extraction
- `ℹ️` Informational messages
- `⏳` Waiting/polling states
- `❌` Errors

## Best Practices

### 1. Always Check Capabilities
```typescript
if (smartWallet.capabilities.atomicBatch) {
  // Use batch transaction
} else {
  // Use sequential transactions
}
```

### 2. Provide Visual Feedback
```typescript
{smartWallet.canSponsorGas && (
  <div className="bg-blue-50/50 ...">
    <Zap /> Gas-free transaction enabled
  </div>
)}
```

### 3. Implement Graceful Fallbacks
```typescript
try {
  // Try sponsored transaction
  await sendWithPaymaster()
} catch (error) {
  // Fallback to regular transaction
  await sendRegular()
}
```

### 4. Handle All Wallet Types
- Don't assume Base Account is always available
- Test with both Base Account and traditional wallets
- Ensure UI adapts to capability availability

## Troubleshooting

### Issue: Capabilities not detected
**Solution:** Ensure wallet supports EIP-5792 `wallet_getCapabilities`

### Issue: Sponsored transactions failing
**Solution:** Check paymaster service URL and API key, verify Base network

### Issue: Batch transactions not working
**Solution:** Verify wallet supports `wallet_sendCalls`, fall back to sequential

### Issue: Type errors with ABI
**Solution:** Ensure addresses are typed as \`0x${string}\`, ABIs accept readonly arrays

## References

- [Base Account Overview](https://docs.base.org/base-account/overview)
- [Base Account Capabilities](https://docs.base.org/base-account/reference/core/capabilities/overview)
- [Paymaster Service](https://docs.base.org/base-account/reference/core/capabilities/paymasterService)
- [Batch Transactions](https://docs.base.org/base-account/improve-ux/batch-transactions)
- [EIP-5792: Wallet Capabilities](https://eips.ethereum.org/EIPS/eip-5792)

## Next Steps

1. ✅ Set up Coinbase Developer Platform account
2. ✅ Get API key for Paymaster Service
3. ✅ Update `NEXT_PUBLIC_COINBASE_PAYMASTER_URL` in environment
4. ✅ Test with Base Account in production
5. ✅ Monitor paymaster usage and costs
6. ✅ Consider implementing additional Base Account features (passkeys, etc.)

## Support

For issues or questions:
- Check browser console for detailed logs
- Review capability detection output
- Verify network and wallet compatibility
- Test with different wallet types

---

**Implementation Status:** ✅ Complete
**Backward Compatibility:** ✅ Maintained
**Production Ready:** ✅ Yes (with valid paymaster API key)

