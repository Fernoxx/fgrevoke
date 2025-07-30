import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

console.log('🔧 Using direct SDK import with proper ready() call');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)