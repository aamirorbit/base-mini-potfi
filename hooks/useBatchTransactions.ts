/**
 * Batch Transactions Hook for Base Accounts
 * Enables atomic batch transactions using EIP-5792
 */

import { useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { encodeFunctionData, type Abi, type Address } from 'viem'

export interface BatchCall {
  address: Address
  abi: readonly any[] | Abi
  functionName: string
  args?: readonly any[] | any[]
  value?: bigint
}

export interface UseBatchTransactionsReturn {
  writeBatch: (calls: BatchCall[], capabilities?: any) => Promise<`0x${string}` | undefined>
  isLoading: boolean
  error: Error | null
  txHash: `0x${string}` | undefined
}

/**
 * Hook for executing batch transactions
 * Falls back to sequential transactions if batch is not supported
 */
export function useBatchTransactions(): UseBatchTransactionsReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const writeBatch = async (
    calls: BatchCall[],
    capabilities?: any
  ): Promise<`0x${string}` | undefined> => {
    setIsLoading(true)
    setError(null)
    setTxHash(undefined)

    try {
      if (!walletClient) {
        throw new Error('Wallet not connected')
      }

      // Try to use wallet_sendCalls for atomic batch (EIP-5792)
      try {
        const callsFormatted = calls.map(call => ({
          to: call.address,
          data: encodeFunctionData({
            abi: call.abi,
            functionName: call.functionName,
            args: call.args || []
          }),
          value: call.value ? `0x${call.value.toString(16)}` : undefined
        }))

        console.log('Attempting batch transaction with wallet_sendCalls:', callsFormatted)

        const batchTxId = await walletClient.request({
          method: 'wallet_sendCalls',
          params: [
            {
              version: '1.0',
              chainId: `0x${walletClient.chain.id.toString(16)}`,
              from: walletClient.account.address,
              calls: callsFormatted,
              capabilities: capabilities || {}
            }
          ]
        } as any)

        console.log('✅ Batch transaction submitted:', batchTxId)
        setTxHash(batchTxId as `0x${string}`)
        setIsLoading(false)
        return batchTxId as `0x${string}`
      } catch (batchError: any) {
        console.log('Batch not supported, falling back to sequential transactions:', batchError.message)
        
        // Fallback: Execute transactions sequentially
        console.log('Executing transactions sequentially...')
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i]
          console.log(`Executing transaction ${i + 1}/${calls.length}...`)
          
          const hash = await walletClient.writeContract({
            address: call.address,
            abi: call.abi,
            functionName: call.functionName,
            args: call.args || [],
            value: call.value
          })

          console.log(`Transaction ${i + 1} hash:`, hash)

          // Wait for confirmation before proceeding to next transaction
          if (publicClient && i < calls.length - 1) {
            console.log(`Waiting for transaction ${i + 1} to confirm...`)
            await publicClient.waitForTransactionReceipt({ hash })
          }

          // Return the last transaction hash
          if (i === calls.length - 1) {
            setTxHash(hash)
            setIsLoading(false)
            return hash
          }
        }
      }
    } catch (err: any) {
      console.error('Batch transaction error:', err)
      setError(err)
      setIsLoading(false)
      throw err
    }

    return undefined
  }

  return {
    writeBatch,
    isLoading,
    error,
    txHash
  }
}

