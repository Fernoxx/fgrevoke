import React from 'react'
import ReactDOM from 'react-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { wagmiConfig } from './lib/wagmi'
import { privyConfig } from './lib/privyConfig'

// Setup for wagmi and react-query
const queryClient = new QueryClient()

ReactDOM.render(
  <React.StrictMode>
    <PrivyProvider {...privyConfig}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  </React.StrictMode>,
  document.getElementById('root')
)