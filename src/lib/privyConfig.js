// Temporary: Disable Privy until proper API keys are obtained
export const privyConfig = {
  // NOTE: You need to:
  // 1. Sign up at https://privy.io
  // 2. Create an app and get your App ID
  // 3. Replace 'DISABLED-GET-REAL-PRIVY-APP-ID' with your actual App ID
  appId: process.env.REACT_APP_PRIVY_APP_ID || 'DISABLED-GET-REAL-PRIVY-APP-ID',
  loginMethods: ['wallet'], // Simplified for now
  embeddedWallets: {
    requireUserPassword: false
  },
  appearance: {
    theme: 'dark',
    showWalletLoginFirst: true
  }
};