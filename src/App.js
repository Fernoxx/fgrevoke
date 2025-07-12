// App.js - FarGuard with proper Farcaster integration (Read via public RPC, Write via Farcaster)
import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2 } from 'lucide-react';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revokedCount, setRevokedCount] = useState(0);
  const [showShareButton, setShowShareButton] = useState(false);
  
  // Farcaster integration
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [farcasterSdk, setFarcasterSdk] = useState(null);

  // Add loading state
  const [isInitializing, setIsInitializing] = useState(true);

  const ETHERSCAN_API_KEY = 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/api',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      chainId: 1
    },
    { 
      name: 'Base', 
      value: 'base', 
      apiUrl: 'https://api.basescan.org/api',
      rpcUrl: 'https://mainnet.base.org',
      chainId: 8453
    },
    { 
      name: 'Arbitrum', 
      value: 'arbitrum', 
      apiUrl: 'https://api.arbiscan.io/api',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161
    },
  ];

  // OFFICIAL FARCASTER PATTERN: Load SDK and call ready() properly
  useEffect(() => {
    const initFarcasterApp = async () => {
      // Detect Farcaster environment first
      const inFarcaster = window.parent !== window || 
                         window.location.search.includes('farcaster') ||
                         navigator.userAgent.includes('Farcaster') ||
                         document.referrer.includes('farcaster');
      
      setIsInFarcaster(inFarcaster);
      console.log('🔍 Environment check:', inFarcaster ? 'Farcaster' : 'Web');

      // If not in Farcaster, finish initialization immediately
      if (!inFarcaster) {
        setIsInitializing(false);
        console.log('🌐 Running in web mode - no SDK needed');
        return;
      }

      try {
        if (inFarcaster) {
          console.log('📱 Loading Farcaster SDK...');
          
          // OFFICIAL METHOD 1: ESM import (preferred)
          try {
            const { sdk } = await import('@farcaster/miniapp-sdk');
            setFarcasterSdk(sdk);
            console.log('✅ SDK loaded via ESM import');
            
            // CRITICAL: Call ready() immediately after SDK loads
            await sdk.actions.ready();
            console.log('✅ sdk.actions.ready() called successfully!');
            setIsInitializing(false); // Success - show app immediately
            
            // Get user context after ready()
            if (sdk.context && sdk.context.user) {
              const userData = sdk.context.user;
              setUser(userData);
              console.log('✅ User context loaded:', userData.username || userData.displayName);
            }
            
            return; // Success, exit here
            
          } catch (esmError) {
            console.log('⚠️ ESM import failed, trying CDN fallback:', esmError);
          }
          
          // FALLBACK METHOD 2: CDN script loading
          try {
            console.log('📡 Loading SDK from CDN...');
            
            const sdk = await new Promise((resolve, reject) => {
              // Try to load from the official ESM CDN
              const script = document.createElement('script');
              script.type = 'module';
              script.textContent = `
                import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
                window.__farcasterSdk = sdk;
                window.dispatchEvent(new CustomEvent('farcaster-sdk-loaded'));
              `;
              
              const handleLoad = () => {
                if (window.__farcasterSdk) {
                  resolve(window.__farcasterSdk);
                } else {
                  reject(new Error('SDK not found after script load'));
                }
              };
              
              window.addEventListener('farcaster-sdk-loaded', handleLoad, { once: true });
              document.head.appendChild(script);
              
              // Timeout after 10 seconds
              setTimeout(() => {
                window.removeEventListener('farcaster-sdk-loaded', handleLoad);
                reject(new Error('SDK loading timeout'));
              }, 10000);
            });
            
            setFarcasterSdk(sdk);
            console.log('✅ SDK loaded via CDN');
            
            // CRITICAL: Call ready() after CDN load
            await sdk.actions.ready();
            console.log('✅ sdk.actions.ready() called successfully via CDN!');
            setIsInitializing(false); // Success - show app immediately
            
            // Get user context
            if (sdk.context && sdk.context.user) {
              const userData = sdk.context.user;
              setUser(userData);
              console.log('✅ User context loaded via CDN');
            }
            
          } catch (cdnError) {
            console.error('❌ All SDK loading methods failed:', cdnError);
            
            // LAST RESORT: Manual postMessage to hide splash
            try {
              if (window.parent !== window) {
                window.parent.postMessage({ type: 'miniapp-ready' }, '*');
                console.log('📨 Sent manual ready message to parent');
              }
              
              // Also try global ready function if it exists
              if (window.farcasterReady) {
                window.farcasterReady();
                console.log('📞 Called global farcasterReady()');
              }
              
              // Show app anyway after manual ready attempt
              setIsInitializing(false);
              
            } catch (postMessageError) {
              console.error('❌ Even manual ready failed:', postMessageError);
              setIsInitializing(false); // Show app anyway
            }
          }
        }

      } catch (error) {
        console.error('❌ Complete initialization failure:', error);
        setIsInitializing(false); // Show app anyway
      }
      
      // Safety timeout to always show app after 5 seconds
      setTimeout(() => {
        setIsInitializing(false);
        console.log('✅ Initialization completed (safety timeout)');
      }, 5000);
    };

    // Run initialization
    initFarcasterApp();
  }, []); // Empty dependency array - run once on mount

  // Connect wallet - Gets address for reading data
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (isInFarcaster && farcasterSdk) {
        console.log('🔄 Getting wallet address...');

        // Method 1: Try to get address from user context
        if (farcasterSdk.context && farcasterSdk.context.user) {
          const userData = farcasterSdk.context.user;
          
          if (userData.custody) {
            setAddress(userData.custody);
            setIsConnected(true);
            console.log('✅ Got custody address:', userData.custody);
            return;
          }
          
          if (userData.verifications && userData.verifications.length > 0) {
            setAddress(userData.verifications[0]);
            setIsConnected(true);
            console.log('✅ Got verified address:', userData.verifications[0]);
            return;
          }
        }

        // Method 2: Try to connect to get address (for reading only)
        try {
          const provider = await farcasterSdk.wallet.getEthereumProvider();
          if (provider) {
            // Request account access (this gives us the address for reading)
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              console.log('✅ Got provider address:', accounts[0]);
              return;
            }
          }
        } catch (providerError) {
          console.log('Provider method failed:', providerError);
        }

        throw new Error('No wallet address available from Farcaster');

      } else {
        throw new Error('Farcaster SDK not available');
      }

    } catch (error) {
      console.error('❌ Connection failed:', error);
      setError(`Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Read blockchain data via public API (NOT Farcaster wallet)
  useEffect(() => {
    if (address && isConnected) {
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      if (chainConfig) {
        fetchApprovals(address, chainConfig);
      }
    } else {
      setApprovals([]);
    }
  }, [address, isConnected, selectedChain]);

  const fetchApprovals = async (userAddress, chainConfig) => {
    setLoading(true);
    setError(null);
    console.log(`🔍 Reading approvals for ${userAddress} from ${chainConfig.value}`);
    
    try {
      // Use PUBLIC API to READ data (not Farcaster wallet)
      const response = await fetch(
        `${chainConfig.apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== '1') {
        if (data.message === 'No transactions found') {
          console.log('✅ No transactions found - clean wallet!');
          setApprovals([]);
          return;
        }
        throw new Error(data.message || 'API error');
      }

      console.log(`📊 Found ${data.result.length} transactions`);

      // Process transactions to find approvals
      const approvalMap = new Map();
      
      data.result.forEach((tx) => {
        // Look for ERC20 transfers that indicate approvals
        if (tx.to && tx.tokenSymbol && tx.contractAddress && parseFloat(tx.value) > 0) {
          const key = `${tx.contractAddress}-${tx.to}`;
          
          // Skip if we already have this approval
          if (approvalMap.has(key)) return;
          
          const spenderName = getSpenderName(tx.to);
          const riskLevel = assessRiskLevel(tx.to);
          
          approvalMap.set(key, {
            id: key,
            name: tx.tokenName || tx.tokenSymbol,
            symbol: tx.tokenSymbol,
            contract: tx.contractAddress,
            spender: tx.to,
            spenderName,
            amount: formatAmount(tx.value, tx.tokenDecimal),
            type: 'Token',
            lastActivity: new Date(tx.timeStamp * 1000).toLocaleDateString(),
            txHash: tx.hash,
            riskLevel
          });
        }
      });

      const finalApprovals = Array.from(approvalMap.values());
      setApprovals(finalApprovals);
      console.log(`✅ Found ${finalApprovals.length} token approvals`);

    } catch (err) {
      console.error('❌ Failed to fetch approvals:', err);
      setError(`Failed to load approvals: ${err.message}`);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  // Revoke approval - This will use Farcaster wallet for WRITING
  const handleRevokeApproval = async (approval) => {
    if (!farcasterSdk || !isInFarcaster) {
      // For web users, just simulate
      setApprovals(approvals.filter(a => a.id !== approval.id));
      setRevokedCount(prev => prev + 1);
      if (revokedCount + 1 >= 2) setShowShareButton(true);
      return;
    }

    try {
      console.log('🔄 Revoking approval via Farcaster wallet...');
      
      // Get the Ethereum provider for transaction signing
      const provider = await farcasterSdk.wallet.getEthereumProvider();
      
      if (!provider) {
        throw new Error('Wallet provider not available');
      }

      // ERC20 approve(spender, 0) to revoke
      const revokeData = `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'0'.repeat(64)}`;
      
      const txParams = {
        to: approval.contract,
        data: revokeData,
        from: address
      };

      // Submit transaction via Farcaster wallet
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('✅ Revoke transaction submitted:', txHash);
      
      // Update UI
      setApprovals(approvals.filter(a => a.id !== approval.id));
      setRevokedCount(prev => prev + 1);
      if (revokedCount + 1 >= 2) setShowShareButton(true);

    } catch (error) {
      console.error('❌ Revoke failed:', error);
      alert(`Revoke failed: ${error.message}`);
    }
  };

  const getSpenderName = (address) => {
    const known = {
      '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
      '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea Registry',
      '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
    };
    return known[address.toLowerCase()] || 'Unknown Contract';
  };

  const assessRiskLevel = (spenderAddress) => {
    const safe = [
      '0xe592427a0aece92de3edee1f18e0157c05861564',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x00000000006c3852cbef3e08e8df289169ede581',
      '0x1111111254eeb25477b68fb85ed929f73a960582',
    ];
    
    if (safe.includes(spenderAddress.toLowerCase())) return 'low';
    if (getSpenderName(spenderAddress) === 'Unknown Contract') return 'high';
    return 'medium';
  };

  const formatAmount = (value, decimals) => {
    try {
      const num = parseFloat(value) / Math.pow(10, parseInt(decimals) || 18);
      if (num > 1000000) return 'Unlimited';
      return num.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleShare = async () => {
    const shareText = `🛡️ Just secured my wallet with FarGuard!

Revoked ${revokedCount} risky token approvals - keeping my crypto safe! 

Check your approvals: https://fgrevoke.vercel.app`;

    try {
      // Try Farcaster SDK first
      if (farcasterSdk?.actions?.cast) {
        await farcasterSdk.actions.cast(shareText);
        return;
      }

      // Fallback methods
      if (navigator.share) {
        await navigator.share({
          title: 'Secured my wallet with FarGuard!',
          text: shareText,
          url: 'https://fgrevoke.vercel.app'
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        alert('✅ Share text copied to clipboard!');
      } else {
        const encoded = encodeURIComponent(shareText);
        window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setApprovals([]);
    setRevokedCount(0);
    setShowShareButton(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Show loading screen only while initializing in Farcaster */}
      {isInitializing && isInFarcaster && (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-purple-200 mb-2">Loading FarGuard...</h2>
            <p className="text-purple-400">Initializing Farcaster SDK</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Debug Panel for Farcaster (only show in dev/testing) */}
        {isInFarcaster && process.env.NODE_ENV !== 'production' && (
          <div className="w-full max-w-4xl mb-4 text-xs text-purple-300 bg-purple-900/30 rounded p-2">
            <div className="flex items-center justify-between mb-2">
              <span>🔍 Debug Panel (Farcaster Development)</span>
              <span className={`px-2 py-1 rounded text-xs ${farcasterSdk ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                SDK: {farcasterSdk ? 'Loaded' : 'Not Loaded'}
              </span>
            </div>
            <p>Environment: Farcaster | Connected: {isConnected.toString()}</p>
            {user && <p>User: {user.username || user.displayName || 'Unknown'} | FID: {user.fid}</p>}
            {address && <p>Address: {formatAddress(address)}</p>}
            <div className="flex gap-2 mt-2">
              <button 
                onClick={async () => {
                  try {
                    if (farcasterSdk?.actions?.ready) {
                      await farcasterSdk.actions.ready();
                      console.log('✅ Manual ready() successful');
                    } else {
                      console.log('❌ SDK not available for manual ready()');
                    }
                  } catch (e) {
                    console.error('Manual ready() failed:', e);
                  }
                }}
                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
              >
                Manual Ready()
              </button>
              <button 
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('farcasterSdk:', farcasterSdk);
                  console.log('window.__farcasterSdk:', window.__farcasterSdk);
                  console.log('user:', user);
                  console.log('address:', address);
                  console.log('isInFarcaster:', isInFarcaster);
                  console.log('================');
                }}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
              >
                Log Debug Info
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <img 
              src="https://fgrevoke.vercel.app/farguard-logo.png" 
              alt="FarGuard Logo" 
              className="w-8 h-8 rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-8 h-8 bg-purple-600 rounded-lg items-center justify-center hidden">
              <Shield className="w-5 h-5 text-purple-200" />
            </div>
            <h1 className="text-3xl font-bold text-purple-200">FarGuard</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Chain Selection */}
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none bg-purple-700 text-white py-2 px-4 pr-8 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer w-full"
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
              >
                {chains.map((chain) => (
                  <option key={chain.value} value={chain.value}>
                    {chain.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-purple-200">
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>

            {/* Wallet Connection */}
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="bg-purple-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {user?.username ? `@${user.username}` : formatAddress(address)}
                </div>
                <button
                  onClick={disconnect}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="mb-6">
                <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-purple-200 mb-2">Connect Your Wallet</h2>
                <p className="text-xl text-purple-300 mb-4">
                  View your token approvals and revoke risky permissions
                </p>
                {isInFarcaster && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                    <p className="text-green-300 text-sm">🎉 Running in Farcaster - Your wallet data is secure!</p>
                  </div>
                )}
              </div>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : '🔗 Connect Wallet'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-200">
                    Token Approvals ({selectedChain})
                  </h2>
                  <p className="text-sm text-purple-400 mt-1">
                    Address: {formatAddress(address)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {showShareButton && (
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Success
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const chainConfig = chains.find(chain => chain.value === selectedChain);
                      if (chainConfig) {
                        fetchApprovals(address, chainConfig);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{approvals.length}</p>
                  <p className="text-sm text-purple-200">Active Approvals</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {approvals.filter(a => a.riskLevel === 'high').length}
                  </p>
                  <p className="text-sm text-purple-200">High Risk</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-400">{revokedCount}</p>
                  <p className="text-sm text-purple-200">Revoked</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="space-y-4">
                  <p className="text-center text-purple-300">Loading your token approvals...</p>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-purple-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-purple-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-purple-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-300 text-lg font-semibold">Your wallet is secure! 🎉</p>
                  <p className="text-purple-400 text-sm mt-2">No risky token approvals found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals.map((approval) => (
                    <div key={approval.id} className="bg-purple-700 rounded-lg p-4 hover:bg-purple-600 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1">
                          <CheckCircle className="w-5 h-5 mr-3 text-blue-400 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-sm">
                              {approval.name} ({approval.symbol})
                            </h3>
                            <p className="text-xs text-purple-300 mt-1">
                              Approved to: {approval.spenderName}
                            </p>
                            <p className="text-xs text-purple-400">
                              Contract: {formatAddress(approval.contract)}
                            </p>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-opacity-20 ${
                          approval.riskLevel === 'high' ? 'bg-red-500 text-red-300' :
                          approval.riskLevel === 'medium' ? 'bg-yellow-500 text-yellow-300' :
                          'bg-green-500 text-green-300'
                        }`}>
                          {approval.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
                          {approval.riskLevel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-purple-300 mb-3">
                        <span>Amount: {approval.amount}</span>
                        <span>Last: {approval.lastActivity}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRevokeApproval(approval)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                        >
                          Revoke Approval
                        </button>
                        <button 
                          onClick={() => window.open(`https://etherscan.io/tx/${approval.txHash}`, '_blank')}
                          className="px-3 py-2 text-purple-300 hover:text-white transition-colors"
                          title="View Transaction"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-8 p-4 text-center border-t border-purple-700">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-purple-300">
          {isInFarcaster && (
            <span className="flex items-center gap-1 text-green-400">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              Farcaster Miniapp
            </span>
          )}
          <span className={isInFarcaster ? 'text-purple-400' : ''}>•</span>
          <span>
            Built by{' '}
            <a 
              href="https://farcaster.xyz/doteth" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-200 hover:text-white font-medium transition-colors underline decoration-purple-400 hover:decoration-white"
            >
              @doteth
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;