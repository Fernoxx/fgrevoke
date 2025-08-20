import type { IncomingMessage, ServerResponse } from "http";

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
  console.log("[api/claim] Handler started");
  try {
    // Dynamic imports to avoid Vercel bundling issues
    const viem = await import("viem");
    const { encodeFunctionData, parseEther } = viem;
    const viemChains = await import("viem/chains");
    const { base, celo } = viemChains;
    const viemAccounts = await import("viem/accounts");
    const { privateKeyToAccount } = viemAccounts;
    
    // Import our modules
    const priceModule = await import("../lib/price");
    const { weiForUsd } = priceModule;
    
    type ChainKey = "base" | "celo" | "mon";
    
    // Define chains inline to avoid module issues
    const CHAINS = {
      base,
      celo,
      mon: {
        id: 20143,
        name: "Monad Testnet",
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [process.env.MON_RPC || ""] } },
      },
    } as const;
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      base: (process.env.CONTRACT_BASE || "") as `0x${string}`,
      celo: (process.env.CONTRACT_CELO || "") as `0x${string}`,
      mon: (process.env.CONTRACT_MON || "") as `0x${string}`,
    };
    
    const RPCS: Record<ChainKey, string> = {
      base: process.env.BASE_RPC || "",
      celo: process.env.CELO_RPC || "",
      mon: process.env.MON_RPC || "",
    };
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk as Buffer);
    const bodyRaw = Buffer.concat(buffers).toString("utf8");
    let parsed: any = {};
    try {
      parsed = JSON.parse(bodyRaw || "{}");
    } catch (err: any) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "invalid JSON body" }));
      return;
    }
    const { chain, fid, address } = parsed as {
      chain: ChainKey;
      fid: number;
      address: `0x${string}`;
    };

    if (!chain || !fid || !address) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "missing required fields: chain, fid, address" }));
      return;
    }

    // Basic diagnostics (no secrets)
    const signerPk = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as string | undefined;
    const rpcUrl = RPCS[chain];
    const contractAddr = CONTRACTS[chain];
    const missing: string[] = [];
    if (!signerPk) missing.push("GAS_SIGNER_PRIVATE_KEY");
    if (!rpcUrl) missing.push(`${chain === 'base' ? 'BASE_RPC or ETH_RPC' : `${chain.toUpperCase()}_RPC`}`);
    if (!contractAddr) missing.push(`CONTRACT_${chain === 'base' ? 'BASE or CONTRACT_ETH' : chain.toUpperCase()}`);
    if (missing.length) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: `Server misconfigured: missing ${missing.join(", ")}` }));
      return;
    }
    if (!(signerPk as string).startsWith("0x") || (signerPk as string).length !== 66) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Server misconfigured: GAS_SIGNER_PRIVATE_KEY must be 0x + 64 hex" }));
      return;
    }

    console.log(`[api/claim] request`, { 
      chain, 
      fid, 
      address, 
      rpcSet: !!rpcUrl, 
      contractSet: !!contractAddr,
      contractAddr: contractAddr ? `${contractAddr.slice(0, 6)}...${contractAddr.slice(-4)}` : 'undefined',
      node: process.version 
    });

    await assertWalletBelongsToFid(fid, address);

    const amountWei =
      chain === "celo" ? parseEther("0.1") :
      chain === "mon"  ? parseEther("0.1") :
      chain === "base" ? await weiForUsd(0.10) :
      await weiForUsd(0.10);

    // Get signer account
    const signerHex = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as `0x${string}`;
    const signerAccount = privateKeyToAccount(signerHex);
    
    // Create signer client
    const rpc = RPCS[chain];
    const client = viem.createWalletClient({ 
      account: signerAccount, 
      chain: CHAINS[chain], 
      transport: viem.http(rpc) 
    });
    
    // Sign voucher
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
    
    const domain = {
      name: "DailyGasClaim",
      version: "1",
      chainId: CHAINS[chain].id,
      verifyingContract: CONTRACTS[chain],
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
      fid: BigInt(fid),
      recipient: address,
      day,
      amountWei,
      deadline,
    } as const;
    
    const signature = await client.signTypedData({
      domain,
      types,
      primaryType: "Claim",
      message,
    });
    
    const value = message;
    const data = encodeFunctionData({
      abi: ABI,
      functionName: "claimFor",
      args: [value as any, signature as `0x${string}`],
    });

    let txHash: `0x${string}`;
    try {
      txHash = await client.sendTransaction({
        to: CONTRACTS[chain as ChainKey],
        data,
        account: client.account,
      });
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "transaction failed";
      const code = err?.code || err?.name;
      const details = err?.details || err?.reason || "";
      console.error(`[api/claim] sendTransaction error`, { 
        code, 
        msg,
        details,
        chain,
        contractAddr: CONTRACTS[chain as ChainKey],
        fullError: err 
      });
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: msg, code, details }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (e: any) {
    // Ensure we never send non-JSON to the client
    try {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: e?.message || "server error" }));
    } catch (_) {
      // Last resort fallback
      try {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end("{\"error\":\"server error\"}");
      } catch {}
    }
  }
}

