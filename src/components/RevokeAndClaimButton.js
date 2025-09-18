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


export default function RevokeAndClaimButton({ token, spender, onRevoked, onClaimed, onApprovalClaimed }) {
  const { address } = useAccount();

  // CAPTCHA callback functions
  useEffect(() => {
    window.onCaptchaSuccess = (token) => {
      console.log("✅ CAPTCHA completed:", token);
      setCaptchaToken(token);
    };

    window.onCaptchaExpired = () => {
      console.log("⏰ CAPTCHA expired");
      setCaptchaToken(null);
    };

    return () => {
      delete window.onCaptchaSuccess;
      delete window.onCaptchaExpired;
    };
  }, []);
  const [revoked, setRevoked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [status, setStatus] = useState("");
  const [checkingClaimed, setCheckingClaimed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

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
          BigInt(0), // dummy fid - will be determined by backend
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

  // Share function for ComposeCast using Farcaster SDK
  const handleShare = async () => {
    try {
      // Each approval gives 33,333 FG tokens
      const fgPerApproval = 33333;
      
      const shareTextContent = `Claimed ${fgPerApproval.toLocaleString()} FG tokens while securing my wallet from FarGuard by @doteth`;
      const url = "https://fgrevoke.vercel.app";

      console.log(`📊 Sharing: 1 approval = ${fgPerApproval.toLocaleString()} FG tokens`);

      if (sdk?.actions?.composeCast) {
        console.log('📝 Composing cast via SDK...');
        await sdk.actions.composeCast({ 
          text: shareTextContent.trim(),
          embeds: [url]
        });
        console.log('✅ Shared to Farcaster');
        return;
      }
      
      // Fallback to clipboard
      const finalShareText = `${shareTextContent}\n${url}`;
      try {
        await navigator.clipboard.writeText(finalShareText);
        setStatus("✅ Share text copied to clipboard!");
        setTimeout(() => setStatus(""), 3000);
      } catch (clipboardError) {
        const encoded = encodeURIComponent(finalShareText);
        window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
      }
    } catch (error) {
      console.error('Share failed:', error);
      const fallbackText = `Claimed 33,333 FG tokens while securing my wallet from FarGuard by @doteth\nhttps://fgrevoke.vercel.app`;
      try {
        await navigator.clipboard.writeText(fallbackText);
        setStatus("✅ Share text copied to clipboard!");
        setTimeout(() => setStatus(""), 3000);
      } catch (clipboardError) {
        const encoded = encodeURIComponent(fallbackText);
        window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
      }
    }
  };

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

        // Step 2: Record the revocation in RevokeHelper contract (required for claim verification)
        // MAX 1 SECOND DELAY - no minimum, instant as possible
        console.log('📝 Step 2: Recording revocation with MAX 1 second delay...');
        const step2StartTime = Date.now();
        
        // Add MAX 1 second delay (no minimum)
        await new Promise(resolve => setTimeout(resolve, Math.min(1000, Math.random() * 1000)));
        
        const recordData = encodeFunctionData({
          abi: revokeHelperAbi,
          functionName: 'recordRevoked',
          args: [token, spender]
        });

        const recordTxHash = await ethProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: REVOKE_HELPER,
            data: recordData,
          }],
        });

        const step2EndTime = Date.now();
        const step2Duration = step2EndTime - step2StartTime;
        console.log(`✅ Revocation recorded in contract: ${recordTxHash} (took ${step2Duration}ms)`);

        // Get FID from Neynar for database recording
        console.log('📝 Getting FID from Neynar for database recording...');
        let userFid = 0;
        try {
          const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
            headers: {
              'api_key': process.env.REACT_APP_NEYNAR_API_KEY || '',
            }
          });
          
          if (neynarResponse.ok) {
            const neynarData = await neynarResponse.json();
            console.log('📊 Neynar response:', neynarData);
            if (neynarData.users && neynarData.users.length > 0) {
              userFid = neynarData.users[0].fid;
              console.log('✅ Found FID for database:', userFid);
            } else {
              console.log('⚠️ No Farcaster user found for this wallet address');
              // Don't allow non-Farcaster users to proceed
              throw new Error('This wallet is not associated with a Farcaster account. Only Farcaster users can revoke and claim.');
            }
          } else {
            console.error('❌ Neynar API error:', neynarResponse.status, neynarResponse.statusText);
            throw new Error('Failed to verify Farcaster account');
          }
        } catch (neynarError) {
          console.error('❌ Failed to get FID from Neynar:', neynarError);
          // Don't allow users without valid Farcaster accounts to proceed
          throw new Error('Only Farcaster users can revoke and claim tokens. Please ensure your wallet is connected to a Farcaster account.');
        }

        // Record in database for backend verification
        console.log('📝 Recording revocation in database...');
        try {
          await recordRevocation(address, token, spender, userFid, null, recordTxHash);
          console.log('✅ Revocation recorded in database');
        } catch (dbError) {
          console.error('❌ Failed to record revocation in database:', dbError);
          // Don't fail the whole process if database recording fails
        }

        console.log('✅ Both transactions completed successfully!');
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
      // Show CAPTCHA first
      setShowCaptcha(true);
      return; // Exit early, actual claim happens after CAPTCHA
    } catch (error) {
      console.error("❌ Error in handleClaim:", error);
      setClaiming(false);
    }
  }

  async function handleClaimWithCaptcha() {
    try {
      if (!captchaToken) {
        alert("Please complete the CAPTCHA first");
        return;
      }

      setClaiming(true);
      setShowCaptcha(false);
      console.log("🔍 RevokeAndClaimButton - handleClaimWithCaptcha called");
      console.log("🔍 Using Farcaster Miniapp SDK for wallet interaction");

      // Get Ethereum provider from Farcaster Miniapp SDK
      console.log("🌐 Getting Ethereum provider from Farcaster...");
      const ethProvider = await sdk.wallet.getEthereumProvider();
      console.log("✅ Got provider from miniapp SDK");
      
      if (!ethProvider) {
        throw new Error("No wallet provider available from Farcaster.");
      }

      // Call attester backend (FID will be looked up by backend)
      const body = { wallet: address, token, spender, captchaToken };
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
      setShowShare(true);
      
      // Update total claimed count
      const newTotal = totalClaimed + 1;
      setTotalClaimed(newTotal);
      
      console.log('🎉 Claim successful! Share button should now be visible');
      console.log(`📊 Total approvals claimed: ${newTotal}`);
      console.log('🔄 Calling onClaimed callback');
      onClaimed && onClaimed();
      onApprovalClaimed && onApprovalClaimed(newTotal);
      console.log('✅ onClaimed callback completed');
      
      // Force show share button after a short delay to ensure state is updated
      setTimeout(() => {
        setShowShare(true);
        console.log('🔄 Force setting showShare to true');
      }, 100);
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

  console.log('🔍 RevokeAndClaimButton render - revoked:', revoked, 'claiming:', claiming, 'claimed:', claimed, 'showShare:', showShare, 'canClaim:', !revoked || claiming);
  
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

      {/* CAPTCHA Modal */}
      {showCaptcha && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Security Verification</h3>
            <p className="text-gray-600 mb-4">
              Please complete the CAPTCHA to claim your reward tokens.
            </p>
            
            <div className="flex justify-center mb-4">
              <div 
                className="g-recaptcha" 
                data-sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                data-callback="onCaptchaSuccess"
                data-expired-callback="onCaptchaExpired"
              ></div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCaptcha(false);
                  setCaptchaToken(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimWithCaptcha}
                disabled={!captchaToken}
                className={`px-4 py-2 rounded-lg ${
                  captchaToken
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Claim $FG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}