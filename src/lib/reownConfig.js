import { createAppKit } from '@reown/appkit'
import { base, mainnet, arbitrum } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createConfig, http } from 'wagmi'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Get the project ID from environment
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID

// Get API keys from environment
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r'

// Check if we have a valid Reown project ID
const hasValidProjectId = projectId && projectId !== 'YOUR_REOWN_PROJECT_ID_HERE' && projectId.length > 10

console.log('🔧 Reown Configuration:', {
  projectId: projectId ? `${projectId.substring(0, 8)}...` : 'Not set',
  hasValidProjectId,
  mode: hasValidProjectId ? 'Reown AppKit' : 'Fallback wagmi'
})

// Create wagmi configuration
let wagmiConfig
let appKitInstance = null

if (hasValidProjectId) {
  // Use Reown AppKit adapter if we have a valid project ID
  const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: [base, mainnet, arbitrum],
  })

  // Define metadata
  const metadata = {
    name: 'Farcaster Token Revoke',
    description: 'Revoke token approvals on Base, Ethereum, and Arbitrum',
    url: window.location.origin,
    icons: ['https://raw.githubusercontent.com/yourusername/farguard-revoke-app/main/public/farguard-logo.png']
  }

  // Create modal
  appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [base, mainnet, arbitrum],
    defaultNetwork: base,
    metadata,
    features: {
      analytics: true,
      email: false,
      socials: false,
      swaps: false
    },
    themeMode: 'light',
    themeVariables: {
      '--w3m-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--w3m-accent': '#7C65C1',
      '--w3m-border-radius-master': '8px'
    }
  })

  // Export the wagmi config from the adapter
  wagmiConfig = wagmiAdapter.wagmiConfig
} else {
  // Fallback to regular wagmi config if no Reown project ID
  console.warn('⚠️ Reown Project ID not configured. Using fallback wagmi configuration.')
  console.warn('To qualify for WalletConnect rewards, please set REACT_APP_REOWN_PROJECT_ID in your .env file')
  
  wagmiConfig = createConfig({
    chains: [base, mainnet, arbitrum],
    connectors: [
      farcasterMiniApp(),
      injected(),
      coinbaseWallet({
        appName: 'Farcaster Token Revoke',
        preference: 'smartWalletOnly'
      })
    ],
    transports: {
      [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
      [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
      [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
    }
  })
}

export { wagmiConfig, hasValidProjectId as isReownInitialized, appKitInstance }