import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  console.log("[api/relay-metatx] Handler started");
  
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
    console.error("[api/relay-metatx] Failed to parse body:", err);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "invalid JSON body" }));
    return;
  }
  
  try {
    const { createWalletClient, http, createPublicClient, defineChain } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { celo } = await import("viem/chains");
    
    type ChainKey = "celo" | "mon";
    
    const CONTRACTS: Record<ChainKey, `0x${string}`> = {
      celo: "0xc7e8d5e1bc250a396f4b845fe54632251be23421" as `0x${string}`,
      mon: "0x60b430e8083a0c395a7789633fc742d2b3209854" as `0x${string}`,
    };
    
    const RPCS: Record<ChainKey, string> = {
      celo: process.env.CELO_RPC || "https://forno.celo.org",
      mon: process.env.MON_RPC || "https://testnet.monad.network",
    };
    
    const { chain, userAddress, functionSignature, signature } = parsed as {
      chain: ChainKey;
      userAddress: `0x${string}`;
      functionSignature: `0x${string}`;
      signature: `0x${string}`;
    };
    
    console.log('[api/relay-metatx] Request:', { chain, userAddress, hasSignature: !!signature });
    console.log(`[api/relay-metatx] RPC for ${chain}:`, RPCS[chain] ? 'configured' : 'missing');
    
    if (!RPCS[chain]) {
      console.error(`[api/relay-metatx] Missing RPC for chain ${chain}`);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: `Server configuration error: missing RPC for ${chain}` }));
      return;
    }

    // Parse signature
    const sig = signature.slice(2);
    const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
    const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
    const v = parseInt(sig.slice(128, 130), 16);

    // Create relayer client
    const relayerPk = process.env.GAS_SIGNER_PRIVATE_KEY || process.env.SIGNER_PK;
    if (!relayerPk || !relayerPk.startsWith('0x')) {
      console.error('[api/relay-metatx] Missing or invalid GAS_SIGNER_PRIVATE_KEY');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Server configuration error: missing signer key' }));
      return;
    }
    
    const relayerAccount = privateKeyToAccount(relayerPk as `0x${string}`);
    
    const chainConfig = chain === "celo" 
      ? celo
      : defineChain({
          id: 10143,
          name: "Monad Testnet", 
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls: { default: { http: [RPCS[chain]] } }
        });
    
    const client = createWalletClient({
      account: relayerAccount,
      chain: chainConfig,
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

    // First check signer balance
    console.log(`[api/relay-metatx] Relayer address:`, relayerAccount.address);
    
    try {
      // Create a public client to check balance
      const publicClient = createPublicClient({
        chain: chainConfig,
        transport: http(RPCS[chain]),
      });
      
      const balance = await publicClient.getBalance({
        address: relayerAccount.address,
      });
      
      console.log(`[api/relay-metatx] Relayer balance on ${chain}:`, balance.toString(), 'wei');
      
      if (balance === 0n) {
        console.error(`[api/relay-metatx] Relayer has 0 balance on ${chain}`);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `Gas signer has no ${chain.toUpperCase()} balance` }));
        return;
      }
      
      // Also check contract balance
      const contractBalance = await publicClient.getBalance({
        address: CONTRACTS[chain],
      });
      console.log(`[api/relay-metatx] Contract balance on ${chain}:`, contractBalance.toString(), 'wei');
      
      if (contractBalance === 0n) {
        console.error(`[api/relay-metatx] CONTRACT has 0 balance on ${chain}`);
        console.error(`[api/relay-metatx] You need to fund the contract at ${CONTRACTS[chain]} with MON`);
      }
      
      // Log amount being claimed (0.1 tokens)
      const { parseEther } = await import("viem");
      const claimAmount = parseEther("0.1");
      console.log(`[api/relay-metatx] Claim amount: ${claimAmount.toString()} wei (0.1 ${chain.toUpperCase()})`);
      console.log(`[api/relay-metatx] Contract has enough? ${contractBalance >= claimAmount}`);
      
      if (contractBalance < claimAmount) {
        console.error(`[api/relay-metatx] CONTRACT INSUFFICIENT: Has ${contractBalance.toString()} but needs ${claimAmount.toString()}`);
      }
      
      // Parse the function signature to get FID
      try {
        const { decodeFunctionData } = await import("viem");
        const decodedData = decodeFunctionData({
          abi: [{
            name: "claim",
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
          }],
          data: functionSignature as `0x${string}`,
        });
        console.log(`[api/relay-metatx] Decoded claim data:`, {
          fid: decodedData.args[0].fid.toString(),
          day: decodedData.args[0].day.toString(),
          amountWei: decodedData.args[0].amountWei.toString(),
        });
      } catch (decodeErr) {
        console.error(`[api/relay-metatx] Failed to decode function data:`, decodeErr);
      }
      
      // Check if contract has code
      const contractCode = await publicClient.getBytecode({
        address: CONTRACTS[chain],
      });
      console.log(`[api/relay-metatx] Contract has code:`, contractCode ? 'YES' : 'NO');
      if (!contractCode) {
        console.error(`[api/relay-metatx] No contract deployed at ${CONTRACTS[chain]}`);
      }
    } catch (balanceError) {
      console.error(`[api/relay-metatx] Failed to check balance:`, balanceError);
    }
    
    // Send meta-transaction
    console.log(`[api/relay-metatx] Sending transaction with args:`, {
      userAddress,
      functionSignature: functionSignature.slice(0, 10) + '...',
      r, s, v
    });
    
    // Add gas estimation to see if it would fail
    try {
      const gasEstimate = await client.estimateContractGas({
        address: CONTRACTS[chain],
        abi: METATX_ABI,
        functionName: "executeMetaTransaction",
        args: [userAddress, functionSignature, r, s, v],
      });
      console.log(`[api/relay-metatx] Gas estimate:`, gasEstimate.toString());
    } catch (estimateError: any) {
      console.error(`[api/relay-metatx] Gas estimation failed:`, estimateError);
      console.error(`[api/relay-metatx] Full error:`, JSON.stringify(estimateError, null, 2));
      
      // Check different error types
      let errorMessage = "Transaction would fail";
      if (estimateError.message?.includes('insufficient balance')) {
        console.error(`[api/relay-metatx] Contract reverted with insufficient balance`);
        console.error(`[api/relay-metatx] This likely means the contract at ${CONTRACTS[chain]} doesn't have MON to distribute`);
        errorMessage = `Contract has insufficient ${chain.toUpperCase()} balance to distribute`;
      } else if (estimateError.message?.includes('signature')) {
        console.error(`[api/relay-metatx] Signature verification failed`);
        console.error(`[api/relay-metatx] This could be due to domain name mismatch or nonce issue`);
        errorMessage = "Signature verification failed";
      } else if (estimateError.message?.includes('Already claimed')) {
        console.error(`[api/relay-metatx] User already claimed today`);
        errorMessage = "Already claimed today";
      }
      
      // Extract revert reason if available
      const revertReason = estimateError.shortMessage || estimateError.reason || estimateError.message;
      console.error(`[api/relay-metatx] Revert reason:`, revertReason);
      
      // Log the function being called
      console.error(`[api/relay-metatx] Function signature:`, functionSignature.slice(0, 10));
      console.error(`[api/relay-metatx] Contract address:`, CONTRACTS[chain]);
      console.error(`[api/relay-metatx] User address:`, userAddress);
      
      // Return error response and exit early
      res.statusCode = 400;
      res.end(JSON.stringify({ 
        error: errorMessage,
        details: revertReason,
        contractBalance: contractBalance.toString(),
        contractAddress: CONTRACTS[chain]
      }));
      return;
    }
    
    const txHash = await client.writeContract({
      address: CONTRACTS[chain],
      abi: METATX_ABI,
      functionName: "executeMetaTransaction",
      args: [userAddress, functionSignature, r, s, v],
    });

    console.log(`[api/relay-metatx] Transaction sent:`, txHash);

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, txHash }));
  } catch (e: any) {
    console.error("[api/relay-metatx] error:", e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || "server error" }));
  }
}