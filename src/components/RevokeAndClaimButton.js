import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

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
  const { data: walletClient } = useWalletClient();
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState("");

  async function handleRevoke() {
    try {
      console.log("🔍 RevokeAndClaimButton - handleRevoke called");
      console.log("🔍 Wallet state:", { address, walletClient: !!walletClient, hasWindowEthereum: !!window.ethereum });
      
      let provider;
      
      // Try walletClient first, fallback to window.ethereum
      if (walletClient) {
        console.log("🔍 Using walletClient");
        provider = new ethers.providers.Web3Provider(walletClient);
      } else if (window.ethereum) {
        console.log("🔍 Using window.ethereum as fallback");
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } else {
        throw new Error("No wallet provider available");
      }

      const signer = provider.getSigner();
      const helper = new ethers.Contract(REVOKE_HELPER, revokeHelperAbi, signer);

      console.log("🔍 Calling recordRevoked with:", { token, spender });
      const tx = await helper.recordRevoked(token, spender);
      
      console.log("🔍 Revoke tx hash:", tx.hash);
      setStatus("⏳ Waiting for revoke tx...");
      await tx.wait();
      
      setStatus("✅ Revoke successful!");
      setRevoked(true);
      onRevoked && onRevoked();
    } catch (err) {
      console.error("❌ Revoke error:", err);
      setStatus("❌ Revoke failed: " + err.message);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);
      console.log("🔍 RevokeAndClaimButton - handleClaim called");
      console.log("🔍 Wallet state:", { address, walletClient: !!walletClient, hasWindowEthereum: !!window.ethereum });

      let provider;
      
      // Try walletClient first, fallback to window.ethereum
      if (walletClient) {
        console.log("🔍 Using walletClient");
        provider = new ethers.providers.Web3Provider(walletClient);
      } else if (window.ethereum) {
        console.log("🔍 Using window.ethereum as fallback");
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } else {
        throw new Error("No wallet provider available");
      }

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

      // Call contract claim using ethers
      const signer = provider.getSigner();
      const contract = new ethers.Contract(REVOKE_AND_CLAIM, revokeAndClaimAbi, signer);
      
      console.log("🔍 Calling claimWithAttestation with:", {
        fid: data.fid,
        nonce: data.nonce,
        deadline: data.deadline,
        token,
        spender,
        sig: data.sig?.slice(0, 10) + "..."
      });
      
      const tx = await contract.claimWithAttestation(
        data.fid,
        data.nonce,
        data.deadline,
        token,
        spender,
        data.sig
      );
      
      console.log("🔍 Claim tx hash:", tx.hash);
      setStatus("⏳ Waiting for claim tx...");
      await tx.wait();
      
      setStatus("✅ Claim successful!");
      onClaimed && onClaimed();
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