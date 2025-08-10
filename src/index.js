import React from 'react'
import ReactDOM from 'react-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'

console.log('🔧 Setting up wagmi for reward claimer contract');

const queryClient = new QueryClient()

ReactDOM.render
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
  document.getElementById('root')
)
