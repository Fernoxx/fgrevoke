import { createWalletClient, http, parseEther, defineChain, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, celo } from "viem/chains";

export const CHAINS = {
  base,
  celo,
  mon: defineChain({
    id: 10143, // Monad testnet
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [process.env.MON_RPC || ""] } },
  }),
} as const;

export const CONTRACTS = {
  base: (process.env.CONTRACT_BASE || "") as `0x${string}`,
  celo: (process.env.CONTRACT_CELO || "") as `0x${string}`,
  mon: (process.env.CONTRACT_MON || "") as `0x${string}`,
} as const;

export const RPCS = {
  base: process.env.BASE_RPC || "",
  celo: process.env.CELO_RPC || "",
  mon: process.env.MON_RPC || "",
} as const;

export function getSignerAccount() {
  const hex = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}` | undefined;
  if (!hex || !hex.startsWith("0x")) {
    throw new Error("GAS_SIGNER_PRIVATE_KEY not configured");
  }
  return privateKeyToAccount(hex);
}

export function signerClient(chain: keyof typeof CHAINS) {
  const rpc = RPCS[chain];
  if (!rpc) {
    throw new Error(`RPC not configured for chain ${chain}`);
  }
  const account = getSignerAccount();
  return createWalletClient({ account, chain: CHAINS[chain], transport: http(rpc) });
}

// amount helpers
export function fixedPointOne(): bigint {
  return parseEther("0.1");
}

// Import the price helper
import { weiForUsd } from "./price";

// Re-export for compatibility
export const amountWeiForUsd = weiForUsd;

