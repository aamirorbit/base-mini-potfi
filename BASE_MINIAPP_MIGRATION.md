# Base Mini App Migration Summary

## ✅ Completed Migration

Your PotFi app has been successfully migrated from Farcaster Mini Apps to Base Mini Apps! Here's what was changed:

### 1. Manifest Configuration

**File:** `public/.well-known/farcaster.json`

- ✅ Changed `miniapp` to `frame` format
- ✅ Removed Farcaster-specific fields (`buttonTitle`, `imageUrl`, `requiredChains`, `requiredCapabilities`)
- ✅ Updated `splashBackgroundColor` to match your design system (`#3B82F6`)
- ✅ Kept `accountAssociation` and `baseBuilder` (compatible with both)

### 2. SDK Migration

**From:** `@farcaster/miniapp-sdk`
**To:** `@coinbase/onchainkit` with `/minikit` exports

#### Key Changes:
- ✅ Installed `@coinbase/onchainkit` (MiniKit is built-in)
- ✅ Updated all imports to use `@coinbase/onchainkit/minikit`
- ✅ Migrated context access to use `useMiniKit()` hook
- ✅ Simplified detection with `useIsInMiniApp()` hook

### 3. Provider Updates

**File:** `app/providers.tsx`

Added OnchainKit providers:
```tsx
<OnchainKitProvider apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} chain={base}>
  <MiniKitProvider>
    {children}
  </MiniKitProvider>
</OnchainKitProvider>
```

### 4. Wallet Integration

**Base Mini Apps use the built-in smart wallet**, which integrates automatically with wagmi!

- ✅ Simplified wallet connection (no manual provider setup needed)
- ✅ Removed custom MiniKit provider logic
- ✅ Wallet works seamlessly with existing wagmi setup
- ✅ Transactions use standard wagmi `writeContract`

### 5. Component Updates

#### Updated Files:
- ✅ `app/components/MiniAppProvider.tsx` - Now uses `useMiniKit` and `useIsInMiniApp`
- ✅ `app/claim/[id]/page.tsx` - Updated context detection and wallet logic
- ✅ `app/template.tsx` - Updated comments for Base Mini App detection
- ✅ `lib/minikit-wallet.ts` - Simplified for Base compatibility
- ✅ `next.config.js` - CSP headers allow all frame ancestors

## 📋 Required Setup

### Environment Variables

Add to your `.env.local`:

```env
# OnchainKit API Key (get from https://portal.cdp.coinbase.com/)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here

# Existing variables (keep these)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Get OnchainKit API Key:
1. Visit https://portal.cdp.coinbase.com/
2. Create a new project or select existing
3. Copy your API key
4. Add to `.env.local`

## 🔄 User Data & APIs

### Base Mini Apps Context

Base Mini Apps provide user data through the **MiniKit context** (similar to Farcaster):

```tsx
import { useMiniKit } from '@coinbase/onchainkit/minikit'

function YourComponent() {
  const { context } = useMiniKit()
  
  // Access user data
  const fid = context?.user?.fid
  const username = context?.user?.username
  const displayName = context?.user?.displayName
  const pfpUrl = context?.user?.pfpUrl
  
  // Access cast context
  const castId = context?.location?.cast?.hash
  const castType = context?.location?.type // 'cast_embed' | 'cast_share'
}
```

### Neynar Alternative

**Important:** Base Mini Apps don't have a separate API service like Neynar. Instead:

1. **User Data**: Comes from MiniKit context (shown above)
2. **Cast Data**: Available through context when launched from a cast
3. **Social Actions**: Your existing Neynar API calls **still work** for verifying likes/recasts/comments

**Recommendation**: Keep your existing Neynar integration for:
- ✅ Verifying user engagement (likes, recasts, comments)
- ✅ Fetching additional cast metadata
- ✅ Social graph features

The Neynar API works with Base Mini Apps since they're still interacting with the Farcaster protocol!

## 🎯 Cast ID Handling

Your claim page now detects cast IDs from:

1. **URL Parameters**: `?castId=0x...`
2. **Base Mini App Context**: Auto-detected when launched from a cast
3. **Pot Details**: Stored cast ID from pot creation

The detection logic works seamlessly in Base App!

## 🚀 Deployment

### Next Steps:

1. **Add environment variable**:
   ```bash
   # Add to your Vercel project
   NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key_here
   ```

2. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Migrate to Base Mini Apps"
   git push
   ```

3. **Test in Base App**:
   - Open your app URL in Base App
   - Test wallet connection
   - Test pot creation
   - Test claiming flow

## 📦 Package Changes

### Added:
- `@coinbase/onchainkit` (includes MiniKit)

### Removed (can be removed):
- `@farcaster/miniapp-sdk` (replaced by OnchainKit MiniKit)

To clean up:
```bash
npm uninstall @farcaster/miniapp-sdk
```

## 🔍 Key Differences: Farcaster vs Base Mini Apps

| Feature | Farcaster | Base Mini Apps |
|---------|-----------|----------------|
| **SDK** | `@farcaster/miniapp-sdk` | `@coinbase/onchainkit/minikit` |
| **Manifest** | `miniapp` object | `frame` object |
| **Wallet** | Manual provider setup | Built-in smart wallet + wagmi |
| **Context** | `sdk.context` | `useMiniKit().context` |
| **Detection** | Manual UA check | `useIsInMiniApp()` hook |
| **Transactions** | Custom provider | Standard wagmi |

## ✨ Benefits

1. **Simpler Wallet Integration**: Built-in smart wallet, no custom provider logic
2. **Better TypeScript Support**: OnchainKit has excellent types
3. **Unified Stack**: OnchainKit components work seamlessly
4. **Automatic Updates**: OnchainKit is actively maintained by Coinbase
5. **Cross-Platform**: Works in Base App, Farcaster clients, and web browsers

## 🐛 Troubleshooting

### Issue: "No context available"
**Solution**: Make sure MiniKitProvider wraps your app in `providers.tsx`

### Issue: "Wallet not connecting"
**Solution**: Base Mini Apps use the built-in smart wallet - make sure you're testing in Base App

### Issue: "Cast ID not detected"
**Solution**: Ensure your app is launched from a cast embed or pass `?castId=0x...` in URL

## 📚 Documentation

- [Base Mini Apps Docs](https://docs.base.org/mini-apps/overview)
- [OnchainKit Docs](https://onchainkit.xyz)
- [MiniKit Reference](https://onchainkit.xyz/minikit/introduction)

---

**Migration completed!** Your app is now ready for Base Mini Apps! 🎉

Test thoroughly in Base App before going live. The wallet connection, pot creation, and claiming features should all work seamlessly with the new integration.

