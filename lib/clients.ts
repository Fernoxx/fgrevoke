import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, RPCS, type ChainKey } from "./chains";

// Support both GAS_SIGNER_PRIVATE_KEY and SIGNER_PK for flexibility
const SIGNER_HEX = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}`;
if (!SIGNER_HEX) {
  throw new Error("Missing GAS_SIGNER_PRIVATE_KEY (or SIGNER_PK) env for faucet signer");
}
export const signerAccount = privateKeyToAccount(SIGNER_HEX);

export function signerClient(chain: ChainKey) {
  return createWalletClient({ account: signerAccount, chain: CHAINS[chain], transport: http(RPCS[chain]) });
}

