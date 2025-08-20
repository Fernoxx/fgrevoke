import { base, celo, defineChain } from "viem/chains";

export type ChainKey = "base" | "celo" | "mon";

export const CHAINS = {
  base: {
    ...base,
    rpcUrls: {
      default: { http: [process.env.BASE_RPC || 'https://mainnet.base.org'] }
    }
  },
  celo,
  mon: defineChain({
    id: 20143, // update if your provider shows a different testnet id
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [process.env.MON_RPC!] } },
  }),
} as const;

export const RPCS: Record<ChainKey, string> = {
  base: (process.env.BASE_RPC || process.env.ETH_RPC)!,
  celo: process.env.CELO_RPC!,
  mon: process.env.MON_RPC!,
};

export const CONTRACTS: Record<ChainKey, `0x${string}`> = {
  base: (process.env.CONTRACT_BASE || process.env.CONTRACT_ETH) as `0x${string}`,
  celo: process.env.CONTRACT_CELO as `0x${string}`,
  mon:  process.env.CONTRACT_MON as `0x${string}`,
};

