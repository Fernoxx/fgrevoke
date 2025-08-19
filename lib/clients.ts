import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, RPCS, type ChainKey } from "./chains";

export const signerAccount = privateKeyToAccount(process.env.GAS_SIGNER_PRIVATE_KEY as `0x${string}`);

export function signerClient(chain: ChainKey) {
  return createWalletClient({ account: signerAccount, chain: CHAINS[chain], transport: http(RPCS[chain]) });
}

