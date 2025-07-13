import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

// 🔥 SDK ready call moved to App.js after full load

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)