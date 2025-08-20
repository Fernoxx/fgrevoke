import type { IncomingMessage, ServerResponse } from "http";
import { encodeFunctionData, parseEther } from "viem";
import { signerClient } from "../lib/clients";
import { CONTRACTS, CHAINS, RPCS, type ChainKey } from "../lib/chains";
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
    const { chain, fid, address, mode } = JSON.parse(bodyRaw || "{}") as {
      chain: ChainKey;
      fid: number;
      address: `0x${string}`;
      mode?: "prepare" | "send";
    };

    if (!chain || !["base", "celo", "mon"].includes(chain)) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "invalid chain" }));
      return;
    }
    if (!address) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "missing address" }));
      return;
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

    const data = encodeFunctionData({
      abi: ABI,
      functionName: "claimFor",
      args: [value as any, signature as `0x${string}`],
    });
    const to = CONTRACTS[chain as ChainKey];
    if (!to) {
      throw new Error(`Missing faucet contract address for chain ${chain} (set CONTRACT_${chain.toUpperCase()} or CONTRACT_BASE)`);
    }

    // When mode is 'send', submit via server signer; otherwise return prepared params for client wallet
    if (mode === "send") {
      const client = signerClient(chain as ChainKey);
      const txHash = await client.sendTransaction({
        to,
        data,
        account: client.account,
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, txHash }));
      return;
    }

    const chainId = CHAINS[chain as ChainKey].id;
    const chainIdHex = `0x${chainId.toString(16)}` as const;
    const native = (CHAINS[chain as ChainKey] as any).nativeCurrency || { name: "ETH", symbol: "ETH", decimals: 18 };
    const chainParams = {
      chainId: chainIdHex,
      chainName: (CHAINS[chain as ChainKey] as any).name || chain,
      nativeCurrency: native,
      rpcUrls: [RPCS[chain as ChainKey]],
    };

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, prepared: { to, data, chainId, chainIdHex, chainParams } }));
  } catch (e: any) {
    const message = e?.message || "server error";
    res.statusCode = /invalid|missing/i.test(message) ? 400 : 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }
}

