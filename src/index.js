import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { sdk } from '@farcaster/miniapp-sdk'

// Tell Warpcast to hide the splash and show our UI
sdk.actions.ready()

ReactDOM.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
  document.getElementById('root')
)