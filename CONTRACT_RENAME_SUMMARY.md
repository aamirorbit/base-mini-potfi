# Contract Rename Summary: JackPot → PotFi

## Overview
Successfully renamed the smart contract from `JackPot` to `PotFi` across the entire codebase, including all related files, configurations, and documentation.

## Changes Made

### 1. Smart Contract Files

#### ✅ Contract File
- **Renamed**: `hardhat-project/contracts/JackPot.sol` → `hardhat-project/contracts/PotFi.sol`
- **Updated**: Contract name from `contract JackPot` to `contract PotFi`
- **Updated**: Permit type hashes from `JackPotPermit` to `PotFiPermit`
- **Updated**: All comments referencing JackPot

#### ✅ ABI File
- **Renamed**: `abis/JackPot.json` → `abis/PotFi.json`
- Note: The ABI content is outdated and will need to be regenerated when you compile the new contract

### 2. Deployment & Testing Files

#### ✅ Test File
- **Renamed**: `hardhat-project/test/JackPot.test.js` → `hardhat-project/test/PotFi.test.js`
- **Updated**: All references from `JackPot` to `PotFi` in test code
- **Updated**: Variable names from `jackpot` to `potfi`

#### ✅ Deploy Scripts
- **Updated**: `scripts/deploy.ts`
  - Changed `JACKPOT_ABI` to `POTFI_ABI`
  - Changed `JACKPOT_BYTECODE` to `POTFI_BYTECODE`
  - Updated console messages and environment variable references
  - Changed `NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS` to `NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS`

- **Updated**: `hardhat-project/scripts/deploy.js`
  - Changed contract factory from `JackPot` to `PotFi`
  - Updated all variable names from `jackpot` to `potfi`
  - Updated console messages

### 3. Library Files

#### ✅ Contract Configuration (`lib/contracts.ts`)
- **Added**: `potfiAddress` as the primary export
- **Added**: `potfiAbi` as the primary ABI export
- **Maintained**: `jackpotAddress` and `jackpotAbi` as aliases for backward compatibility
- **Environment Variable**: Now uses `NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS`

#### ✅ Utility Functions (`lib/utils.ts`)
- **Updated**: Header comment from "JackPot application" to "PotFi application"
- **Updated**: Farcaster Account Association comment

### 4. Configuration Files

#### ✅ MiniKit Config (`minikit.config.ts`)
- **Updated**: Frame title from "JackPot - Decentralized Lottery" to "PotFi - Decentralized Prize Pots"
- **Updated**: Frame description
- **Updated**: Button labels
- **Added**: `potfi` contract configuration with `NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS`
- **Maintained**: `jackpot` alias for backward compatibility

### 5. Documentation

#### ✅ Main README (`README.md`)
- **Updated**: Title from "JackPot" to "PotFi"
- **Updated**: All references to "JackPot" changed to "PotFi" or "Prize Pot"
- **Updated**: Contract path reference
- **Updated**: Environment variable from `NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS` to `NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS`
- **Updated**: All UI button labels and frame descriptions

#### ✅ Hardhat README (`hardhat-project/README.md`)
- **Updated**: Title to "PotFi Contract - Hardhat Deployment"
- **Updated**: All references to the contract
- **Updated**: Project structure documentation

## Backward Compatibility

The following aliases have been maintained for backward compatibility:
- `jackpotAddress` → points to `potfiAddress`
- `jackpotAbi` → points to `potfiAbi`
- `jackpot` contract config in minikit.config.ts

This ensures existing code that references the old names will continue to work.

## Next Steps

### Required Actions:

1. **Compile the Contract**
   ```bash
   cd hardhat-project
   npm install
   npx hardhat compile
   ```

2. **Update ABI File**
   After compilation, copy the generated ABI from `hardhat-project/artifacts/contracts/PotFi.sol/PotFi.json` to update the ABI in `lib/contracts.ts`

3. **Update Environment Variables**
   Update your `.env.local` file:
   ```bash
   # Old (can keep for backward compatibility)
   NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...
   
   # New (primary)
   NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS=0x...
   ```

4. **Deploy New Contract** (if needed)
   ```bash
   cd hardhat-project
   npx hardhat run scripts/deploy.js --network base
   ```

5. **Verify Contract on BaseScan**
   ```bash
   npx hardhat verify --network base <CONTRACT_ADDRESS> "<FEE_TREASURY>" "<GATE_SIGNER>"
   ```

6. **Update Frontend References**
   - Check API routes for any hardcoded contract references
   - Update any components that directly reference the old contract name
   - Test all frame endpoints
   - Test all mini app functionality

### Optional Actions:

1. **Update Domain/Branding**
   - Consider updating the Vercel domain from "base-mini-app-jackpot" to something PotFi-related
   - Update Farcaster Account Association if domain changes
   - Update social media links and branding

2. **Remove Backward Compatibility** (after migration)
   Once all systems are using the new names, you can remove the backward compatibility aliases:
   - Remove `jackpotAddress` alias from `lib/contracts.ts`
   - Remove `jackpotAbi` alias from `lib/contracts.ts`
   - Remove `jackpot` config from `minikit.config.ts`
   - Update all remaining code to use `potfi` names

## Files Not Modified

The following files contain references to "JackPot" or "jackpot" that were NOT modified:
- Various markdown documentation files (CONTENT_STRATEGY.md, DEPLOYMENT_GUIDE.md, etc.)
- API route implementations (may need manual review)
- Component files (may need manual review)
- Frame route handlers (may need manual review)

These files may reference the old name in documentation, comments, or variable names. Review and update as needed based on your requirements.

## Summary

✅ Contract renamed from JackPot to PotFi
✅ All deployment scripts updated
✅ Test files updated
✅ Library configurations updated
✅ Backward compatibility maintained
✅ Documentation updated
✅ ABI file renamed (needs regeneration after compilation)

The core contract rename is complete. Follow the "Next Steps" section above to deploy and test the renamed contract.

