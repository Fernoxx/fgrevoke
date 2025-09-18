// Script to check old contract balance
const { ethers } = require('ethers');

const OLD_CONTRACT = "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const NEW_CONTRACT = "0xec8e0b71ab6a10f6e29cd5243ce7c25a6e987a59";
const FG_TOKEN = "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07";
const RPC_URL = "https://mainnet.base.org";

// ERC20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

async function checkBalances() {
  console.log("🔍 Checking token balances...");
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tokenContract = new ethers.Contract(FG_TOKEN, ERC20_ABI, provider);
    
    // Get token info
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    
    console.log(`\n📊 Token Info:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    
    // Check balances
    const oldBalance = await tokenContract.balanceOf(OLD_CONTRACT);
    const newBalance = await tokenContract.balanceOf(NEW_CONTRACT);
    
    const oldBalanceFormatted = ethers.formatUnits(oldBalance, decimals);
    const newBalanceFormatted = ethers.formatUnits(newBalance, decimals);
    
    console.log(`\n💰 Contract Balances:`);
    console.log(`Old Contract (${OLD_CONTRACT}): ${oldBalanceFormatted} ${symbol}`);
    console.log(`New Contract (${NEW_CONTRACT}): ${newBalanceFormatted} ${symbol}`);
    
    // Calculate how much to migrate
    const oneBillion = ethers.parseUnits("1000000000", decimals); // 1B tokens
    const migrationAmount = oldBalance >= oneBillion ? oneBillion : oldBalance;
    const migrationAmountFormatted = ethers.formatUnits(migrationAmount, decimals);
    
    console.log(`\n🔄 Migration Plan:`);
    console.log(`Amount to migrate: ${migrationAmountFormatted} ${symbol}`);
    
    if (oldBalance >= oneBillion) {
      console.log(`✅ Old contract has enough tokens for 1B migration`);
    } else {
      console.log(`⚠️ Old contract only has ${oldBalanceFormatted} tokens`);
    }
    
    return {
      oldBalance: oldBalance.toString(),
      newBalance: newBalance.toString(),
      migrationAmount: migrationAmount.toString(),
      decimals: decimals
    };
    
  } catch (error) {
    console.error("❌ Error checking balances:", error.message);
    return null;
  }
}

// Run the check
checkBalances().catch(console.error);