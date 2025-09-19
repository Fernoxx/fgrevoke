const { ethers } = require('ethers');

async function debugWalletMismatch() {
  console.log("🔍 Debugging Wallet Mismatch Issue...");
  console.log("=" .repeat(60));
  
  // Your actual wallets
  const YOUR_PRIMARY_WALLET = "0x3cF87B76d2A1D36F9542B4Da2a6B4B3Dc0f0Bb2e"; // The one you said is primary
  const YOUR_ADDED_WALLET = "0xe43C85ca13aCA2D5f297fc8f35d8256332c1eaB3"; // The one backend thinks is primary
  const YOUR_FID = 242597;
  
  console.log(`📋 Your Primary Wallet (what you said): ${YOUR_PRIMARY_WALLET}`);
  console.log(`📋 Your Added Wallet: ${YOUR_ADDED_WALLET}`);
  console.log(`📋 Your FID: ${YOUR_FID}`);
  
  // Initialize provider for Optimism (IdRegistry is on Optimism)
  const optimismProvider = new ethers.JsonRpcProvider('https://optimism-mainnet.g.alchemy.com/v2/demo');
  
  // IdRegistry contract
  const idRegistryAddress = '0x00000000fc6c5f01fc30151999387bb99a9f489b';
  const idRegistryABI = [
    'function custodyOf(uint256 fid) external view returns (address)'
  ];
  
  const idRegistry = new ethers.Contract(idRegistryAddress, idRegistryABI, optimismProvider);
  
  console.log("\n🔍 Step 1: Checking IdRegistry custodyOf for your FID");
  console.log("-".repeat(40));
  
  try {
    const custodyAddress = await idRegistry.custodyOf(YOUR_FID);
    console.log(`✅ IdRegistry custodyOf(${YOUR_FID}) = ${custodyAddress}`);
    
    if (custodyAddress.toLowerCase() === YOUR_PRIMARY_WALLET.toLowerCase()) {
      console.log("✅ ✅ CORRECT! IdRegistry shows your primary wallet as custody");
    } else if (custodyAddress.toLowerCase() === YOUR_ADDED_WALLET.toLowerCase()) {
      console.log("❌ ❌ WRONG! IdRegistry shows your added wallet as custody");
      console.log("💡 This means your Farcaster account custody was transferred to the added wallet");
    } else {
      console.log("❌ ❌ UNKNOWN! IdRegistry shows a different wallet as custody");
      console.log(`   Expected: ${YOUR_PRIMARY_WALLET}`);
      console.log(`   Got: ${custodyAddress}`);
    }
    
  } catch (error) {
    console.error("❌ Error checking IdRegistry:", error.message);
  }
  
  console.log("\n🔍 Step 2: Testing Neynar API lookup");
  console.log("-".repeat(40));
  
  // Test both wallets with Neynar API
  const wallets = [
    { address: YOUR_PRIMARY_WALLET, label: "Primary Wallet" },
    { address: YOUR_ADDED_WALLET, label: "Added Wallet" }
  ];
  
  for (const wallet of wallets) {
    try {
      console.log(`\n📝 Testing ${wallet.label}: ${wallet.address}`);
      
      // Note: This will fail without API key, but shows the approach
      console.log(`   Neynar API URL: https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet.address}`);
      console.log(`   Expected: Should return FID ${YOUR_FID} for the correct wallet`);
      
    } catch (error) {
      console.error(`   ❌ Error testing ${wallet.label}:`, error.message);
    }
  }
  
  console.log("\n🔍 Step 3: Possible Causes & Solutions");
  console.log("-".repeat(40));
  
  console.log("🎯 Possible Causes:");
  console.log("1. **Custody Transfer**: Your Farcaster account custody was transferred to the added wallet");
  console.log("2. **Neynar API Issue**: Neynar API is returning wrong wallet information");
  console.log("3. **Backend Logic Issue**: Backend is using wrong wallet from Neynar response");
  
  console.log("\n💡 Solutions:");
  console.log("1. **Check Farcaster App**: Verify which wallet is actually your primary wallet in Farcaster");
  console.log("2. **Update Backend**: If custody was transferred, backend logic needs to handle this");
  console.log("3. **Fix Neynar Lookup**: Ensure backend uses the correct wallet from Neynar response");
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Next Steps:");
  console.log("1. Check IdRegistry result above to see which wallet is actually custody");
  console.log("2. Verify in Farcaster app which wallet is your primary");
  console.log("3. Update backend logic if needed to handle custody transfers");
}

debugWalletMismatch().catch(console.error);