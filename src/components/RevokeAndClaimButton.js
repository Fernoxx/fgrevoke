import { useState } from "react";
import { ethers } from "ethers";

const REVOKE_HELPER = "0x3acb4672fec377bd62cf4d9a0e6bdf5f10e5caaf";
const REVOKE_AND_CLAIM = "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const ATTESTER_API = "https://farguard-attester-production.up.railway.app/attest";

// Minimal ABI
const revokeHelperAbi = [
  "function recordRevoked(address token, address spender) external",
  "event Revoked(address indexed wallet, address indexed token, address indexed spender)"
];
const revokeAndClaimAbi = [
  "function claimWithAttestation(uint256 fid,uint256 nonce,uint256 deadline,address token,address spender,bytes signature) external"
];

export default function RevokeAndClaimButton({ token, spender, fid }) {
  const [status, setStatus] = useState("");

  async function handleRevoke() {
    try {
      if (!window.ethereum) throw new Error("No wallet");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const helper = new ethers.Contract(REVOKE_HELPER, revokeHelperAbi, signer);

      const tx = await helper.recordRevoked(token, spender);
      setStatus("⏳ Waiting for revoke tx...");
      await tx.wait();
      setStatus("✅ Revoke successful!");
    } catch (err) {
      console.error("Revoke error:", err);
      setStatus("❌ Revoke failed");
    }
  }

  async function handleClaim() {
    try {
      if (!window.ethereum) throw new Error("No wallet");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const wallet = await signer.getAddress();

      // Call attester backend
      const body = { wallet, token, spender };
      console.log("🔍 Attestation request body:", body);
      const resp = await fetch(ATTESTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      console.log("Attestation response:", data);
      if (!resp.ok) throw new Error(data.error || "Attestation failed");

      // Call contract claim
      const contract = new ethers.Contract(REVOKE_AND_CLAIM, revokeAndClaimAbi, signer);
      const tx = await contract.claimWithAttestation(
        data.fid,
        data.nonce,
        data.deadline,
        token,
        spender,
        data.sig
      );
      setStatus("⏳ Waiting for claim tx...");
      await tx.wait();
      setStatus("✅ Claim successful!");
    } catch (err) {
      console.error("❌ claim failed:", err);
      setStatus("❌ Claim failed");
    }
  }

  return (
    <div>
      <button onClick={handleRevoke}>Revoke</button>
      <button onClick={handleClaim}>Claim</button>
      <div>{status}</div>
    </div>
  );
}