import React from 'react'
import ReactDOM from 'react-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { wagmiConfig } from './lib/wagmi'

// Setup for wagmi
const queryClient = new QueryClient()

ReactDOM.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
  document.getElementById('root')
)