require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    // Add your network configurations here
    // base: {
    //   url: "https://mainnet.base.org",
    //   accounts: [process.env.PRIVATE_KEY],
    //   chainId: 8453
    // },
    // baseSepolia: {
    //   url: "https://sepolia.base.org",
    //   accounts: [process.env.PRIVATE_KEY],
    //   chainId: 84532
    // }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};