import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  console.log("[api/attest] Handler started");
  
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
    console.error("[api/attest] Failed to parse body:", err);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "invalid JSON body" }));
    return;
  }
  
  try {
    const { wallet, fid, token, spender } = parsed as {
      wallet: string;
      fid: number;
      token: string;
      spender: string;
    };
    
    if (!wallet || !fid || !token || !spender) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "missing required fields: wallet, fid, token, spender" }));
      return;
    }
    
    console.log('[api/attest] Request:', { wallet, fid, token, spender });
    
    // TODO: Implement actual verification logic
    // 1. Verify custodyOf(fid) on Optimism (IdRegistry)
    // 2. Verify Revoked(wallet,token,spender) log on Base
    // 3. Sign EIP-712 attestation
    
    // For now, return a mock attestation
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    const sig = "0x" + "0".repeat(130); // Mock signature
    
    console.log('[api/attest] Returning mock attestation:', { nonce, deadline, sig });
    
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      ok: true, 
      sig,
      nonce,
      deadline,
      fid
    }));
    
  } catch (e: any) {
    console.error("[api/attest] error:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}