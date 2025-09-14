import React, { useState } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { CONTRACTS, REVOKE_AND_CLAIM_ABI } from "../lib/contracts";

export default function RevokeAndClaimButton({ fid, token, spender }) {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [status, setStatus] = useState("");

  async function handleClaim() {
    if (!walletClient) {
      setStatus("⚠️ Connect wallet first");
      return;
    }
    try {
      setStatus("⏳ Getting attestation...");
      
      // 1. Get attestation from backend
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, fid, token, spender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "attestation failed");

      const { sig, nonce, deadline } = data;

      setStatus("⏳ Sending tx...");
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.revokeAndClaim,
        abi: REVOKE_AND_CLAIM_ABI,
        functionName: "claimWithAttestation",
        args: [
          fid,
          nonce,
          deadline,
          token,
          spender,
          sig,                                      // backend-signed EIP-712 attestation
        ],
      });
      setStatus(`✅ Tx sent: ${txHash}`);
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div>
      <button 
        onClick={handleClaim}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      >
        Revoke & Claim
      </button>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}