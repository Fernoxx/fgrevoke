import type { IncomingMessage, ServerResponse } from "http";
import { encodeFunctionData, Hex, Address } from "viem";
import { amountWeiForUsd, fixedPointOne, signerClient, CONTRACTS } from "../lib/viem";
import { signDailyVoucher } from "../lib/voucher";

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

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk as Buffer);
    const bodyRaw = Buffer.concat(buffers).toString("utf8");
    const { chain, fid, address } = JSON.parse(bodyRaw || "{}") as {
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

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}

