# Reown AppKit Integration

This application has been integrated with Reown AppKit (formerly WalletConnect) to qualify for the WalletConnect weekly rewards program for Base builders.

## Setup Instructions

1. **Get a Reown Project ID**
   - Visit [https://dashboard.reown.com](https://dashboard.reown.com)
   - Create a new project
   - Copy your Project ID

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Replace `YOUR_REOWN_PROJECT_ID_HERE` with your actual Project ID from step 1

3. **Verify Integration**
   - The app now uses Reown AppKit for wallet connections
   - All existing functionality remains unchanged
   - Wallet connections work through the Reown modal

## Qualifying for Weekly Rewards

To qualify for WalletConnect's weekly rewards for Base builders:

1. **Deploy Verified Contracts on Base**
   - Ensure your contracts are deployed and verified on Base network
   - The `contracts/DynamicHolderRewards.sol` is a good candidate

2. **Maintain GitHub Activity**
   - Keep contributing to this public repository
   - Make meaningful commits and improvements

3. **Additional Requirements**
   - Obtain a Basename (onchain identity on Base)
   - Achieve a Builder Score of at least 40
   - Complete Human Checkmark verification through Talent Protocol App

## Technical Details

- **Reown AppKit** is integrated via `@reown/appkit` and `@reown/appkit-adapter-wagmi`
- Configuration is in `src/lib/reownConfig.js`
- The wagmi configuration has been updated to use Reown's adapter
- All existing wallet connection functionality is preserved
- The app prioritizes Base network as the default chain

## Features Enabled

- ✅ Wallet connection modal with Reown branding
- ✅ Support for Base, Ethereum, and Arbitrum networks
- ✅ Analytics enabled for tracking wallet connections
- ✅ Optimized for Base network (default chain)
- ✅ Compatible with existing Farcaster MiniApp connector

## Notes

- The integration maintains backward compatibility with all existing features
- No changes to the core revoke functionality
- The app continues to work exactly as before, just with Reown powering the wallet connections