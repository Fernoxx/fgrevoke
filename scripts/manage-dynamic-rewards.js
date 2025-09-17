const { ethers } = require("hardhat");

// Configuration
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with actual address
const FG_TOKEN_ADDRESS = "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);

  // Connect to deployed contract
  const DynamicHolderRewards = await ethers.getContractFactory("DynamicHolderRewards");
  const contract = DynamicHolderRewards.attach(CONTRACT_ADDRESS);

  // Get contract info
  console.log("\n📊 Contract Information:");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Token Address:", await contract.token());
  console.log("Owner:", await contract.owner());
  console.log("Total Holders:", (await contract.getHolderCount()).toString());
  console.log("Total Rewards Distributed:", (await contract.totalRewardsDistributed()).toString());
  console.log("Total Pending Rewards:", (await contract.totalPendingRewards()).toString());

  // Check contract balance
  const token = await ethers.getContractAt("IERC20", FG_TOKEN_ADDRESS);
  const contractBalance = await token.balanceOf(CONTRACT_ADDRESS);
  console.log("Contract $FG Balance:", ethers.utils.formatEther(contractBalance));

  // Example operations (uncomment as needed)
  
  // 1. Add a holder
  // const holderAddress = "0x...";
  // console.log("\n➕ Adding holder:", holderAddress);
  // const tx1 = await contract.addHolder(holderAddress);
  // await tx1.wait();
  // console.log("✅ Holder added successfully");

  // 2. Batch add holders
  // const holders = ["0x...", "0x...", "0x..."];
  // console.log("\n➕ Batch adding holders:", holders);
  // const tx2 = await contract.batchAddHolders(holders);
  // await tx2.wait();
  // console.log("✅ Holders added successfully");

  // 3. Update holder balance
  // const holderToUpdate = "0x...";
  // console.log("\n🔄 Updating holder balance:", holderToUpdate);
  // const tx3 = await contract.updateHolderBalance(holderToUpdate);
  // await tx3.wait();
  // console.log("✅ Holder balance updated");

  // 4. Claim rewards (if you're a holder)
  // console.log("\n💰 Claiming rewards...");
  // const tx4 = await contract.claimRewards();
  // await tx4.wait();
  // console.log("✅ Rewards claimed successfully");

  // 5. Check holder info
  // const holderInfo = await contract.getHolderInfo(deployer.address);
  // console.log("\n👤 Holder Info:");
  // console.log("Is Holder:", holderInfo.isHolder);
  // console.log("Balance:", holderInfo.balance.toString());
  // console.log("Pending Rewards:", holderInfo.pendingReward.toString());
  // console.log("Total Claimed:", holderInfo.totalClaimedAmount.toString());

  // 6. Calculate pending rewards
  // const pendingRewards = await contract.calculatePendingRewards(deployer.address);
  // console.log("\n💰 Pending Rewards:", ethers.utils.formatEther(pendingRewards));

  // 7. Emergency functions (use with caution!)
  // console.log("\n🚨 Emergency withdraw (example)");
  // const tx5 = await contract.emergencyWithdraw(deployer.address, ethers.utils.parseEther("1000"));
  // await tx5.wait();
  // console.log("✅ Emergency withdraw completed");

  // 8. Pause/Unpause
  // console.log("\n⏸️ Pausing contract...");
  // const tx6 = await contract.pause();
  // await tx6.wait();
  // console.log("✅ Contract paused");

  // console.log("\n▶️ Unpausing contract...");
  // const tx7 = await contract.unpause();
  // await tx7.wait();
  // console.log("✅ Contract unpaused");

  console.log("\n✅ Management script completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Management failed:", error);
    process.exit(1);
  });