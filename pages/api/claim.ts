import type { NextApiRequest, NextApiResponse } from "next";
import { encodeFunctionData } from "viem";
import { amountWeiForUsd, fixedPointOne, signerClient, CONTRACTS } from "../../lib/viem";
import { signDailyVoucher } from "../../lib/voucher";

// Replace with your real FID to wallet check
async function assertWalletBelongsToFid(fid: number, address: `0x${string}`) {
  // You already store this mapping from your Farcaster Miniapp connect flow
  // Throw if not valid
  return true;
}

const ABI = [
  {
    type: "function",
    name: "claimFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "c", type: "tuple", components: [
        { name: "fid", type: "uint256" },
        { name: "recipient", type: "address" },
        { name: "day", type: "uint256" },
        { name: "amountWei", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ]},
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  }
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

    const { chain, fid, address } = req.body as {
      chain: "eth" | "base" | "celo" | "mon";
      fid: number;
      address: `0x${string}`;
    };

    await assertWalletBelongsToFid(fid, address);

    const amountWei =
      chain === "celo" ? fixedPointOne() :
      chain === "mon"  ? fixedPointOne() :
      await amountWeiForUsd(0.10); // about 0.10 USD in ETH

    const { value, signature } = await signDailyVoucher({
      chain,
      fid: BigInt(fid),
      recipient: address,
      amountWei,
    });

    const client = signerClient(chain);
    const data = encodeFunctionData({
      abi: ABI,
      functionName: "claimFor",
      args: [value as any, signature as `0x${string}`],
    });

    const txHash = await client.sendTransaction({
      to: CONTRACTS[chain],
      data,
      account: client.account,
    });

    return res.status(200).json({ ok: true, txHash });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "server error" });
  }
}

