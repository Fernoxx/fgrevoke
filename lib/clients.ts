import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, RPCS, type ChainKey } from "./chains";

function getSignerAccount() {
  const hex = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}` | undefined;
  if (!hex || typeof hex !== "string" || !hex.startsWith("0x") || hex.length !== 66) {
    throw new Error("Server misconfigured: GAS_SIGNER_PRIVATE_KEY is missing or invalid");
  }
  return privateKeyToAccount(hex);
}

export function signerClient(chain: ChainKey) {
  const rpc = RPCS[chain];
  if (!rpc) {
    throw new Error(`Server misconfigured: RPC URL missing for chain "${chain}"`);
  }
  const account = getSignerAccount();
  return createWalletClient({ account, chain: CHAINS[chain], transport: http(rpc) });
}

