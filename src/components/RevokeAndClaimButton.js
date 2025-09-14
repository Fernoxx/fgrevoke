import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import RevokeHelperABI from "../abis/RevokeHelper.json";
import RevokeAndClaimABI from "../abis/RevokeAndClaim.json";

const REVOKE_HELPER = process.env.REACT_APP_REVOKE_HELPER || "0x3acb4672fec377bd62cf4d9a0e6bdf5f10e5caaf";
const REVOKE_AND_CLAIM = process.env.REACT_APP_REVOKE_AND_CLAIM || "0x547541959d2f7dba7dad4cac7f366c25400a49bc";
const ATTESTER_API = process.env.REACT_APP_ATTESTER_API || "https://farguard-attester-production.up.railway.app/attest";

export default function RevokeAndClaimButton({ token, spender, fid, onRevoked, onClaimed }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);

  async function handleRevoke() {
    try {
      console.log("🔍 RevokeAndClaimButton - handleRevoke called");
      console.log("🔍 Contract addresses:", { REVOKE_HELPER, REVOKE_AND_CLAIM, ATTESTER_API });
      console.log("🔍 Props:", { token, spender, fid });
      
      const provider = new ethers.providers.Web3Provider(walletClient);
      const signer = provider.getSigner();

      const helper = new ethers.Contract(REVOKE_HELPER, RevokeHelperABI, signer);

      const tx = await helper.recordRevoked(token, spender);
      await tx.wait();

      alert("✅ Revoked recorded. Now you can claim.");
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

      // Step 1: ask backend for attestation
      const res = await fetch(ATTESTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, fid, token, spender }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "attest error");

      // Step 2: call RevokeAndClaim
      const provider = new ethers.providers.Web3Provider(walletClient);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(REVOKE_AND_CLAIM, RevokeAndClaimABI, signer);

      const tx = await contract.claimWithAttestation(
        fid,
        data.nonce,
        data.deadline,
        token,
        spender,
        data.sig
      );
      await tx.wait();

      alert("🎉 Claimed FG reward!");
      onClaimed && onClaimed();
    } catch (err) {
      console.error("❌ claim failed:", err);
      alert("Claim failed: " + err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div>
      {!revoked ? (
        <button onClick={handleRevoke}>Revoke</button>
      ) : (
        <button onClick={handleClaim} disabled={claiming}>
          {claiming ? "Claiming..." : "Claim FG"}
        </button>
      )}
    </div>
  );
}