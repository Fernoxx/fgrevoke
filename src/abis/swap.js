// Uniswap v4 Universal Router ABI for Clanker v4 tokens
export const UNISWAP_V4_UNIVERSAL_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "execute",
    "outputs": [{"internalType": "bytes", "name": "output", "type": "bytes"}],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Uniswap v4 Universal Router contract address on Base
export const UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESS = "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad";

// Uniswap v4 PoolManager contract address on Base
export const UNISWAP_V4_POOL_MANAGER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Will be updated with correct address

// Clanker Router contract address on Base (for reference)
export const CLANKER_ROUTER_ADDRESS = "0xf525ff21c370beb8d9f5c12dc0da2b583f4b949f";

// Uniswap V3 Router ABI (fallback for older pools)
export const UNISWAP_V3_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint24", "name": "fee", "type": "uint24"},
          {"internalType": "address", "name": "recipient", "type": "address"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"},
          {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Uniswap V3 Router address on Base
export const UNISWAP_V3_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";

// WETH address on Base
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// USDC address on Base
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Clanker v4 specific constants
export const CLANKER_V4_FEE_TIER = 3000; // 0.3% fee tier for most Clanker v4 pools