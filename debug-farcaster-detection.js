// Debug script to check Farcaster user detection
const { ethers } = require('ethers');

const BACKEND_URL = "https://farguard-attester-production.up.railway.app/attest";
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "your-neynar-api-key";

async function debugFarcasterDetection() {
  console.log("🔍 Debugging Farcaster User Detection...");
  console.log("=" .repeat(60));
  
  // Test with your wallet address
  const testWallet = "0xe43C85ca13aCA2D5f297fc8f35d8256332c1eaB3";
  
  console.log(`📝 Testing wallet: ${testWallet}`);
  
  // Step 1: Check Neynar API directly
  console.log("\n🔍 Step 1: Direct Neynar API Check");
  console.log("-".repeat(40));
  
  try {
    const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${testWallet}`, {
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });
    
    console.log(`📊 Neynar Response Status: ${neynarResponse.status}`);
    
    if (neynarResponse.ok) {
      const neynarData = await neynarResponse.json();
      console.log(`📊 Neynar Response:`, JSON.stringify(neynarData, null, 2));
      
      if (neynarData.users && neynarData.users.length > 0) {
        const user = neynarData.users[0];
        console.log(`✅ FID found: ${user.fid}`);
        console.log(`✅ Username: ${user.username || 'N/A'}`);
        console.log(`✅ Display name: ${user.display_name || 'N/A'}`);
        console.log(`✅ Verified addresses: ${user.verified_addresses?.length || 0}`);
        
        if (user.verified_addresses) {
          user.verified_addresses.forEach((addr, index) => {
            console.log(`   Address ${index + 1}: ${addr}`);
          });
        }
      } else {
        console.log(`❌ No Farcaster user found for this wallet`);
      }
    } else {
      const errorText = await neynarResponse.text();
      console.log(`❌ Neynar API Error: ${neynarResponse.status}`);
      console.log(`❌ Error Response: ${errorText}`);
    }
    
  } catch (error) {
    console.error(`❌ Neynar API request failed: ${error.message}`);
  }
  
  // Step 2: Test backend with your wallet
  console.log("\n🔍 Step 2: Backend Attestation Request");
  console.log("-".repeat(40));
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: testWallet,
        token: "0x1234567890123456789012345678901234567890",
        spender: "0x1234567890123456789012345678901234567890"
      })
    });
    
    const data = await response.json();
    console.log(`📊 Backend Response Status: ${response.status}`);
    console.log(`📊 Backend Response:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅ Backend successfully generated attestation`);
      console.log(`✅ FID: ${data.fid}`);
    } else {
      console.log(`❌ Backend rejected the request: ${data.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Backend request failed: ${error.message}`);
  }
  
  // Step 3: Check what the frontend is sending
  console.log("\n🔍 Step 3: Frontend Wallet Detection");
  console.log("-".repeat(40));
  
  console.log(`💡 Frontend should be detecting Farcaster wallet automatically`);
  console.log(`💡 Check if the wallet address matches what you see in Farcaster`);
  console.log(`💡 Make sure you're connected with the correct wallet in Farcaster`);
  
  // Step 4: Test with different wallet formats
  console.log("\n🔍 Step 4: Testing Wallet Address Formats");
  console.log("-".repeat(40));
  
  const walletVariants = [
    testWallet.toLowerCase(),
    testWallet.toUpperCase(),
    testWallet
  ];
  
  for (const variant of walletVariants) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: variant,
          token: "0x1234567890123456789012345678901234567890",
          spender: "0x1234567890123456789012345678901234567890"
        })
      });
      
      const data = await response.json();
      console.log(`📊 Wallet format: ${variant}`);
      console.log(`📊 Response: ${data.error || 'Success'}`);
      
    } catch (error) {
      console.log(`📊 Wallet format: ${variant} - Error: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Debug Summary:");
  console.log("Check the Neynar API response above to see if your wallet is found");
  console.log("If Neynar doesn't find your wallet, that's the root cause");
  console.log("Make sure you're using the wallet that's connected to Farcaster");
}

// Run the debug
debugFarcasterDetection().catch(console.error);