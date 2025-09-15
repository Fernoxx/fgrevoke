import { useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { sdk } from "@farcaster/miniapp-sdk";

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
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState("");

  async function handleRevoke() {
    try {
      console.log("🔍 RevokeAndClaimButton - handleRevoke called");
      console.log("🔍 Using Farcaster Miniapp SDK for wallet interaction");
      
      // Get Ethereum provider from Farcaster Miniapp SDK
      console.log("🌐 Getting Ethereum provider from Farcaster...");
      const ethProvider = await sdk.wallet.getEthereumProvider();
      console.log("✅ Got provider from miniapp SDK");
      
      if (!ethProvider) {
        throw new Error("No wallet provider available from Farcaster.");
      }

      // Use viem to encode the function call (same as working App.js)
      const { encodeFunctionData } = await import('viem');
      
      const data = encodeFunctionData({
        abi: revokeHelperAbi,
        functionName: 'recordRevoked',
        args: [token, spender]
      });

      console.log('📝 Sending revoke transaction via RevokeHelper:', {
        to: REVOKE_HELPER,
        from: address,
        data: data.slice(0, 10) + '...'
      });

      const txHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: REVOKE_HELPER,
          data: data,
        }],
      });

      console.log('✅ Transaction sent:', txHash);
      setStatus("✅ Revoke successful!");
      
      // Set revoked state immediately since transaction was sent successfully
      console.log('🔄 Setting revoked state to true');
      setRevoked(true);
      onRevoked && onRevoked();
      
      // Optional: Wait for transaction confirmation in background
      setTimeout(async () => {
        try {
          let receipt = null;
          let attempts = 0;
          const maxAttempts = 15; // 30 seconds max wait
          
          while (!receipt && attempts < maxAttempts) {
            try {
              receipt = await ethProvider.request({
                method: 'eth_getTransactionReceipt',
                params: [txHash]
              });
              if (!receipt) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                attempts++;
              }
            } catch (e) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              attempts++;
            }
          }
          
          if (receipt) {
            console.log('✅ Transaction confirmed in background:', receipt);
          } else {
            console.log('⚠️ Transaction confirmation timeout, but transaction was sent');
          }
        } catch (e) {
          console.log('⚠️ Background confirmation failed:', e);
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Revoke error:", err);
      setStatus("❌ Revoke failed: " + err.message);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);
      console.log("🔍 RevokeAndClaimButton - handleClaim called");
      console.log("🔍 Using Farcaster Miniapp SDK for wallet interaction");

      // Get Ethereum provider from Farcaster Miniapp SDK
      console.log("🌐 Getting Ethereum provider from Farcaster...");
      const ethProvider = await sdk.wallet.getEthereumProvider();
      console.log("✅ Got provider from miniapp SDK");
      
      if (!ethProvider) {
        throw new Error("No wallet provider available from Farcaster.");
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

      // Use viem to encode the function call
      const { encodeFunctionData } = await import('viem');
      
      const claimData = encodeFunctionData({
        abi: revokeAndClaimAbi,
        functionName: 'claimWithAttestation',
        args: [data.fid, data.nonce, data.deadline, token, spender, data.sig]
      });

      console.log('📝 Sending claim transaction via RevokeAndClaim:', {
        to: REVOKE_AND_CLAIM,
        from: address,
        data: claimData.slice(0, 10) + '...'
      });

      const txHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: REVOKE_AND_CLAIM,
          data: claimData,
        }],
      });

      console.log('✅ Claim transaction sent:', txHash);
      setStatus("⏳ Waiting for claim tx...");
      
      // Wait for transaction confirmation
      let receipt = null;
      while (!receipt) {
        try {
          receipt = await ethProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          });
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          }
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      }
      
      setStatus("✅ Claim successful!");
      onClaimed && onClaimed();
    } catch (err) {
      console.error("❌ Claim failed:", err);
      setStatus("❌ Claim failed: " + err.message);
    } finally {
      setClaiming(false);
    }
  }

  console.log('🔍 RevokeAndClaimButton render - revoked:', revoked, 'claiming:', claiming);
  
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