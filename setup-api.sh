#!/bin/bash

echo "🚀 FarGuard - Etherscan V2 API Setup"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file..."
    cat > .env << 'EOF'
# Etherscan V2 API Configuration
# Get your FREE API key from: https://etherscan.io/apis
# ONE KEY WORKS FOR ALL CHAINS (Ethereum, Base, Arbitrum) with V2 API!

REACT_APP_ETHERSCAN_API_KEY=YourEtherscanV2ApiKeyHere

# Instructions:
# 1. Replace 'YourEtherscanV2ApiKeyHere' with your actual API key from etherscan.io
# 2. Keep this file private - never commit it to git
# 3. The same key works for Ethereum, Base, and Arbitrum chains
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔑 API Key Setup Instructions:"
echo "1. Go to https://etherscan.io/apis"
echo "2. Create a free account and generate an API key"
echo "3. Copy your API key"
echo "4. Open the .env file and replace 'YourEtherscanV2ApiKeyHere' with your real API key"
echo ""
echo "💡 With Etherscan V2, ONE API key works for:"
echo "   - Ethereum mainnet"
echo "   - Base chain"
echo "   - Arbitrum chain"
echo ""
echo "🚫 Common Issues:"
echo "   - Don't use 'demo' or placeholder keys"
echo "   - Make sure your API key is from etherscan.io (not other block explorers)"
echo "   - Ensure the .env file is in your project root"
echo ""
echo "✨ After setup, restart your development server!"

# Check if the API key is already configured
if [ -f ".env" ]; then
    API_KEY=$(grep "REACT_APP_ETHERSCAN_API_KEY=" .env | cut -d'=' -f2)
    if [ "$API_KEY" != "YourEtherscanV2ApiKeyHere" ] && [ "$API_KEY" != "" ]; then
        echo ""
        echo "🎉 API key appears to be configured!"
    else
        echo ""
        echo "⚠️  Please configure your API key in the .env file"
    fi
fi