const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Dynamic Holder Rewards Contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Your $FG token address (replace with actual address)
  const FG_TOKEN_ADDRESS = "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07";

  // Deploy the contract
  const DynamicHolderRewards = await ethers.getContractFactory("DynamicHolderRewards");
  const dynamicRewards = await DynamicHolderRewards.deploy(
    FG_TOKEN_ADDRESS,
    deployer.address // Initial owner
  );

  await dynamicRewards.deployed();

  console.log("✅ Dynamic Holder Rewards deployed to:", dynamicRewards.address);
  console.log("🔗 Token address:", FG_TOKEN_ADDRESS);
  console.log("👑 Owner:", deployer.address);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const tokenAddress = await dynamicRewards.token();
  const owner = await dynamicRewards.owner();
  const lastUpdateTime = await dynamicRewards.lastUpdateTime();

  console.log("✅ Token address matches:", tokenAddress === FG_TOKEN_ADDRESS);
  console.log("✅ Owner set correctly:", owner === deployer.address);
  console.log("✅ Last update time set:", lastUpdateTime.toString());

  // Save deployment info
  const deploymentInfo = {
    contractAddress: dynamicRewards.address,
    tokenAddress: FG_TOKEN_ADDRESS,
    owner: deployer.address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: await deployer.provider.getNetwork(),
    blockNumber: await deployer.provider.getBlockNumber()
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n🎯 Next Steps:");
  console.log("1. Transfer $FG tokens to the contract for rewards");
  console.log("2. Add initial holders using addHolder() or batchAddHolders()");
  console.log("3. Start the reward distribution system");
  console.log("4. Monitor and manage holders as needed");

  return dynamicRewards;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });