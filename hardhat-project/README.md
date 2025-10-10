# JackPot Contract - Hardhat Deployment

This is a Hardhat project for deploying and verifying the JackPot contract on Base network.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configuration

#### Create Environment File
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

#### Configure Your Environment Variables

Edit the `.env` file with your values:

```env
# Required: Your deployer private key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Required for verification: Get from https://basescan.org/apis
BASESCAN_API_KEY=your_basescan_api_key_here
```

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to version control
- Keep your private key secure
- The private key should NOT include the `0x` prefix

### 3. Get BaseScan API Key

1. Go to [https://basescan.org/apis](https://basescan.org/apis)
2. Create an account
3. Generate an API key
4. Add it to your `.env` file

## 🛠️ Usage

### Compile Contract
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy to Base Sepolia (Testnet)
```bash
npm run deploy-testnet
```

### Deploy to Base Mainnet
```bash
npm run deploy
```

### Verify Contract
After deployment, verify using:
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> "<FEE_TREASURY_ADDRESS>" "<GATE_SIGNER_ADDRESS>"
```

Or use the verification script:
```bash
node scripts/verify-contract.js <CONTRACT_ADDRESS> <FEE_TREASURY_ADDRESS> <GATE_SIGNER_ADDRESS>
```

## 📋 Network Configuration

The project is configured for:

### Base Mainnet
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org

### Base Sepolia (Testnet)
- **Chain ID**: 84532  
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## 🏗️ Contract Constructor Parameters

The JackPot contract requires two constructor parameters:

1. **feeTreasury** (address): Where fees are sent (2.5% per claim)
2. **gateSigner** (address): Backend signer for claim permits

By default, both are set to the deployer address. You can change them after deployment using:
- `setFeeTreasury(address)` - ⚠️ This function doesn't exist in the contract
- `setGateSigner(address)` - Owner only

## 📁 Project Structure

```
hardhat-project/
├── contracts/
│   └── JackPot.sol           # Main contract
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── verify-contract.js    # Verification script
├── test/
│   └── JackPot.test.js       # Basic tests
├── hardhat.config.cjs        # Hardhat configuration
├── package.json              # Dependencies and scripts
└── .env.example              # Environment template
```

## 🔍 Example Deployment Flow

1. **Get testnet ETH**: Use Base Sepolia faucet
2. **Deploy to testnet first**:
   ```bash
   npm run deploy-testnet
   ```
3. **Verify on testnet**:
   ```bash
   npx hardhat verify --network base-sepolia <ADDRESS> "<FEE_TREASURY>" "<GATE_SIGNER>"
   ```
4. **Deploy to mainnet**:
   ```bash
   npm run deploy
   ```
5. **Verify on mainnet**:
   ```bash
   npx hardhat verify --network base <ADDRESS> "<FEE_TREASURY>" "<GATE_SIGNER>"
   ```

## 🛡️ Security Notes

- Keep your private key secure and never share it
- Test thoroughly on testnet before mainnet deployment
- Consider using a hardware wallet for mainnet deployments
- The contract includes ReentrancyGuard and proper access controls

## 📞 Support

If you encounter issues:
1. Check the Hardhat documentation
2. Verify your environment variables are correct
3. Ensure you have sufficient ETH for gas fees
4. Check Base network status

## 🚨 Important Contract Features

- **Fee Structure**: 2.5% fee per claim
- **Max Winners**: 200 per pot
- **Cooldown**: 30 seconds between claims (configurable)
- **USDC Bounds**: 1 USDC min, 100k USDC max (when USDC token is set)
- **Timeouts**: Creator can sweep unclaimed funds after timeout
