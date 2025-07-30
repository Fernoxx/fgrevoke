import React from 'react'
import ReactDOM from 'react-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { wagmiConfig } from './lib/wagmi'

// Setup for wagmi and react-query
const queryClient = new QueryClient()

console.log('🔧 Using basic wagmi setup (Privy disabled until proper API keys)');

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