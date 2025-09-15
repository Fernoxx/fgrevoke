import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const REVOKE_HELPER = "0x3acb4672fec377bd62cf4d9a0e6bdf5f10e5caaf";
const REVOKE_AND_CLAIM = "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const ATTESTER_API = "https://farguard-attester-production.up.railway.app/attest";

// Minimal ABI
const revokeHelperAbi = [
  {
    "type": "function",
    "name": "recordRevoked",
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRevoked",
    "inputs": [
      { "name": "wallet", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  }
];

const revokeAndClaimAbi = [
  {
    "type": "function",
    "name": "claimWithAttestation",
    "inputs": [
      { "name": "fid", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "token", "type": "address" },
      { "name": "spender", "type": "address" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

export default function RevokeAndClaimButton({ token, spender, fid, onRevoked, onClaimed }) {
  const { address } = useAccount();
  const { writeContract: writeRevokeContract } = useWriteContract();
  const { writeContract: writeClaimContract } = useWriteContract();
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState("");

  async function handleRevoke() {
    try {
      console.log("🔍 RevokeAndClaimButton - handleRevoke called");
      console.log("🔍 Using wagmi hooks for Farcaster wallet");
      
      const hash = await writeRevokeContract({
        address: REVOKE_HELPER,
        abi: revokeHelperAbi,
        functionName: 'recordRevoked',
        args: [token, spender],
      });
      
      console.log("🔍 Revoke tx hash:", hash);
      setStatus("⏳ Waiting for revoke tx...");
      setRevoked(true);
      onRevoked && onRevoked();
      setStatus("✅ Revoke transaction sent!");
    } catch (err) {
      console.error("❌ Revoke error:", err);
      setStatus("❌ Revoke failed: " + err.message);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);
      console.log("🔍 RevokeAndClaimButton - handleClaim called");
      console.log("🔍 Using wagmi hooks for Farcaster wallet");

      // Call attester backend
      const body = { wallet: address, token, spender };
      console.log("🔍 Attestation request body:", body);
      const resp = await fetch(ATTESTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      console.log("🔍 Attestation response:", data);
      if (!resp.ok) throw new Error(data.error || "Attestation failed");

      // Call contract claim using wagmi
      const hash = await writeClaimContract({
        address: REVOKE_AND_CLAIM,
        abi: revokeAndClaimAbi,
        functionName: 'claimWithAttestation',
        args: [
          BigInt(data.fid),
          BigInt(data.nonce),
          BigInt(data.deadline),
          token,
          spender,
          data.sig
        ],
      });
      
      console.log("🔍 Claim tx hash:", hash);
      setStatus("⏳ Waiting for claim tx...");
      onClaimed && onClaimed();
      setStatus("✅ Claim transaction sent!");
    } catch (err) {
      console.error("❌ Claim failed:", err);
      setStatus("❌ Claim failed: " + err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div>
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
          disabled={claiming}
          className="border-2 border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          {claiming ? "Claiming..." : "Claim $FG"}
        </button>
      )}
      {status && <div className="mt-2 text-sm">{status}</div>}
    </div>
  );
}