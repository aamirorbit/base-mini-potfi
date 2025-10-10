/**
 * Test script using the WORKING method: Direct Blockchain Scanning
 * This is what the app actually uses now
 * 
 * Run: node test-blockchain-scan.js
 * Run with Alchemy: ALCHEMY_API_KEY=your_key node test-blockchain-scan.js
 */

const { createPublicClient, http, parseAbi } = require('viem');
const { base } = require('viem/chains');

// Configuration
const CONTRACT_ADDRESS = '0x5cE8e7db92493884CD5642F7828711FeCAF66656';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';

// Choose RPC endpoint
const rpcUrl = ALCHEMY_API_KEY 
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : 'https://mainnet.base.org';

console.log('🧪 Testing Direct Blockchain Scanning (Working Method)\n');
console.log('📡 RPC:', ALCHEMY_API_KEY ? 'Alchemy (Enhanced)' : 'Public Base RPC');
console.log('📍 Contract:', CONTRACT_ADDRESS);
console.log('');

// Create viem client
const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30000,
  })
});

// Define the PotCreated event ABI
const potfiAbi = parseAbi([
  'event PotCreated(bytes32 indexed id, address indexed creator, address token, uint256 amount, uint128 standardClaim)',
  'function pots(bytes32) view returns (address creator, address token, uint128 amount, uint128 claimedAmount, uint64 createdAt, uint32 claimed, uint32 timeoutSecs, uint128 standardClaim, bool active)',
  'function getRemainingFunds(bytes32) view returns (uint256)',
  'function getJackpotProbability(bytes32) view returns (uint256)'
]);

async function testBlockchainScan() {
  try {
    console.log('⏳ Step 1: Getting latest block number...\n');
    const latestBlock = await publicClient.getBlockNumber();
    console.log('✅ Latest block:', latestBlock.toString());
    
    // Scan last 1M blocks (~23 days on Base)
    const fromBlock = latestBlock > BigInt(1_000_000) 
      ? latestBlock - BigInt(1_000_000) 
      : BigInt(0);
    
    const blocksToScan = Number(latestBlock - fromBlock);
    console.log('📊 Scanning blocks:', fromBlock.toString(), 'to', latestBlock.toString());
    console.log('📏 Total blocks:', blocksToScan.toLocaleString(), '(~23 days)');
    console.log('');

    console.log('⏳ Step 2: Fetching PotCreated events...\n');
    const startTime = Date.now();
    
    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'PotCreated',
        inputs: [
          { name: 'id', type: 'bytes32', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'standardClaim', type: 'uint128' }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Query completed in:', duration, 'ms');
    console.log('📦 Found events:', logs.length);
    console.log('');

    if (logs.length === 0) {
      console.log('ℹ️  No pots found in the scanned range.');
      console.log('');
      console.log('💡 This means:');
      console.log('  - Contract may not have any pots created yet, OR');
      console.log('  - All pots were created more than 23 days ago');
      console.log('');
      console.log('✅ But the method WORKS! It successfully queried the blockchain.');
      return;
    }

    console.log('🎉 SUCCESS! Found', logs.length, 'pot(s)\n');
    console.log('═'.repeat(80));

    // Display details for each pot
    for (let i = 0; i < Math.min(logs.length, 5); i++) {
      const log = logs[i];
      console.log(`\n📦 Pot ${i + 1}/${logs.length}:`);
      console.log('─'.repeat(80));
      
      const potId = log.args.id;
      const creator = log.args.creator;
      const token = log.args.token;
      const amount = log.args.amount;
      const standardClaim = log.args.standardClaim;
      
      console.log('🆔 Pot ID:', potId);
      console.log('👤 Creator:', creator);
      console.log('🪙 Token:', token);
      console.log('💰 Amount:', Number(amount) / 1e6, 'USDC');
      console.log('💵 Standard Claim:', Number(standardClaim) / 1e6, 'USDC');
      console.log('📦 Block:', log.blockNumber.toString());
      console.log('🔗 TX:', log.transactionHash);
      
      // Try to get detailed pot info
      try {
        console.log('\n⏳ Fetching detailed pot info...');
        
        const potData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: potfiAbi,
          functionName: 'pots',
          args: [potId]
        });
        
        const [creator, token, totalAmount, claimedAmount, createdAt, claimed, timeoutSecs, standardClaim, active] = potData;
        
        const remainingFunds = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: potfiAbi,
          functionName: 'getRemainingFunds',
          args: [potId]
        });
        
        const jackpotProb = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: potfiAbi,
          functionName: 'getJackpotProbability',
          args: [potId]
        });
        
        console.log('✅ Detailed Info:');
        console.log('  Status:', active ? '🟢 Active' : '🔴 Inactive');
        console.log('  Created:', new Date(Number(createdAt) * 1000).toLocaleString());
        console.log('  Total Amount:', Number(totalAmount) / 1e6, 'USDC');
        console.log('  Claimed Amount:', Number(claimedAmount) / 1e6, 'USDC');
        console.log('  Remaining:', Number(remainingFunds) / 1e6, 'USDC');
        console.log('  Claims Made:', claimed);
        console.log('  Timeout:', timeoutSecs, 'seconds');
        console.log('  Jackpot Chance:', Number(jackpotProb) / 100, '%');
        
      } catch (error) {
        console.log('⚠️  Could not fetch detailed info:', error.message);
      }
    }

    if (logs.length > 5) {
      console.log('\n... and', logs.length - 5, 'more pots');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Test Summary:');
    console.log('  Method: Direct Blockchain Scanning');
    console.log('  Status: ✅ WORKING');
    console.log('  Speed:', duration, 'ms');
    console.log('  Blocks Scanned:', blocksToScan.toLocaleString());
    console.log('  Events Found:', logs.length);
    console.log('  RPC Used:', ALCHEMY_API_KEY ? 'Alchemy' : 'Public Base RPC');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Check your internet connection');
    console.log('  2. Try with Alchemy API key: ALCHEMY_API_KEY=your_key node test-blockchain-scan.js');
    console.log('  3. Public RPC might be rate limited, try again in a minute');
  }
}

// Run the test
console.log('⏳ Starting test...\n');
testBlockchainScan()
  .then(() => {
    console.log('\n✨ Test complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

