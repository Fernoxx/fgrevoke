import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  console.log("[api/prepare-metatx] Handler started");
  
  res.setHeader("content-type", "application/json");
  
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method not allowed" }));
    return;
  }
  
  // Parse body manually like in api/claim.ts
  const buffers: Buffer[] = [];
  for await (const chunk of req) buffers.push(chunk as Buffer);
  const bodyRaw = Buffer.concat(buffers).toString("utf8");
  let parsed: any = {};
  try {
    parsed = JSON.parse(bodyRaw || "{}");
  } catch (err: any) {
    console.error("[api/prepare-metatx] Failed to parse body:", err);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "invalid JSON body" }));
    return;
  }
  
  try {
    // Import everything we need
    console.log("[api/prepare-metatx] Starting imports");
    const viem = await import("viem");
    console.log("[api/prepare-metatx] Viem imported");
    const { parseEther, encodeFunctionData, createWalletClient, http } = viem;
    const viemAccounts = await import("viem/accounts");
    console.log("[api/prepare-metatx] Viem accounts imported");
    const { privateKeyToAccount } = viemAccounts;
    
    type ChainKey = "celo" | "mon";
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      celo: "0xc7e8d5e1bc250a396f4b845fe54632251be23421" as `0x${string}`,
      mon: "0x60b430e8083a0c395a7789633fc742d2b3209854" as `0x${string}`,
    };
    
    const { chain, fid, address } = parsed as {
      chain: ChainKey;
      fid: number;
      address: `0x${string}`;
    };

    if (!chain || !fid || !address) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "missing required fields: chain, fid, address" }));
      return;
    }
    
    console.log('[api/prepare-metatx] Request:', { chain, fid, address });

    // Get amount - 0.1 tokens for both chains
    const amountWei = parseEther("0.1");

    // Create voucher
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);

    const voucher = {
      fid: BigInt(fid),
      recipient: address,
      day,
      amountWei,
      deadline,
    };

    // Sign voucher with backend signer
    const signerPk = process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK;
    if (!signerPk || !signerPk.startsWith('0x')) {
      console.error('[api/prepare-metatx] Missing or invalid GAS_SIGNER_PRIVATE_KEY');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Server configuration error: missing signer key' }));
      return;
    }
    
    const signerAccount = privateKeyToAccount(signerPk as `0x${string}`);
    
    const domain = {
      name: "DailyGasClaim", // Try without MetaTx suffix
      version: "1",
      chainId: chain === "celo" ? 42220 : 10143,
      verifyingContract: CONTRACTS[chain],
    };

    const types = {
      Claim: [
        { name: "fid", type: "uint256" },
        { name: "recipient", type: "address" },
        { name: "day", type: "uint256" },
        { name: "amountWei", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;

    // Get RPC URLs
    const RPCS = {
      celo: process.env.CELO_RPC || "https://forno.celo.org",
      mon: process.env.MON_RPC || "https://testnet.monad.network",
    };
    
    console.log(`[api/prepare-metatx] Using RPC for ${chain}:`, RPCS[chain] ? "configured" : "missing");
    
    const client = createWalletClient({ 
      account: signerAccount,
      chain: chain === "celo" ? viem.celo : viem.defineChain({
        id: 10143,
        name: "Monad Testnet",
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [RPCS.mon] } },
      }),
      transport: http(RPCS[chain])
    });

    const voucherSignature = await client.signTypedData({
      domain,
      types,
      primaryType: "Claim",
      message: voucher,
    });

    // ABI for claimWithMetaTx
    const METATX_ABI = [
      {
        name: "claimWithMetaTx",
        type: "function",
        inputs: [
          {
            name: "c",
            type: "tuple",
            components: [
              { name: "fid", type: "uint256" },
              { name: "recipient", type: "address" },
              { name: "day", type: "uint256" },
              { name: "amountWei", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          { name: "signature", type: "bytes" },
        ],
      },
    ] as const;

    // Encode function call
    const functionSignature = encodeFunctionData({
      abi: METATX_ABI,
      functionName: "claimWithMetaTx",
      args: [voucher, voucherSignature],
    });

    // Return data for frontend
    res.statusCode = 200;
    res.end(JSON.stringify({
      voucher: {
        fid: voucher.fid.toString(),
        recipient: voucher.recipient,
        day: voucher.day.toString(),
        amountWei: voucher.amountWei.toString(),
        deadline: voucher.deadline.toString(),
      },
      voucherSignature,
      functionSignature,
      contract: CONTRACTS[chain],
      chainId: domain.chainId,
      domain,
      types: {
        MetaTransaction: [
          { name: "nonce", type: "uint256" },
          { name: "from", type: "address" },
          { name: "functionSignature", type: "bytes" },
        ],
      },
    }));
  } catch (e: any) {
    console.error("[api/prepare-metatx] error:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}