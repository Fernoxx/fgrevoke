import type { IncomingMessage, ServerResponse } from "http";
import { encodeFunctionData, parseEther } from "viem";
import { signerClient } from "../lib/clients";
import { CONTRACTS, type ChainKey } from "../lib/chains";
import { signDailyVoucher } from "../lib/voucher";
import { weiForUsd } from "../lib/price";

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
    
    // Validate request body
    if (!bodyRaw) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "empty request body" }));
      return;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyRaw);
    } catch (parseError) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "invalid JSON in request body" }));
      return;
    }

    const { chain, fid, address } = parsedBody as {
      chain: ChainKey;
      fid: number;
      address: `0x${string}`;
    };

    // Validate required fields
    if (!chain || !fid || !address) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ 
        error: "missing required fields: chain, fid, address",
        received: { chain: !!chain, fid: !!fid, address: !!address }
      }));
      return;
    }

    // Validate chain
    if (!["base", "celo", "mon"].includes(chain)) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: `unsupported chain: ${chain}` }));
      return;
    }

    // Check environment variables
    const requiredEnvVars = {
      GAS_SIGNER_PRIVATE_KEY: process.env.GAS_SIGNER_PRIVATE_KEY,
      [`${chain.toUpperCase()}_RPC`]: process.env[`${chain.toUpperCase()}_RPC`],
      [`CONTRACT_${chain.toUpperCase()}`]: process.env[`CONTRACT_${chain.toUpperCase()}`],
    };

    for (const [name, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing environment variable: ${name}`);
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: `server configuration error: missing ${name}` }));
        return;
      }
    }

    await assertWalletBelongsToFid(fid, address);

    const amountWei =
      chain === "celo" ? parseEther("0.1") :
      chain === "mon"  ? parseEther("0.1") :
      await weiForUsd(0.10);

    const { value, signature } = await signDailyVoucher({
      chain,
      fid: BigInt(fid),
      recipient: address,
      amountWei,
    });

    const client = signerClient(chain as ChainKey);
    const data = encodeFunctionData({
      abi: ABI,
      functionName: "claimFor",
      args: [value as any, signature as `0x${string}`],
    });

    const txHash = await client.sendTransaction({
      to: CONTRACTS[chain as ChainKey],
      data,
      account: client.account,
    });

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (e: any) {
    console.error('Claim API error:', e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}

