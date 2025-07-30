import { createConfig, http } from 'wagmi'
import { base, mainnet, arbitrum } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Get API keys from environment
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r';

export const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum],
  connectors: [
    injected()
  ],
  transports: {
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
  }
})