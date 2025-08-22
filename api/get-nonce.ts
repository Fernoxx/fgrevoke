import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  console.log("[api/get-nonce] Handler started");
  
  res.setHeader("content-type", "application/json");
  
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method not allowed" }));
    return;
  }
  
  // Parse body manually
  const buffers: Buffer[] = [];
  for await (const chunk of req) buffers.push(chunk as Buffer);
  const bodyRaw = Buffer.concat(buffers).toString("utf8");
  let parsed: any = {};
  try {
    parsed = JSON.parse(bodyRaw || "{}");
  } catch (err: any) {
    console.error("[api/get-nonce] Failed to parse body:", err);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "invalid JSON body" }));
    return;
  }
  
  try {
    const viem = await import("viem");
    const { createPublicClient, http } = viem;
    
    type ChainKey = "celo" | "mon";
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      celo: "0xc7e8d5e1bc250a396f4b845fe54632251be23421" as `0x${string}`,
      mon: "0x60b430e8083a0c395a7789633fc742d2b3209854" as `0x${string}`,
    };
    
    const RPCS: Record<ChainKey, string> = {
      celo: process.env.CELO_RPC || "https://forno.celo.org",
      mon: process.env.MON_RPC || "https://testnet.monad.network",
    };
    
    const { chain, userAddress } = parsed as {
      chain: ChainKey;
      userAddress: `0x${string}`;
    };
    
    if (!chain || !userAddress) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "missing required fields: chain, userAddress" }));
      return;
    }
    
    console.log('[api/get-nonce] Request:', { chain, userAddress });
    
    const chainConfig = chain === "celo" ? viem.celo : viem.defineChain({
      id: 10143,
      name: "Monad Testnet",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [RPCS.mon] } },
    });
    
    const publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(RPCS[chain]),
    });
    
    const NONCE_ABI = [
      {
        name: "getNonce",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "user", type: "address" }],
        outputs: [{ name: "nonce_", type: "uint256" }],
      },
    ] as const;
    
    try {
      const nonce = await publicClient.readContract({
        address: CONTRACTS[chain],
        abi: NONCE_ABI,
        functionName: "getNonce",
        args: [userAddress],
      });
      
      console.log(`[api/get-nonce] Nonce for ${userAddress} on ${chain}:`, nonce.toString());
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        ok: true, 
        nonce: nonce.toString(),
        userAddress,
        chain
      }));
    } catch (error: any) {
      console.error(`[api/get-nonce] Failed to read nonce:`, error);
      // Return 0 as default if contract call fails
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        ok: true, 
        nonce: "0",
        userAddress,
        chain,
        error: "Failed to read nonce, using default 0"
      }));
    }
  } catch (e: any) {
    console.error("[api/get-nonce] error:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}