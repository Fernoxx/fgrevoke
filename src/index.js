import React from 'react'
import ReactDOM from 'react-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

console.log('🔧 Setting up wagmi for reward claimer contract');

const queryClient = new QueryClient()

ReactDOM.render
    <WagmiProvider config={wagmiConfig}>
)
