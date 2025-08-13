import { createConfig, http } from 'wagmi'
import { base, mainnet, arbitrum } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Get API keys from environment
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r';

// Only include WalletConnect if we have a valid project ID
const connectors = [
  // Prioritize Farcaster/Base MiniApp connector when available
  farcasterMiniApp(),
  injected(),
  coinbaseWallet({
    appName: 'Farcaster Token Revoke',
    preference: 'smartWalletOnly' // Optimized for Base/Coinbase
  })
];

// Add WalletConnect only if we have a real project ID
const wcProjectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;
if (wcProjectId && wcProjectId !== 'your-project-id' && wcProjectId.length > 10) {
  connectors.push(
    walletConnect({
      projectId: wcProjectId,
      metadata: {
        name: 'Farcaster Token Revoke',
        description: 'Revoke token approvals on Base, Ethereum, and Arbitrum',
        url: window.location.origin,
        icons: ['https://your-icon-url.com/icon.png']
      }
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum],
  connectors,
  transports: {
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
  }
})