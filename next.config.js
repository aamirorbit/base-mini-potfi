/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://mainnet.base.org https://base.org https://explorer-api.walletconnect.com https://supercast.mypinata.cloud https://api.neynar.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org",
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz https://client.farcaster.xyz https://*.vercel.app https://world.org https://*.world.org https://worldcoin.org https://*.worldcoin.org https://wallet.coinbase.com https://*.coinbase.com https://go.cb-w.com https://*.cb-w.com",
              "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
