# JackPot Frame - Production Setup Checklist

## 🚀 **What You Need to Complete Before Deployment**

### **✅ 1. Environment Variables Setup**

Create `.env.local` file with these variables:

```bash
# =============================================================================
# BASE NETWORK CONFIGURATION
# =============================================================================
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_CHAIN_ID=8453

# =============================================================================
# SMART CONTRACT ADDRESSES (SET AFTER DEPLOYMENT)
# =============================================================================
NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...  # Set after contract deployment
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# =============================================================================
# APP CONFIGURATION
# =============================================================================
NEXT_PUBLIC_APP_DOMAIN=https://yourdomain.com  # Your deployed domain

# =============================================================================
# FARCaster INTEGRATION
# =============================================================================
NEYNAR_API_KEY=your_neynar_api_key_here  # Get from https://neynar.com/

# =============================================================================
# WALLET CONNECT
# =============================================================================
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id  # Get from https://cloud.walletconnect.com/

# =============================================================================
# BACKEND SECRETS (NEVER EXPOSE TO CLIENT)
# =============================================================================
GATE_SIGNER_PK=0x...  # Generate new wallet for permit signing
FEE_TREASURY_ADDRESS=0x77757E4Bc90b20AD1751fEd298159dC01d78Fda3

# =============================================================================
# DEPLOYMENT (OPTIONAL)
# =============================================================================
PRIVATE_KEY=0x...  # Wallet for contract deployment
```

### **✅ 2. Required API Keys & Services**

#### **Neynar API Key (Required)**
- **What**: Farcaster integration for engagement verification
- **Where**: https://neynar.com/
- **Why**: Verify Like + Comment + Recast requirements
- **Cost**: Free tier available

#### **WalletConnect Project ID (Required)**
- **What**: Wallet connection service
- **Where**: https://cloud.walletconnect.com/
- **Why**: Enable wallet connections in frames
- **Cost**: Free

#### **Domain & Hosting (Required)**
- **What**: Your domain for the app
- **Where**: Any hosting platform (Vercel, Netlify, Railway, etc.)
- **Why**: Frames need a public domain
- **Cost**: Varies by provider

### **✅ 3. Smart Contract Deployment**

#### **Deploy to Base Mainnet**
```bash
# 1. Set up your deployment wallet
export PRIVATE_KEY=0x...

# 2. Deploy the contract
npm run deploy

# 3. Update environment variable
NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...  # Use deployed address
```

#### **Contract Constructor Parameters**
- `_feeTreasury`: Your treasury address for fees
- `_gateSigner`: Address derived from `GATE_SIGNER_PK`

### **✅ 4. Farcaster Integration**

#### **Update Farcaster Manifest**
Edit `public/.well-known/farcaster.json`:
```json
{
  "name": "JackPot",
  "description": "Social tips with a jackpot twist. Deposit USDC, first N claim randomized splits on Base.",
  "url": "https://yourdomain.com",
  "icon": "https://yourdomain.com/icon.png",
  "ogImage": "https://yourdomain.com/og.png",
  "primaryCategory": "Games",
  "tags": ["USDC","tips","random","giveaway","onchain"],
  "frame": {
    "image": "https://yourdomain.com/api/frame/image?action=start",
    "buttons": [
      {
        "label": "Create JackPot",
        "action": "post",
        "target": "https://yourdomain.com/api/frame/create"
      },
      {
        "label": "Claim JackPot", 
        "action": "post",
        "target": "https://yourdomain.com/api/frame/claim"
      }
    ]
  }
}
```

### **✅ 5. Testing Requirements**

#### **Test on Base App**
- Deploy your app to a public domain
- Test frame functionality on Base App
- Verify engagement verification works
- Test claim flow end-to-end

#### **Test Frame Endpoints**
- `/api/frame` - Main frame entry point
- `/api/frame/create` - Create JackPot flow
- `/api/frame/claim` - Claim JackPot flow
- `/api/frame/image` - Dynamic frame images

### **✅ 6. Security Considerations**

#### **Private Keys**
- **GATE_SIGNER_PK**: Generate a new wallet for permit signing
- **PRIVATE_KEY**: Use a separate wallet for deployment
- **Never expose private keys to client-side code**

#### **Environment Variables**
- Set all variables in your hosting platform
- Use secure environment variable storage
- Never commit `.env.local` to version control

### **✅ 7. Deployment Steps**

#### **Step 1: Deploy Smart Contract**
```bash
# Set deployment wallet
export PRIVATE_KEY=0x...

# Deploy to Base mainnet
npm run deploy

# Verify contract (optional)
npm run verify <contract_address>
```

#### **Step 2: Set Environment Variables**
- Create `.env.local` with all required variables
- Set `NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS` to deployed address
- Set `NEXT_PUBLIC_APP_DOMAIN` to your domain

#### **Step 3: Deploy Frontend**
```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, Railway, etc.)
```

#### **Step 4: Update Farcaster Manifest**
- Update `public/.well-known/farcaster.json` with your domain
- Ensure manifest is accessible at `https://yourdomain.com/.well-known/farcaster.json`

#### **Step 5: Test Everything**
- Test frames on Base App
- Verify engagement verification
- Test claim flow end-to-end
- Monitor for errors

## 🎯 **Current Status**

### **✅ Ready to Deploy**
- ✅ Smart contract code complete
- ✅ Frame implementation complete
- ✅ Build successful (no errors)
- ✅ Documentation complete
- ✅ Specification updated

### **🔄 Still Needed**
- ❌ Environment variables setup
- ❌ API keys (Neynar, WalletConnect)
- ❌ Domain and hosting
- ❌ Smart contract deployment
- ❌ Farcaster manifest update
- ❌ Testing on Base App

## 🚀 **Next Steps**

1. **Get API Keys**: Sign up for Neynar and WalletConnect
2. **Set up Domain**: Choose hosting platform and get domain
3. **Deploy Contract**: Deploy to Base mainnet
4. **Set Environment**: Create `.env.local` with all variables
5. **Deploy Frontend**: Deploy to your hosting platform
6. **Update Manifest**: Update Farcaster manifest with your domain
7. **Test Everything**: Test frames on Base App

## 🆘 **Support**

If you need help with any of these steps:
1. Check the deployment guide
2. Review the environment template
3. Test with small amounts first
4. Verify all environment variables are set

---

**You're almost ready to deploy! Just need to set up the environment variables and API keys. 🚀**
