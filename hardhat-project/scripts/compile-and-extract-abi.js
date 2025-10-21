import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔨 Compiling contracts...');
  
  try {
    // Compile the contracts
    execSync('npx hardhat compile', { stdio: 'inherit' });
    console.log('✅ Contracts compiled successfully!\n');
    
    // Read the compiled artifact
    const artifactPath = path.join(__dirname, '../artifacts/contracts/PotFi.sol/PotFi.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Extract just the ABI
    const abi = artifact.abi;
    
    // Save ABI to the frontend directory
    const abiPath = path.join(__dirname, '../../abis/PotFi.json');
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log('✅ ABI extracted to abis/PotFi.json');
    
    // Print summary of changes
    console.log('\n📋 ABI Summary:');
    console.log(`Total items: ${abi.length}`);
    
    const functions = abi.filter(item => item.type === 'function');
    const events = abi.filter(item => item.type === 'event');
    
    console.log(`Functions: ${functions.length}`);
    console.log(`Events: ${events.length}`);
    
    // Check for new functions
    const hasCreatePotWithSalt = functions.some(f => f.name === 'createPotWithSalt');
    const hasPotClosed = events.some(e => e.name === 'PotClosed');
    
    console.log('\n🆕 New features detected:');
    console.log(`- createPotWithSalt function: ${hasCreatePotWithSalt ? '✅ Yes' : '❌ No'}`);
    console.log(`- PotClosed event: ${hasPotClosed ? '✅ Yes' : '❌ No'}`);
    
    // Check claim function parameters
    const claimFunction = functions.find(f => f.name === 'claim');
    if (claimFunction) {
      console.log(`- claim function parameters: ${claimFunction.inputs.length}`);
      const hasUserSecret = claimFunction.inputs.some(i => i.name === 'userSecret');
      console.log(`- claim has userSecret parameter: ${hasUserSecret ? '✅ Yes' : '❌ No'}`);
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Deploy the contract using: npx hardhat run scripts/deploy.js --network base');
    console.log('2. Update NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS in .env.local');
    console.log('3. Update lib/contracts.ts with the new ABI from abis/PotFi.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
