/**
 * Test script to debug BaseScan API issues
 * Run: node test-basescan.js
 * 
 * Note: Etherscan API v2 works across all chains!
 * You can use your Etherscan API key for Base network via api.basescan.org
 */

// Configuration
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || 
                         process.env.ETHERSCAN_API_KEY || ''; // Add your key here
const CONTRACT_ADDRESS = '0x5cE8e7db92493884CD5642F7828711FeCAF66656';
const POT_CREATED_TOPIC = '0xedbc7e1f4902e524d9cab0ffcc13f86772988eae02f52b3a34acaa7681b58fc4';

console.log('🧪 Testing BaseScan API...\n');

// Test 1: Basic API call
async function testBaseScan() {
  const url = new URL('https://api.basescan.org/api');
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('address', CONTRACT_ADDRESS);
  url.searchParams.set('topic0', POT_CREATED_TOPIC);
  url.searchParams.set('fromBlock', '0');
  url.searchParams.set('toBlock', 'latest');
  
  if (BASESCAN_API_KEY) {
    url.searchParams.set('apikey', BASESCAN_API_KEY);
    console.log('✅ Using API key:', BASESCAN_API_KEY.slice(0, 8) + '...');
  } else {
    console.log('⚠️  No API key provided (using public rate limit)');
  }
  
  console.log('\n📡 Request URL:');
  console.log(url.toString().replace(BASESCAN_API_KEY, 'YOUR_KEY'));
  
  console.log('\n⏳ Fetching...\n');
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('📊 Response:');
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    
    if (data.result) {
      if (Array.isArray(data.result)) {
        console.log('Results:', data.result.length, 'logs found');
        
        if (data.result.length > 0) {
          console.log('\n✅ Sample log:');
          console.log(JSON.stringify(data.result[0], null, 2));
        }
      } else {
        console.log('Result:', data.result);
      }
    }
    
    console.log('\n📋 Full response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Analyze the response
    console.log('\n🔍 Analysis:');
    if (data.status === '1') {
      console.log('✅ SUCCESS - API call worked!');
    } else if (data.status === '0' && data.message === 'No records found') {
      console.log('ℹ️  No records found (contract has no events yet)');
    } else {
      console.log('❌ ERROR - API call failed');
      console.log('This might mean:');
      console.log('  1. Invalid API key');
      console.log('  2. Rate limit exceeded');
      console.log('  3. Invalid contract address');
      console.log('  4. BaseScan API issue');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 2: Check if contract exists
async function testContractExists() {
  console.log('\n\n🔍 Testing if contract exists...\n');
  
  const url = new URL('https://api.basescan.org/api');
  url.searchParams.set('module', 'contract');
  url.searchParams.set('action', 'getabi');
  url.searchParams.set('address', CONTRACT_ADDRESS);
  
  if (BASESCAN_API_KEY) {
    url.searchParams.set('apikey', BASESCAN_API_KEY);
  }
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('Contract verification status:', data.status);
    console.log('Message:', data.message);
    
    if (data.status === '1') {
      console.log('✅ Contract is verified on BaseScan');
    } else {
      console.log('⚠️  Contract might not be verified');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 3: Check account balance (as a simple connectivity test)
async function testConnectivity() {
  console.log('\n\n🌐 Testing BaseScan API connectivity...\n');
  
  const url = new URL('https://api.basescan.org/api');
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'balance');
  url.searchParams.set('address', CONTRACT_ADDRESS);
  url.searchParams.set('tag', 'latest');
  
  if (BASESCAN_API_KEY) {
    url.searchParams.set('apikey', BASESCAN_API_KEY);
  }
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('API Status:', data.status);
    console.log('Message:', data.message);
    
    if (data.status === '1') {
      const balance = BigInt(data.result) / BigInt(1e18);
      console.log('✅ API is working! Contract balance:', balance.toString(), 'ETH');
    } else {
      console.log('❌ API error:', data.message);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testConnectivity();
  await testContractExists();
  await testBaseScan();
  
  console.log('\n\n✨ Tests complete!\n');
  console.log('💡 Tips:');
  console.log('  - If you see "NOTOK", check your API key');
  console.log('  - Get a free API key at: https://etherscan.io/myapikey (works for Base!)');
  console.log('  - Set it with: ETHERSCAN_API_KEY=your_key node test-basescan.js');
  console.log('  - Or add to .env.local: ETHERSCAN_API_KEY=your_key');
  console.log('  - Etherscan API v2 works across ALL chains (Ethereum, Base, Arbitrum, etc.)');
}

runTests().catch(console.error);

