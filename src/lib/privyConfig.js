export const privyConfig = {
  appId: 'clxxx-app-id-replace-me', // Replace with your actual Privy App ID
  loginMethods: ['wallet', 'farcaster'], // Enable wallet and Farcaster login
  embeddedWallets: {
    requireUserPassword: false,
    createOnLogin: 'users-without-wallets'
  },
  appearance: {
    theme: 'dark',
    showWalletLoginFirst: true,
    walletList: ['coinbase_wallet', 'metamask', 'wallet_connect'],
    accentColor: '#8B5CF6',
    logo: 'https://your-logo-url.com/logo.png' // Optional: Add your logo
  },
  farcaster: {
    redirectUrl: window.location.origin // For Farcaster auth redirects
  },
  walletConnectCloudProjectId: 'your-walletconnect-project-id' // Optional: for WalletConnect
};