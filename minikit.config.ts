// MiniKit configuration for Farcaster integration
export default {
  // MiniKit configuration for Farcaster integration
  frame: {
    title: 'PotFi - Decentralized Prize Pots',
    description: 'A decentralized prize pot system built on Base',
    image: '/og.png',
    buttons: [
      {
        label: 'Create Pot',
        action: 'post',
      },
      {
        label: 'View PotFi',
        action: 'link',
        target: 'https://base-mini-potfi.vercel.app',
      },
    ],
  },
  // Base chain configuration
  chain: {
    id: 8453, // Base mainnet
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  },
  // Contract configuration
  contracts: {
    potfi: {
      address: process.env.NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS,
      abi: './abis/PotFi.json',
    },
    // Legacy alias for backward compatibility
    jackpot: {
      address: process.env.NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS,
      abi: './abis/PotFi.json',
    },
  },
}
