import type { IncomingMessage, ServerResponse } from "http";
import { createWalletClient, http, parseEther, Hex, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, celo } from "viem/chains";
import { weiForUsd } from "../lib/price";

// Minimal Monad testnet chain config (adjust RPC via env if needed)
const monadTestnet = {
  id: 20143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MON_RPC ?? "https://testnet-rpc.monad.xyz"] },
    public: { http: [process.env.MON_RPC ?? "https://testnet-rpc.monad.xyz"] },
  },
} as const;

type ChainKey = "eth" | "celo" | "mon";

const CHAIN_CONFIG: Record<ChainKey, {
  chain: any;
  rpcUrl: string;
  contractEnvKey: "CONTRACT_ETH" | "CONTRACT_CELO" | "CONTRACT_MON";
}> = {
  eth: {
    chain: base,
    rpcUrl: process.env.BASE_RPC ?? "https://base-rpc.publicnode.com",
    contractEnvKey: "CONTRACT_ETH",
  },
  celo: {
    chain: celo,
    rpcUrl: process.env.CELO_RPC ?? "https://forno.celo.org",
    contractEnvKey: "CONTRACT_CELO",
  },
  mon: {
    chain: monadTestnet,
    rpcUrl: process.env.MON_RPC ?? "https://testnet-rpc.monad.xyz",
    contractEnvKey: "CONTRACT_MON",
  },
};

// Assumed faucet ABI: claim(fid, to, amountWei)
const faucetAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amountWei", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { json?: (b: any) => void }) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      return;
    }

    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk as Buffer);
    const bodyRaw = Buffer.concat(buffers).toString("utf8");
    let body: any = {};
    try { body = JSON.parse(bodyRaw || "{}"); } catch {}

    const chainKey = String(body?.chain || "").toLowerCase() as ChainKey;
    const fid = Number(body?.fid);
    const address = String(body?.address || "") as Address;

    if (!chainKey || !(chainKey in CHAIN_CONFIG)) throw new Error("invalid chain");
    if (!Number.isFinite(fid) || fid <= 0) throw new Error("invalid fid");
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("invalid address");

    const gasKey = (process.env.SIGNER_PK || process.env.GAS_SIGNER_PRIVATE_KEY) as string | undefined;
    if (!gasKey) throw new Error("missing GAS_SIGNER_PRIVATE_KEY env");

    const { chain, rpcUrl, contractEnvKey } = CHAIN_CONFIG[chainKey];
    const contractAddress = process.env[contractEnvKey] as Address | undefined;
    if (!contractAddress) throw new Error(`missing ${contractEnvKey} env`);

    const account = privateKeyToAccount((gasKey.startsWith("0x") ? gasKey : ("0x" + gasKey)) as Hex);
    const client = createWalletClient({ account, chain, transport: http(rpcUrl) });

    // Determine payout
    const amountWei = chainKey === "celo" ? parseEther("0.1")
      : chainKey === "mon" ? parseEther("0.1")
      : await weiForUsd(0.10);

    // Call faucet contract
    const { request } = await (client as any).simulateContract({
      address: contractAddress,
      abi: faucetAbi,
      functionName: "claim",
      args: [BigInt(fid), address, amountWei],
      account,
    });
    const txHash = await client.writeContract(request);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (err: any) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: err?.message || "unknown error" }));
  }
}

