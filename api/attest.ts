import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
    const { wallet, token, spender, captchaToken } = parsed as {
      wallet: string;
      token: string;
      spender: string;
      captchaToken?: string;
    };
    
    if (!wallet || !token || !spender) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "missing required fields: wallet, token, spender" }));
      return;
    }

    // Verify CAPTCHA token
    if (!captchaToken) {
      console.error('[api/attest] No CAPTCHA token provided');
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "CAPTCHA verification required" }));
      return;
    }

    console.log('[api/attest] Verifying CAPTCHA token...');
    try {
      const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY || '',
          response: captchaToken,
          remoteip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
        })
      });

      const captchaResult = await captchaResponse.json();
      console.log('[api/attest] CAPTCHA verification result:', captchaResult);

      if (!captchaResult.success) {
        console.error('[api/attest] CAPTCHA verification failed:', captchaResult['error-codes']);
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "CAPTCHA verification failed" }));
        return;
      }
    } catch (captchaError) {
      console.error('[api/attest] CAPTCHA verification error:', captchaError);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "CAPTCHA verification service error" }));
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
      
      // Ensure FID is valid (not 0 or undefined)
      if (!userFid || userFid === 0) {
        throw new Error('Invalid FID: User must have a valid Farcaster ID');
      }
      
    } catch (neynarError) {
      console.error('[api/attest] Neynar lookup failed:', neynarError);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Failed to lookup user FID from Neynar" }));
      return;
    }
    
    // Check if user has actually revoked using RevokeHelper
    console.log('[api/attest] Checking revocation in database...');
    const { data: revocationData, error: revocationError } = await supabase
      .from('revocations')
      .select('*')
      .eq('wallet', wallet.toLowerCase())
      .eq('token', token.toLowerCase())
      .eq('spender', spender.toLowerCase())
      .single();
    
    if (revocationError && revocationError.code !== 'PGRST116') {
      console.error('[api/attest] Database error:', revocationError);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Database error checking revocation" }));
      return;
    }
    
    if (!revocationData) {
      console.log('[api/attest] User has not revoked using RevokeHelper');
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "User must revoke using RevokeHelper before claiming" }));
      return;
    }
    
    console.log('[api/attest] Revocation found:', revocationData);
    
    // Verify the FID in database matches the one from Neynar
    if (revocationData.fid !== userFid) {
      console.error('[api/attest] FID mismatch:', { 
        databaseFid: revocationData.fid, 
        neynarFid: userFid 
      });
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "FID verification failed - database and Neynar FIDs do not match" }));
      return;
    }
    
    // Generate EIP-712 signature for the attestation
    const nonce = Math.floor(Math.random() * 1000000000); // Larger nonce range
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now (shorter window)
    
    // Additional security validations
    if (userFid < 1 || userFid > 1000000) {
      console.error('[api/attest] Invalid FID range:', userFid);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid FID range" }));
      return;
    }
    
    // Generate proper EIP-712 signature using the attester's private key
    const attesterPrivateKey = process.env.ATTESTER_PRIVATE_KEY;
    if (!attesterPrivateKey) {
      console.error('[api/attest] ATTESTER_PRIVATE_KEY not set - claims disabled for security');
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Attester not properly configured - claims temporarily disabled" }));
      return;
    }
    
    const attesterWallet = new ethers.Wallet(attesterPrivateKey);
    
    // EIP-712 domain and types for the attestation - FIXED to match contract
    const domain = {
      name: "RevokeAndClaim",
      version: "1",
      chainId: 8453, // Base mainnet
      verifyingContract: "0x547541959d2f7dba7dad4cac7f366c25400a49bc" // RevokeAndClaim contract address
    };
    
    const types = {
      Attestation: [
        { name: "fid", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "token", type: "address" },
        { name: "spender", type: "address" }
      ]
    };
    
    const message = {
      fid: userFid,
      nonce: nonce,
      deadline: deadline,
      token: token,
      spender: spender
    };
    
    const sig = await attesterWallet.signTypedData(domain, types, message);
    
    console.log('[api/attest] Generated attestation:', { 
      fid: userFid, 
      nonce, 
      deadline,
      sig: sig.substring(0, 10) + "...",
      attesterAddress: attesterWallet.address,
      domain: domain,
      message: message
    });
    
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