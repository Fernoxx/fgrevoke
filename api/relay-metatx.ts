import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  console.log("[api/relay-metatx] Handler started");
  try {
    const viem = await import("viem");
    const { createWalletClient, http } = viem;
    const viemAccounts = await import("viem/accounts");
    const { privateKeyToAccount } = viemAccounts;
    const viemChains = await import("viem/chains");
    const { celo } = viemChains;
    
    type ChainKey = "celo" | "mon";
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      celo: "0xc7e8d5e1bc250a396f4b845fe54632251be23421" as `0x${string}`,
      mon: "0x60b430e8083a0c395a7789633fc742d2b3209854" as `0x${string}`,
    };
    
    const RPCS: Record<ChainKey, string> = {
      celo: process.env.CELO_RPC || "https://forno.celo.org",
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

    const { chain, userAddress, functionSignature, signature } = parsed as {
      chain: ChainKey;
      userAddress: `0x${string}`;
      functionSignature: `0x${string}`;
      signature: `0x${string}`;
    };

    // Parse signature
    const sig = signature.slice(2);
    const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
    const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
    const v = parseInt(sig.slice(128, 130), 16);

    // Create relayer client
    const relayerPk = process.env.GAS_SIGNER_PRIVATE_KEY as `0x${string}`;
    const relayerAccount = privateKeyToAccount(relayerPk);
    
    const chainConfig = chain === "celo" 
      ? celo 
      : { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 } };
    
    const client = createWalletClient({
      account: relayerAccount,
      chain: chainConfig as any,
      transport: http(RPCS[chain]),
    });

    const METATX_ABI = [
      {
        name: "executeMetaTransaction",
        type: "function",
        inputs: [
          { name: "userAddress", type: "address" },
          { name: "functionSignature", type: "bytes" },
          { name: "sigR", type: "bytes32" },
          { name: "sigS", type: "bytes32" },
          { name: "sigV", type: "uint8" },
        ],
        outputs: [{ name: "", type: "bytes" }],
      },
    ] as const;

    // Send meta-transaction
    const txHash = await client.writeContract({
      address: CONTRACTS[chain],
      abi: METATX_ABI,
      functionName: "executeMetaTransaction",
      args: [userAddress, functionSignature, r, s, v],
    });

    console.log(`[api/relay-metatx] Transaction sent:`, txHash);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (e: any) {
    console.error("[api/relay-metatx] error:", e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}