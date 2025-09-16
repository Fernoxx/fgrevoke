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
    const { wallet, token, spender } = parsed as {
      wallet: string;
      token: string;
      spender: string;
    };
    
    if (!wallet || !token || !spender) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "missing required fields: wallet, token, spender" }));
      return;
    }
    
    console.log('[api/attest] Request:', { wallet, token, spender });
    
    // Look up user's FID from Neynar API
    console.log('[api/attest] Looking up FID for wallet:', wallet);
    let userFid: number;
    
    try {
      const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet}`, {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY || '',
        }
      });
      
      if (!neynarResponse.ok) {
        throw new Error(`Neynar API error: ${neynarResponse.status}`);
      }
      
      const neynarData = await neynarResponse.json();
      console.log('[api/attest] Neynar response:', neynarData);
      
      if (!neynarData.users || neynarData.users.length === 0) {
        throw new Error('User not found in Neynar');
      }
      
      userFid = neynarData.users[0].fid;
      console.log('[api/attest] Found FID:', userFid);
      
    } catch (neynarError) {
      console.error('[api/attest] Neynar lookup failed:', neynarError);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Failed to lookup user FID from Neynar" }));
      return;
    }
    
    // TODO: Implement actual verification logic
    // 1. Verify custodyOf(fid) on Optimism (IdRegistry)
    // 2. Verify Revoked(wallet,token,spender) log on Base
    // 3. Sign EIP-712 attestation
    
    // For now, return a mock attestation with correct FID
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    const sig = "0x" + "0".repeat(130); // Mock signature
    
    console.log('[api/attest] Returning mock attestation:', { nonce, deadline, sig, fid: userFid });
    
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      ok: true, 
      sig,
      nonce,
      deadline,
      fid: userFid  // Return the correct FID from Neynar
    }));
    
  } catch (e: any) {
    console.error("[api/attest] error:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}