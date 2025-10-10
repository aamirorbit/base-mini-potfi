import { NextRequest, NextResponse } from 'next/server'
import { jackpotAddress } from '@/lib/contracts'

const alchemyApiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const potId = params.id

  if (!alchemyApiKey) {
    return NextResponse.json(
      { error: 'Alchemy API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Get all USDC transfers TO the contract (deposits/pot creations)
    const depositsResponse = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            contractAddresses: [USDC_ADDRESS],
            toAddress: jackpotAddress,
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x3e8' // 1000 max
          }]
        })
      }
    )

    // Get all USDC transfers FROM the contract (claims/payouts)
    const claimsResponse = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            contractAddresses: [USDC_ADDRESS],
            fromAddress: jackpotAddress,
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x3e8'
          }]
        })
      }
    )

    const depositsData = await depositsResponse.json()
    const claimsData = await claimsResponse.json()

    if (depositsData.error || claimsData.error) {
      throw new Error(depositsData.error?.message || claimsData.error?.message || 'Failed to fetch transfers')
    }

    // Transform to readable format
    const deposits = (depositsData.result?.transfers || []).map((t: any) => ({
      type: 'deposit',
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value || 0,
      valueUSDC: parseFloat(t.value || '0'),
      blockNum: parseInt(t.blockNum, 16),
      timestamp: t.metadata?.blockTimestamp || null,
      asset: t.asset
    }))

    const claims = (claimsData.result?.transfers || []).map((t: any) => ({
      type: 'claim',
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value || 0,
      valueUSDC: parseFloat(t.value || '0'),
      blockNum: parseInt(t.blockNum, 16),
      timestamp: t.metadata?.blockTimestamp || null,
      asset: t.asset
    }))

    // Combine and sort by block number (most recent first)
    const allTransactions = [...deposits, ...claims].sort((a, b) => b.blockNum - a.blockNum)

    // Calculate statistics
    const stats = {
      totalDeposits: deposits.reduce((sum: number, t: any) => sum + t.valueUSDC, 0),
      totalClaims: claims.reduce((sum: number, t: any) => sum + t.valueUSDC, 0),
      depositCount: deposits.length,
      claimCount: claims.length,
      netBalance: deposits.reduce((sum: number, t: any) => sum + t.valueUSDC, 0) - 
                   claims.reduce((sum: number, t: any) => sum + t.valueUSDC, 0)
    }

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      deposits,
      claims,
      stats
    })

  } catch (error) {
    console.error('Transaction history fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch transaction history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

