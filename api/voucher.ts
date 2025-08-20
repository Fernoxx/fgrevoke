import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  console.log("[api/voucher] Handler started");
  try {
    // Dynamic imports to avoid Vercel bundling issues
    const viem = await import("viem");
    const { parseEther } = viem;
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

    // Validate environment
    const signerPk = (process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK) as string | undefined;
    const contractAddr = CONTRACTS[chain];
    if (!signerPk || !signerPk.startsWith("0x") || signerPk.length !== 66) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Server misconfigured: GAS_SIGNER_PRIVATE_KEY invalid" }));
      return;
    }
    if (!contractAddr) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: `Server misconfigured: CONTRACT_${chain.toUpperCase()} not set` }));
      return;
    }

    console.log(`[api/voucher] request`, { chain, fid, address });

    // TODO: Replace with your real FID to wallet check
    // await assertWalletBelongsToFid(fid, address);

    // Calculate amount
    const amountWei =
      chain === "celo" ? parseEther("0.1") :
      chain === "mon"  ? parseEther("0.1") :
      await weiForUsd(0.10);

    // Get signer account
    const signerAccount = privateKeyToAccount(signerPk as `0x${string}`);
    
    // Create wallet client for signing
    const client = viem.createWalletClient({ 
      account: signerAccount, 
      chain: CHAINS[chain],
      transport: viem.http() // Dummy transport for signing
    });
    
    // Sign voucher
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
    
    const domain = {
      name: "DailyGasClaim",
      version: "1",
      chainId: CHAINS[chain].id,
      verifyingContract: contractAddr,
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
    
    const voucher = {
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
      message: voucher,
    });

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ 
      ok: true,
      voucher: {
        fid: voucher.fid.toString(),
        recipient: voucher.recipient,
        day: voucher.day.toString(),
        amountWei: voucher.amountWei.toString(),
        deadline: voucher.deadline.toString(),
      },
      signature,
      contract: contractAddr,
      chainId: CHAINS[chain].id,
    }));
  } catch (e: any) {
    console.error("[api/voucher] error:", e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}