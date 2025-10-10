// MiniKit configuration for Farcaster integration
export default {
  // MiniKit configuration for Farcaster integration
  frame: {
    title: 'JackPot - Decentralized Lottery',
    description: 'A decentralized lottery system built on Base',
    image: '/og.png',
    buttons: [
      {
        label: 'Buy Ticket',
        action: 'post',
      },
      {
        label: 'View JackPot',
        action: 'link',
        target: 'https://base-mini-app-jackpot.vercel.app',
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
    jackpot: {
      address: process.env.NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS,
      abi: './abis/JackPot.json',
    },
  },
}
