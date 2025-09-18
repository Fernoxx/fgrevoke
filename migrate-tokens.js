// Script to migrate 1B tokens from old contract to new contract
const { ethers } = require('ethers');

// Contract addresses
const OLD_CONTRACT = "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const NEW_CONTRACT = "0xec8e0b71ab6a10f6e29cd5243ce7c25a6e987a59";
const FG_TOKEN = "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07";
const RPC_URL = "https://mainnet.base.org";

// Contract ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const REVOKE_AND_CLAIM_ABI = [
  "function migrateToNew(address newContract) external",
  "function rescueERC20(address token, address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function paused() view returns (bool)"
];

async function migrateTokens() {
  console.log("🚀 Starting token migration...");
  
  try {
    // Setup provider and wallet (you'll need to add your private key)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // IMPORTANT: Add your private key here
    const PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";
    
    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
      console.error("❌ Please set your PRIVATE_KEY environment variable");
      console.log("💡 Example: PRIVATE_KEY=0x1234... node migrate-tokens.js");
      return;
    }
    
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`📝 Using wallet: ${wallet.address}`);
    
    // Create contract instances
    const tokenContract = new ethers.Contract(FG_TOKEN, ERC20_ABI, wallet);
    const oldContract = new ethers.Contract(OLD_CONTRACT, REVOKE_AND_CLAIM_ABI, wallet);
    
    // Check if wallet is owner of old contract
    const owner = await oldContract.owner();
    console.log(`👑 Old contract owner: ${owner}`);
    
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error("❌ Your wallet is not the owner of the old contract!");
      return;
    }
    
    // Get current balances
    const decimals = await tokenContract.decimals();
    const oldBalance = await tokenContract.balanceOf(OLD_CONTRACT);
    const newBalance = await tokenContract.balanceOf(NEW_CONTRACT);
    
    console.log(`\n📊 Current Balances:`);
    console.log(`Old Contract: ${ethers.formatUnits(oldBalance, decimals)} FG`);
    console.log(`New Contract: ${ethers.formatUnits(newBalance, decimals)} FG`);
    
    // Choose migration method
    console.log(`\n🔄 Migration Options:`);
    console.log(`1. Migrate ALL tokens from old to new contract (${ethers.formatUnits(oldBalance, decimals)} FG)`);
    console.log(`2. Transfer exactly 1B tokens to new contract`);
    
    // For now, let's do option 2 (1B tokens)
    const oneBillion = ethers.parseUnits("1000000000", decimals);
    
    if (oldBalance < oneBillion) {
      console.error("❌ Old contract doesn't have enough tokens for 1B migration");
      return;
    }
    
    console.log(`\n📝 Preparing to transfer 1B tokens...`);
    
    // Check if old contract is paused
    const isPaused = await oldContract.paused();
    console.log(`⏸️ Old contract paused: ${isPaused}`);
    
    // Method 1: Use rescueERC20 function (if available)
    console.log(`\n🔧 Method 1: Using rescueERC20 function...`);
    
    try {
      const tx = await oldContract.rescueERC20(NEW_CONTRACT, oneBillion);
      console.log(`📝 Transaction sent: ${tx.hash}`);
      
      console.log(`⏳ Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Check new balances
      const newOldBalance = await tokenContract.balanceOf(OLD_CONTRACT);
      const newNewBalance = await tokenContract.balanceOf(NEW_CONTRACT);
      
      console.log(`\n📊 New Balances:`);
      console.log(`Old Contract: ${ethers.formatUnits(newOldBalance, decimals)} FG`);
      console.log(`New Contract: ${ethers.formatUnits(newNewBalance, decimals)} FG`);
      
      console.log(`\n🎉 Migration completed successfully!`);
      
    } catch (error) {
      console.error("❌ Method 1 failed:", error.message);
      
      // Method 2: Direct transfer (if old contract has transfer function)
      console.log(`\n🔧 Method 2: Direct transfer from old contract...`);
      console.log(`⚠️ This requires the old contract to have a transfer function`);
      
      // This would require the old contract to have a transfer function
      // which it might not have for security reasons
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  }
}

// Run the migration
migrateTokens().catch(console.error);