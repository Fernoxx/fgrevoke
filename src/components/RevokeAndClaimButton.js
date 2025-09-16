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
      
      // Wait for revocation to be confirmed
      let revokeReceipt = null;
      let attempts = 0;
      const maxAttempts = 15; // 30 seconds max wait (15 × 2 seconds)
      
      while (!revokeReceipt && attempts < maxAttempts) {
        try {
          revokeReceipt = await ethProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [revokeTxHash]
          });
          if (!revokeReceipt) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      if (!revokeReceipt) {
        console.log('⚠️ Revocation confirmation timeout, but continuing with record...');
      } else {
        console.log('✅ Revocation confirmed:', revokeReceipt);
      }
      
      // Step 2: Record the revocation
      console.log('📝 Step 2: Recording revocation...');
      const recordData = encodeFunctionData({
        abi: revokeHelperAbi,
        functionName: 'recordRevoked',
        args: [token, spender]
      });

      console.log('📝 Sending record transaction via RevokeHelper:', {
        to: REVOKE_HELPER,
        from: address,
        data: recordData.slice(0, 10) + '...'
      });

      const recordTxHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: REVOKE_HELPER,
          data: recordData,
        }],
      });

      console.log('✅ Record transaction sent:', recordTxHash);
      setStatus("✅ Revoke and record successful!");
      
      // Set revoked state immediately since transaction was sent successfully
      console.log('🔄 Setting revoked state to true');
      setRevoked(true);
      
      // Call onRevoked immediately since we've successfully sent both transactions
      console.log('🔄 Calling onRevoked callback');
      onRevoked && onRevoked();
      
      console.log('✅ Revoke process completed successfully');
      
      // Wait for record transaction confirmation in background
      setTimeout(async () => {
        try {
          let receipt = null;
          let recordAttempts = 0;
          const maxRecordAttempts = 15; // 30 seconds max wait
          
          while (!receipt && recordAttempts < maxRecordAttempts) {
            try {
              receipt = await ethProvider.request({
                method: 'eth_getTransactionReceipt',
                params: [recordTxHash]
              });
              if (!receipt) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                recordAttempts++;
              }
            } catch (e) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              recordAttempts++;
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
      
      // Reset revoked state on error
      setRevoked(false);
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
      
      // Wait for transaction confirmation with timeout
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max wait
      
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
      
      if (!receipt) {
        console.log('⚠️ Transaction confirmation timeout, but transaction was sent');
        // Still mark as successful since transaction was sent
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
      </div>
      {status && <div className="mt-2 text-sm">{status}</div>}
    </div>
  );
}