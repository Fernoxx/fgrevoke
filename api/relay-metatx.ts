import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    
    if (!RPCS[chain]) {
      console.error(`[api/relay-metatx] Missing RPC for chain ${chain}`);
      res.status(500).json({ error: `Server configuration error: missing RPC for ${chain}` });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "method not allowed" });
      return;
    }

    const { chain, userAddress, functionSignature, signature } = req.body as {
      chain: ChainKey;
      userAddress: `0x${string}`;
      functionSignature: `0x${string}`;
      signature: `0x${string}`;
    };
    
    console.log('[api/relay-metatx] Request:', { chain, userAddress, hasSignature: !!signature });

    // Parse signature
    const sig = signature.slice(2);
    const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
    const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
    const v = parseInt(sig.slice(128, 130), 16);

    // Create relayer client
    const relayerPk = process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK;
    if (!relayerPk || !relayerPk.startsWith('0x')) {
      console.error('[api/relay-metatx] Missing or invalid GAS_SIGNER_PRIVATE_KEY');
      res.status(500).json({ error: 'Server configuration error: missing signer key' });
      return;
    }
    const relayerAccount = privateKeyToAccount(relayerPk as `0x${string}`);
    
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

    res.status(200).json({ ok: true, txHash });
  } catch (e: any) {
    console.error("[api/relay-metatx] error:", e);
    res.status(500).json({ error: e?.message || "server error" });
  }
}