import React from 'react'
import ReactDOM from 'react-dom'
import { WagmiProvider, useConnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'
import App from './App'

console.log('🔧 Setting up wagmi for reward claimer contract');

const queryClient = new QueryClient()

function AutoConnect({ children }) {
  const { connect, connectors } = useConnect()

  React.useEffect(() => {
    (async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        const isMini = await sdk.isInMiniApp()
        if (isMini) {
          const mini = connectors.find(c => c.id === 'farcaster')
          if (mini) {
            console.log('⚡ Auto-connecting via Farcaster MiniApp connector')
            connect({ connector: mini })
          }
        }
      } catch (e) {
        // ignore if not in miniapp
      }
    })()
  }, [connect, connectors])

  return children
}

ReactDOM.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect>
          <App />
        </AutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
