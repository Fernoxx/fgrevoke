import { CHAINS, CONTRACTS, signerClient } from "./viem";

export type ChainKey = "eth" | "base" | "celo" | "mon";

export async function signDailyVoucher(params: {
  chain: ChainKey;
  fid: bigint;
  recipient: `0x${string}`;
  amountWei: bigint;
}) {
  const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);

  const domain = {
    name: "DailyGasClaim",
    version: "1",
    chainId: CHAINS[params.chain].id,
    verifyingContract: CONTRACTS[params.chain],
  } as const;

  const types = {
    Claim: [
      { name: "fid", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "day", type: "uint256" },
      { name: "amountWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const message = {
    fid: params.fid,
    recipient: params.recipient,
    day,
    amountWei: params.amountWei,
    deadline,
  } as const;

  const client = signerClient(params.chain);
  const signature = await client.signTypedData({
    domain,
    types,
    primaryType: "Claim",
    message,
  });

  return { value: message, signature };
}

