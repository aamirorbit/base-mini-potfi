// Deployment script for JackPot contract
// This script deploys the JackPot contract to Base mainnet

import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const PRIVATE_KEY = process.env.PRIVATE_KEY!
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL!

// You'll need to compile the contract first and get the ABI/bytecode
// For now, this is a placeholder - you'll need to use a tool like Hardhat or Foundry
const JACKPOT_ABI: any[] = [] // Add compiled ABI here
const JACKPOT_BYTECODE = '0x' // Add compiled bytecode here

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL)
})

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(RPC_URL)
})

async function deploy() {
  console.log('Deploying JackPot contract...')
  
  // You need to provide the fee treasury and gate signer addresses
  const FEE_TREASURY = process.env.FEE_TREASURY_ADDRESS!
  const GATE_SIGNER = process.env.GATE_SIGNER_ADDRESS!
  
  const hash = await walletClient.deployContract({
    abi: JACKPOT_ABI,
    bytecode: JACKPOT_BYTECODE,
    args: [FEE_TREASURY, GATE_SIGNER]
  })
  
  console.log('Transaction hash:', hash)
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const contractAddress = receipt.contractAddress!
  console.log('Contract deployed at:', contractAddress)
  console.log('Set NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS in your .env.local file')

  // Optionally set USDC address to enable USDC bounds enforcement
  const usdc = process.env.USDC_ADDRESS
  if (usdc) {
    console.log('Setting USDC address on contract to', usdc)
    // @ts-ignore placeholder ABI
    await walletClient.writeContract({
      // These fields require the actual compiled ABI that includes setUsdcToken
      abi: JACKPOT_ABI,
      address: contractAddress,
      functionName: 'setUsdcToken',
      args: [usdc]
    })
    console.log('USDC set successfully')
  } else {
    console.log('USDC_ADDRESS not provided; skipping setUsdcToken')
  }
}

deploy().catch(console.error)
