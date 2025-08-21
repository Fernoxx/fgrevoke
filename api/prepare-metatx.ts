import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  console.log("[api/prepare-metatx] Handler started");
  try {
    // Dynamic imports
    const viem = await import("viem");
    const { parseEther, encodeFunctionData } = viem;
    const viemAccounts = await import("viem/accounts");
    const { privateKeyToAccount } = viemAccounts;
    const priceModule = await import("../lib/price");
    const { weiForUsd } = priceModule;
    
    type ChainKey = "celo" | "mon";
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      celo: "0xc7e8d5e1bc250a396f4b845fe54632251be23421" as `0x${string}`,
      mon: "0x60b430e8083a0c395a7789633fc742d2b3209854" as `0x${string}`,
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

    // Get amount
    const amountWei = chain === "celo" ? parseEther("0.1") : parseEther("0.1");

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
    const signerPk = process.env.GAS_SIGNER_PRIVATE_KEY as `0x${string}`;
    const signerAccount = privateKeyToAccount(signerPk);
    
    const domain = {
      name: "DailyGasClaimMetaTx",
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

    const client = viem.createWalletClient({ 
      account: signerAccount,
      chain: chain === "celo" ? { id: 42220, name: "Celo" } : { id: 10143, name: "Monad" },
      transport: viem.http()
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

    // Get nonce - for now return 0, frontend should fetch actual nonce
    
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
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
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}