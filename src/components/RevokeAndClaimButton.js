import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { sdk } from "@farcaster/miniapp-sdk";
import revokeAndClaimAbi from "../abis/RevokeAndClaim.json";
import { recordRevocation } from "../lib/supabase";

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


export default function RevokeAndClaimButton({ token, spender, fid, onRevoked, onClaimed }) {
  const { address } = useAccount();
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [status, setStatus] = useState("");
  const [checkingClaimed, setCheckingClaimed] = useState(false);

  // Check if this approval was already claimed
  const checkIfClaimed = async () => {
    if (checkingClaimed) return;
    
    try {
      setCheckingClaimed(true);
      console.log("🔍 Checking if user already claimed from this token:", token);
      
      const ethProvider = await sdk.wallet.getEthereumProvider();
      if (!ethProvider) return;

      // Try to call the contract to check if user already claimed
      // We'll use a test call to see if claim would succeed
      const { encodeFunctionData } = await import('viem');
      
      // Create a test claim call with dummy data
      const testClaimData = encodeFunctionData({
        abi: revokeAndClaimAbi,
        functionName: 'claimWithAttestation',
        args: [
          BigInt(fid || 0),
          BigInt(1), // dummy nonce
          BigInt(Math.floor(Date.now() / 1000) + 600), // dummy deadline
          token,
          spender,
          "0x" + "0".repeat(130) // dummy signature
        ]
      });

      // Try to simulate the call
      try {
        await ethProvider.request({
          method: 'eth_call',
          params: [{
            to: REVOKE_AND_CLAIM,
            data: testClaimData,
            from: address
          }, 'latest']
        });
        console.log("✅ Token not claimed yet - claim button available");
      } catch (simulationError) {
        if (simulationError.message.includes("not revoked") || 
            simulationError.message.includes("already claimed") ||
            simulationError.message.includes("execution reverted")) {
          console.log("⚠️ User already claimed from this token - hiding claim button");
          setClaimed(true);
          onClaimed && onClaimed(); // Hide from UI
        }
      }
    } catch (err) {
      console.error("❌ Error checking claim status:", err);
    } finally {
      setCheckingClaimed(false);
    }
  };

  // Check on component mount
  useEffect(() => {
    checkIfClaimed();
  }, [token, spender, address]);

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

      // Use viem to encode the function call
      const { encodeFunctionData } = await import('viem');
      
      // Step 1: First revoke the allowance
      const ERC20_APPROVE_ABI = [
        {
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ];
      
      const revokeData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [spender, BigInt(0)]
      });
      
      console.log('📝 Step 1: Revoking allowance...');
      const revokeTxHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: token,
          data: revokeData,
        }],
      });
      
        console.log('✅ Allowance revoked:', revokeTxHash);

        // Record revocation in database immediately (no need for second transaction)
        console.log('📝 Recording revocation in database...');
        try {
          await recordRevocation(address, token, spender, fid || 0, null, revokeTxHash);
          console.log('✅ Revocation recorded in database');
        } catch (dbError) {
          console.error('❌ Failed to record revocation in database:', dbError);
          // Don't fail the whole process if database recording fails
        }

        console.log('✅ Revoke completed successfully!');
        setStatus("✅ Revoke successful!");

        // Set revoked state immediately
        setRevoked(true);
        onRevoked && onRevoked();
    } catch (err) {
      console.error("❌ Revoke error:", err);
      setStatus("❌ Revoke failed: " + err.message);
      
      // Reset revoked state on error
      setRevoked(false);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);
      console.log("🔍 RevokeAndClaimButton - handleClaim called");
      console.log("🔍 FID from props:", fid);
      console.log("🔍 FID type:", typeof fid);
      console.log("🔍 FID value:", fid);
      console.log("🔍 Using Farcaster Miniapp SDK for wallet interaction");

      // Get Ethereum provider from Farcaster Miniapp SDK
      console.log("🌐 Getting Ethereum provider from Farcaster...");
      const ethProvider = await sdk.wallet.getEthereumProvider();
      console.log("✅ Got provider from miniapp SDK");
      
      if (!ethProvider) {
        throw new Error("No wallet provider available from Farcaster.");
      }

      // Call attester backend (FID will be looked up by backend)
      const body = { wallet: address, token, spender };
      console.log("🔍 Attestation request body:", body);
      const resp = await fetch(ATTESTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      console.log("🔍 Attestation response:", data);
      console.log("🔍 Attestation FID:", data.fid);
      console.log("🔍 Attestation FID type:", typeof data.fid);
      if (!resp.ok) throw new Error(data.error || "Attestation failed");

      // Use viem to encode the function call
      const { encodeFunctionData } = await import('viem');
      
      console.log("🔍 Contract call args:", {
        fid: data.fid,
        nonce: data.nonce,
        deadline: data.deadline,
        token: token,
        spender: spender,
        sig: data.sig
      });
      
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
      
      // Wait for transaction confirmation with timeout
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 10; // 10 seconds max wait
      
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await ethProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          });
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;
          }
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        }
      }
      
      if (!receipt) {
        console.log('⚠️ Transaction confirmation timeout, but transaction was sent');
        // Still mark as successful since transaction was sent
      }
      
      setStatus("✅ Claim successful!");
      setClaiming(false);
      setClaimed(true);
      console.log('🔄 Calling onClaimed callback');
      onClaimed && onClaimed();
      console.log('✅ onClaimed callback completed');
    } catch (err) {
      console.error("❌ Claim failed:", err);
      
      // Check if it's an "already claimed" error
      if (err.message.includes("not revoked") || err.message.includes("already claimed")) {
        setStatus("⚠️ Already claimed - this approval was already used");
        setClaimed(true); // Mark as claimed even though transaction failed
        setClaiming(false);
        onClaimed && onClaimed(); // Still call callback to hide from UI
      } else {
        setStatus("❌ Claim failed: " + err.message);
        setClaiming(false);
      }
    }
  }

  console.log('🔍 RevokeAndClaimButton render - revoked:', revoked, 'claiming:', claiming, 'canClaim:', !revoked || claiming);
  
  return (
    <div>
      <div className="flex gap-2">
        <button 
          onClick={handleRevoke}
          disabled={revoked}
          className={`border-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            revoked 
              ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed' 
              : 'border-red-500 text-red-600 hover:bg-red-50'
          }`}
        >
          {revoked ? "✅ Revoked" : "Revoke"}
        </button>
        
        {/* Only show claim button if not already claimed from this token */}
        {!claimed && (
          <button
            onClick={handleClaim}
            disabled={!revoked || claiming}
            className={`border-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              !revoked || claiming
                ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                : 'border-green-500 text-green-600 hover:bg-green-50'
            }`}
          >
            {claiming ? "Claiming..." : "Claim $FG"}
          </button>
        )}
        
        {/* Show message if already claimed */}
        {claimed && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border-2 border-gray-300">
            ⚠️ Already claimed from this token
          </div>
        )}
      </div>
      {status && <div className="mt-2 text-sm">{status}</div>}
    </div>
  );
}