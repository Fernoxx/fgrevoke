import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, celo, defineChain } from "viem/chains";

export const CHAINS = {
  eth: mainnet,
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
  eth: process.env.CONTRACT_ETH as `0x${string}`,
  celo: process.env.CONTRACT_CELO as `0x${string}`,
  mon: process.env.CONTRACT_MON as `0x${string}`,
} as const;

const SIGNER_HEX = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}`;
export const signerAccount = privateKeyToAccount(SIGNER_HEX);

export function signerClient(chain: keyof typeof CHAINS) {
  const rpc =
    chain === "eth" ? process.env.ETH_RPC! :
    chain === "celo" ? process.env.CELO_RPC! :
    chain === "mon" ? process.env.MON_RPC! :
    process.env.BASE_RPC!;
  return createWalletClient({ account: signerAccount, chain: CHAINS[chain], transport: http(rpc) });
}

// amount helpers
export function fixedPointOne(): bigint {
  return parseEther("0.1");
}

// crude price helper for 0.10 USD of ETH or use your own oracle
export async function amountWeiForUsd(usd = 0.10): Promise<bigint> {
  const price = await getEthUsd();
  const eth = usd / price;
  return BigInt(Math.floor(eth * 1e18));
}

async function getEthUsd(): Promise<number> {
  // replace with Coingecko or your own cache, this placeholder is 3000
  return 3000;
}

