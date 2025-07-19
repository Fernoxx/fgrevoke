#!/bin/bash

echo "🔧 FarGuard API Setup Script"
echo "============================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

echo "📝 Please enter your Etherscan API key:"
echo "   (Get it from: https://etherscan.io/apis)"
echo ""
read -p "API Key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Create .env file
echo "REACT_APP_ETHERSCAN_API_KEY=$api_key" > .env

echo ""
echo "✅ API key configured successfully!"
echo "📁 Created .env file with your API key"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart your app: npm start"
echo "   2. Refresh your browser"
echo "   3. Connect your wallet"
echo ""
echo "🎉 Your FarGuard app should now work without API errors!"