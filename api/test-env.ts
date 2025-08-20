import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    env: {
      GAS_SIGNER_PRIVATE_KEY: process.env.GAS_SIGNER_PRIVATE_KEY ? "SET" : "NOT SET",
      CONTRACT_BASE: process.env.CONTRACT_BASE ? "SET" : "NOT SET",
      CONTRACT_CELO: process.env.CONTRACT_CELO ? "SET" : "NOT SET",
      CONTRACT_MON: process.env.CONTRACT_MON ? "SET" : "NOT SET",
      BASE_RPC: process.env.BASE_RPC ? "SET" : "NOT SET",
      CELO_RPC: process.env.CELO_RPC ? "SET" : "NOT SET",
      MON_RPC: process.env.MON_RPC ? "SET" : "NOT SET",
    }
  }));
}