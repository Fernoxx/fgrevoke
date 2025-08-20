import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  try {
    // Test basic imports
    const viem = await import("../lib/viem");
    const voucher = await import("../lib/voucher");
    const price = await import("../lib/price");
    
    // Test environment variables
    const envCheck = {
      GAS_SIGNER_PRIVATE_KEY: !!process.env.GAS_SIGNER_PRIVATE_KEY,
      CONTRACT_BASE: process.env.CONTRACT_BASE || "NOT SET",
      CONTRACT_CELO: process.env.CONTRACT_CELO || "NOT SET", 
      CONTRACT_MON: process.env.CONTRACT_MON || "NOT SET",
      BASE_RPC: process.env.BASE_RPC || "NOT SET",
      CELO_RPC: process.env.CELO_RPC || "NOT SET",
      MON_RPC: process.env.MON_RPC || "NOT SET",
    };
    
    // Test if we can access the functions
    const testResults = {
      imports: {
        viem: !!viem,
        voucher: !!voucher,
        price: !!price,
        signerClient: typeof viem.signerClient === "function",
        signDailyVoucher: typeof voucher.signDailyVoucher === "function",
        weiForUsd: typeof price.weiForUsd === "function",
      },
      env: envCheck,
      chains: Object.keys(viem.CHAINS || {}),
      contracts: Object.keys(viem.CONTRACTS || {}),
    };
    
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(testResults, null, 2));
  } catch (error: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    }));
  }
}