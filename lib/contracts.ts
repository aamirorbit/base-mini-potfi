// Contract addresses and ABIs
export const jackpotAddress = process.env.NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS as `0x${string}`
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
export const USDC_CONTRACT_ADDRESS = USDC // Alias for compatibility
export const ONE_USDC = BigInt(1_000_000) // 1 USDC (6 decimals)

export const jackpotAbi = [
  {
    "inputs": [
      {"internalType": "address", "name": "_feeTreasury", "type": "address"},
      {"internalType": "address", "name": "_gateSigner", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint32", "name": "winners", "type": "uint32"}
    ],
    "name": "PotCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"indexed": false, "internalType": "uint32", "name": "slot", "type": "uint32"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "net", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256"}
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "bytes32", "name": "castId", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint128", "name": "amount", "type": "uint128"},
      {"internalType": "uint32", "name": "winners", "type": "uint32"},
      {"internalType": "uint32", "name": "timeoutSecs", "type": "uint32"},
      {"internalType": "uint128", "name": "minPerWinner", "type": "uint128"}
    ],
    "name": "createPot",
    "outputs": [{"internalType": "bytes32", "name": "id", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "id", "type": "bytes32"}],
    "name": "sweep",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const usdcAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
