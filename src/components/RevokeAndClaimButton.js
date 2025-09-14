import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnections } from "wagmi";
import RevokeHelperABI from "../abis/RevokeHelper.json";
import RevokeAndClaimABI from "../abis/RevokeAndClaim.json";

const REVOKE_HELPER = process.env.REACT_APP_REVOKE_HELPER || "0x3acb4672fec377bd62cf4d9a0e6bdf5f10e5caaf";
const REVOKE_AND_CLAIM = process.env.REACT_APP_REVOKE_AND_CLAIM || "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const ATTESTER_API = process.env.REACT_APP_ATTESTER_API || "https://farguard-attester-production.up.railway.app/attest";

export default function RevokeAndClaimButton({ token, spender, fid, onRevoked, onClaimed, approvalId }) {
  const { address, connector } = useAccount();
  const { writeContract: writeRevokeContract } = useWriteContract();
  const { writeContract: writeClaimContract } = useWriteContract();
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [revokeTxHash, setRevokeTxHash] = useState(null);
  const [claimTxHash, setClaimTxHash] = useState(null);

  async function handleRevoke() {
    try {
      console.log("🔍 RevokeAndClaimButton - handleRevoke called");
      console.log("🔍 Contract addresses:", { REVOKE_HELPER, REVOKE_AND_CLAIM, ATTESTER_API });
      console.log("🔍 Props:", { token, spender, fid });
      console.log("🔍 Wallet info:", { address, connector: connector?.name, connectorId: connector?.id });
      
      const hash = await writeRevokeContract({
        address: REVOKE_HELPER,
        abi: RevokeHelperABI,
        functionName: 'recordRevoked',
        args: [token, spender],
      });
      
      console.log("🔍 Revoke tx hash:", hash);
      setRevokeTxHash(hash);
      
      alert("✅ Revoke transaction sent. Waiting for confirmation...");
      setRevoked(true);
      onRevoked && onRevoked();
    } catch (err) {
      console.error("❌ revoke failed:", err);
      alert("Revoke failed: " + err.message);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);
      console.log("🔍 RevokeAndClaimButton - handleClaim called");
      console.log("🔍 Contract addresses:", { REVOKE_HELPER, REVOKE_AND_CLAIM, ATTESTER_API });
      console.log("🔍 Props:", { token, spender, fid, address });
      
      if (!fid || fid === 0) {
        throw new Error("FID is required for claiming rewards. Please connect with Farcaster wallet.");
      }

      // Step 1: ask backend for attestation
      const requestBody = { wallet: address, fid: Number(fid), token, spender };
      console.log("🔍 Attestation request body:", requestBody);
      
      const res = await fetch(ATTESTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🔍 Attestation response status:", res.status);

      const data = await res.json();
      console.log("🔍 Attestation response data:", data);
      
      if (!res.ok) {
        console.error("🔍 Attestation error details:", { status: res.status, data });
        throw new Error(data.error || data.message || `HTTP ${res.status}: attest error`);
      }

      // Step 2: call RevokeAndClaim
      const hash = await writeClaimContract({
        address: REVOKE_AND_CLAIM,
        abi: RevokeAndClaimABI,
        functionName: 'claimWithAttestation',
        args: [
          BigInt(fid),
          BigInt(data.nonce),
          BigInt(data.deadline),
          token,
          spender,
          data.sig
        ],
      });
      
      console.log("🔍 Claim tx hash:", hash);
      setClaimTxHash(hash);

      alert("🎉 Claim transaction sent! Waiting for confirmation...");
      onClaimed && onClaimed();
    } catch (err) {
      console.error("❌ claim failed:", err);
      alert("Claim failed: " + err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex gap-2">
      {!revoked ? (
        <button 
          onClick={handleRevoke}
          className="border-2 border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Revoke
        </button>
      ) : (
        <button 
          onClick={handleClaim} 
          disabled={claiming || !fid || fid === 0}
          className="border-2 border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          {claiming ? "Claiming..." : !fid || fid === 0 ? "FID Required" : "Claim $FG"}
        </button>
      )}
    </div>
  );
}