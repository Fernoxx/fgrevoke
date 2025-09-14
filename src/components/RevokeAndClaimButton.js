import React, { useState } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { CONTRACTS, REVOKE_AND_CLAIM_ABI } from "../lib/contracts";

export default function RevokeAndClaimButton({ fid, token, spender }) {
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState("");

  async function handleClaim() {
    console.log("🔍 RevokeAndClaimButton - handleClaim called");
    console.log("🔍 Wallet state:", { address, isConnected, hasWalletClient: !!walletClient });
    console.log("🔍 Props:", { fid, token, spender });
    
    if (!isConnected || !address) {
      setStatus("⚠️ Connect wallet first");
      return;
    }
    
    if (!walletClient) {
      setStatus("⚠️ Wallet client not ready");
      return;
    }
    
    if (!fid || !token || !spender) {
      setStatus("❌ Missing required data (FID, token, or spender)");
      return;
    }
    
    try {
      setStatus("⏳ Getting attestation...");
      
      const requestBody = { 
        wallet: address, 
        fid: Number(fid), 
        token, 
        spender 
      };
      
      console.log("🔍 Sending attestation request:", requestBody);
      
      // 1. Get attestation from backend
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🔍 Attestation response status:", res.status);
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "attestation failed");

      const { sig, nonce, deadline } = data;
      console.log("🔍 Received attestation:", { sig: sig?.slice(0, 10) + "...", nonce, deadline });

      setStatus("⏳ Sending tx...");
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.revokeAndClaim,
        abi: REVOKE_AND_CLAIM_ABI,
        functionName: "claimWithAttestation",
        args: [
          BigInt(fid),
          BigInt(nonce),
          BigInt(deadline),
          token,
          spender,
          sig,                                      // backend-signed EIP-712 attestation
        ],
      });
      setStatus(`✅ Tx sent: ${txHash}`);
    } catch (err) {
      console.error("❌ RevokeAndClaimButton error:", err);
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div>
      <button 
        onClick={handleClaim}
        disabled={!isConnected || !address || !fid || !token || !spender}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      >
        Revoke & Claim
      </button>
      {!fid && (
        <p className="mt-1 text-xs text-gray-500">
          Farcaster users only
        </p>
      )}
      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}