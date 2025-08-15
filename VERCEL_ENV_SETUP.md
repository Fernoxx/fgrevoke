# FarGuard Scanner - Vercel Environment Variables Setup

## Required Environment Variables

To enable real data fetching in the FarGuard scanner, you need to set up the following environment variables in your Vercel project:

### 1. Etherscan API Key (REQUIRED)
```
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key_here
```
- Get your API key from: https://etherscan.io/apis
- This key is used for fetching transaction data from Ethereum mainnet
- Without this key, the scanner will not be able to fetch real transaction data

### 2. Basescan API Key (OPTIONAL)
```
REACT_APP_BASESCAN_API_KEY=your_basescan_api_key_here
```
- Get your API key from: https://basescan.org/apis
- Used for fetching transactions from Base network
- If not provided, will fall back to ETHERSCAN_API_KEY

### 3. Arbiscan API Key (OPTIONAL)
```
REACT_APP_ARBISCAN_API_KEY=your_arbiscan_api_key_here
```
- Get your API key from: https://arbiscan.io/apis
- Used for fetching transactions from Arbitrum network
- If not provided, will fall back to ETHERSCAN_API_KEY

### 4. Alchemy API Key (REQUIRED for token holdings)
```
REACT_APP_ALCHEMY_API_KEY=your_alchemy_api_key_here
```
- Get your API key from: https://dashboard.alchemy.com/
- Used for fetching token balances and metadata
- Without this key, token holdings will not be displayed

### 5. Infura API Key (OPTIONAL)
```
REACT_APP_INFURA_API_KEY=your_infura_api_key_here
```
- Get your API key from: https://infura.io/
- Used as a backup RPC provider
- Optional but recommended for reliability

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the key and value
4. Make sure to select the appropriate environments (Production, Preview, Development)
5. Click "Save" for each variable
6. Redeploy your project for the changes to take effect

## Verifying Your Setup

After setting up the environment variables and redeploying:

1. Open your browser's developer console (F12)
2. Look for log messages starting with "🔑 API Keys loaded"
3. You should see your API keys partially displayed (first 8 characters)
4. Test the scanner with a real Ethereum address to verify data fetching

## Troubleshooting

If the scanner is not fetching real data:

1. Check that all required environment variables are set correctly
2. Ensure there are no typos in the variable names (they must start with `REACT_APP_`)
3. Verify your API keys are valid and have not exceeded rate limits
4. Check the browser console for error messages
5. Make sure you've redeployed after adding the environment variables

## Rate Limits

- Etherscan API: 5 calls/second (free tier)
- Alchemy API: 330 compute units/second (free tier)
- Plan your usage accordingly to avoid rate limiting