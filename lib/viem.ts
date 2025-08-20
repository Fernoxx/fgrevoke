import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, celo, defineChain } from "viem/chains";

export const CHAINS = {
  base,
  celo,
  mon: defineChain({
    id: 20143, // replace with real monad id
    name: "Monad",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [process.env.MON_RPC!] } },
  }),
} as const;

export const CONTRACTS = {
  base: process.env.CONTRACT_BASE as `0x${string}`,
  celo: process.env.CONTRACT_CELO as `0x${string}`,
  mon: process.env.CONTRACT_MON as `0x${string}`,
} as const;

export const RPCS = {
  base: process.env.BASE_RPC!,
  celo: process.env.CELO_RPC!,
  mon: process.env.MON_RPC!,
} as const;

const SIGNER_HEX = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}`;
export const signerAccount = privateKeyToAccount(SIGNER_HEX);

export function signerClient(chain: keyof typeof CHAINS) {
  const rpc = RPCS[chain];
  return createWalletClient({ account: signerAccount, chain: CHAINS[chain], transport: http(rpc) });
}

// amount helpers
export function fixedPointOne(): bigint {
  return parseEther("0.1");
}

// Import the price helper
import { weiForUsd } from "./price";

// Re-export for compatibility
export const amountWeiForUsd = weiForUsd;

