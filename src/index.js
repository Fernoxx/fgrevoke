import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { sdk } from '@farcaster/miniapp-sdk'

// 🔥 Hide Warpcast’s splash immediately
sdk.actions.ready()

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)