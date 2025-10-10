# PotFi - Farcaster Frame Implementation

**Social tips with a jackpot twist. Deposit USDC, first N claim randomized splits on Base.**

## 🎯 **Pure Farcaster Frame Approach**

This implementation provides a **pure frame-based experience** where creators can set up Prize Pots directly within Farcaster frames - no separate app needed!

### **✅ What This Achieves:**
- **True "strap on" functionality** - Add PotFi to any Farcaster post
- **Native Farcaster experience** - Users never leave Farcaster
- **Simplified architecture** - No mini app complexity
- **Viral engagement** - Posts get boosted with Prize Pot capability

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- npm or yarn
- Base network access
- USDC on Base
- Neynar API key

### Installation
```bash
npm install
npm run dev
```

## 🏗️ **Architecture**

### **Frame Endpoints** (New!)
- `/api/frame` - Main frame entry point
- `/api/frame/create` - Create Prize Pot flow
- `/api/frame/claim` - Claim Prize Pot flow
- `/api/frame/image` - Dynamic frame images

### **Smart Contract** (`hardhat-project/contracts/PotFi.sol`)
- **USDC-based lottery system** on Base
- **Multiple winners** with randomized splits
- **2.5% fee** per claim (charged to claimant)
- **Timeout mechanism** for unclaimed funds
- **Permit system** for engagement verification

### **Frontend** (`app/`)
- **Next.js 14** with App Router
- **Wagmi** for Web3 integration
- **Tailwind CSS** for styling
- **Farcaster integration** via Neynar API
- **Frame support** for native Farcaster experience

## 🎮 **User Experience**

### **Creator Flow:**
```
1. Creator posts normally on Farcaster
2. Creator adds PotFi frame to their post
3. Creator sets up pot directly in the frame
4. Post gets Prize Pot capability instantly
```

### **User Flow:**
```
1. User sees post with PotFi frame
2. User engages (Like + Comment + Recast)
3. User claims directly in the frame
4. User receives randomized USDC share
```

## 🔧 **Environment Setup**

Create `.env.local`:

```bash
# Base Network
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS=0x...

# USDC on Base
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Neynar API (Farcaster integration)
NEYNAR_API_KEY=your_neynar_api_key

# Gate Signer (for permit generation)
GATE_SIGNER_PK=your_private_key
FEE_TREASURY_ADDRESS=0x...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# App Domain (for frames)
NEXT_PUBLIC_APP_DOMAIN=https://yourdomain.com
```

## 🚀 **Deployment**

### 1. Deploy Smart Contract
```bash
npm run deploy
```

### 2. Deploy Frontend
```bash
npm run build
npm run start
```

### 3. Update Farcaster Manifest
Update `public/.well-known/farcaster.json` with your domain.

### 4. Test Frames
- Test frame functionality on Base App
- Verify engagement verification works
- Test claim flow end-to-end

## 📱 **Frame Implementation**

### **Frame Structure**
```html
<!-- Main Frame -->
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="..." />
<meta property="fc:frame:button:1" content="Create Prize Pot" />
<meta property="fc:frame:button:2" content="Claim Prize Pot" />
```

### **Frame Flows**
1. **Create Flow**: Input amount/winners → Create pot → Success
2. **Claim Flow**: Verify engagement → Claim → Receive reward
3. **Image Generation**: Dynamic images based on state

## 🔒 **Security Features**

- **Reentrancy protection** - Prevents double-claiming
- **Access control** - Only creator can sweep unclaimed funds
- **Input validation** - Bounds checking on all parameters
- **Engagement verification** - Must like + comment + recast
- **Timeout mechanism** - Prevents indefinite locking
- **Frame validation** - Secure frame interactions

## 🎯 **Smart Contract Specification**

### Core Functions
- `createPot(token, amount, winners, timeout, minClaim)` - Create new pot
- `claim(id, deadline, castId, signature)` - Claim with permit
- `sweep(id)` - Creator recovers unclaimed funds
- `getPot(id)` - View pot details

### Events
- `PotCreated(id, creator, token, amount, winners)`
- `Claimed(id, claimer, amount, slot)`
- `Swept(id, creator, remaining)`

### Bounds
- **Winners**: 1-200
- **Amount**: 1 USDC minimum
- **Timeout**: 1 hour minimum
- **Min claim**: 0.01 USDC

## 🔌 **API Endpoints**

### **Frame Endpoints**
- `/api/frame` - Main frame entry point
- `/api/frame/create` - Create Prize Pot flow
- `/api/frame/claim` - Claim Prize Pot flow
- `/api/frame/image` - Dynamic frame images

### **Gate Endpoints**
- `/api/gate/permit` - Generate signed permit for claiming
- **Requirements**: Like + Comment + Recast verification
- **Returns**: `{deadline, castId, signature}`

## 🎨 **Frontend Components**

### **Pages**
- `/` - Home page with wallet connection
- `/create` - Create new Prize Pot (legacy)
- `/p/[id]` - Claim specific Prize Pot (legacy)

### **Frames** (New!)
- **Create Frame** - Set up Prize Pot in frame
- **Claim Frame** - Claim Prize Pot in frame
- **Success Frame** - Show results

## 🚀 **Base Mini Apps Guide Integration**

This project follows the [Base Mini Apps Guide](https://paragraph.com/@cryptso/mini-apps-guide) recommendations:

### ✅ **Implemented Features**
- **Farcaster integration** via Neynar API
- **Frame support** for native Farcaster experience
- **Base network** deployment
- **USDC integration** for payments
- **Social engagement** verification
- **Pure frame implementation** - No mini app needed

### 🔄 **Potential Enhancements**
- **OnchainKit integration** for enhanced Base experience
- **Frame metadata** optimization
- **Social features** enhancement
- **Frame analytics** and tracking

## 📊 **Production Checklist**

- [ ] Deploy smart contract to Base mainnet
- [ ] Set up production environment variables
- [ ] Configure domain and SSL
- [ ] Test frame functionality on Base App
- [ ] Verify engagement verification works
- [ ] Test claim flow end-to-end
- [ ] Set up monitoring and logging
- [ ] Configure backup systems

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support**

For issues and questions:
- Check the documentation
- Review the smart contract code
- Test with small amounts first
- Verify environment setup
- Test frames on Base App

---

**Built for Base • Powered by Farcaster • Secured by Smart Contracts • Native Frame Experience**