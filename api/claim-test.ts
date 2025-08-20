import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  console.log('🚀 Test Claim API called:', { method: req.method, timestamp: new Date().toISOString() });
  
  // Set headers early
  res.setHeader("content-type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }
    
    if (req.method !== "POST") {
      console.log('❌ Method not allowed:', req.method);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    // Read request body
    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk as Buffer);
    const bodyRaw = Buffer.concat(buffers).toString("utf8");
    
    console.log('📥 Request body:', bodyRaw);
    
    if (!bodyRaw) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "empty request body" }));
      return;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyRaw);
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "invalid JSON in request body" }));
      return;
    }

    const { chain, fid, address } = parsedBody;
    console.log('📋 Parsed request:', { chain, fid, address: address?.substring(0, 10) + '...' });

    // Check environment variables
    console.log('🔍 Checking environment variables...');
    const envVars = {
      GAS_SIGNER_PRIVATE_KEY: process.env.GAS_SIGNER_PRIVATE_KEY ? 'SET' : 'MISSING',
      BASE_RPC: process.env.BASE_RPC ? 'SET' : 'MISSING',
      CELO_RPC: process.env.CELO_RPC ? 'SET' : 'MISSING',
      MON_RPC: process.env.MON_RPC ? 'SET' : 'MISSING',
      CONTRACT_BASE: process.env.CONTRACT_BASE ? 'SET' : 'MISSING',
      CONTRACT_CELO: process.env.CONTRACT_CELO ? 'SET' : 'MISSING',
      CONTRACT_MON: process.env.CONTRACT_MON ? 'SET' : 'MISSING',
    };
    
    console.log('📋 Environment variables:', envVars);
    
    // Return environment status for debugging
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      ok: false, 
      debug: true,
      message: "Test API - showing environment status",
      envVars,
      request: { chain, fid, hasAddress: !!address },
      timestamp: new Date().toISOString()
    }));
    
  } catch (e: any) {
    console.error('❌ Test API error:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: e?.message || "server error",
      stack: e?.stack,
      timestamp: new Date().toISOString()
    }));
  }
}