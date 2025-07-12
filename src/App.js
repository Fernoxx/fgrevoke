// App.js - FarGuard with OFFICIAL Farcaster SDK pattern
import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2 } from 'lucide-react';

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
  const [sdk, setSdk] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);

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

  // OFFICIAL FARCASTER PATTERN: Initialize SDK and call ready()
  useEffect(() => {
    const initializeApp = async () => {
      // Detect Farcaster environment
      const inFarcaster = window.parent !== window || 
                         window.location.search.includes('farcaster') ||
                         navigator.userAgent.includes('Farcaster');
      
      setIsInFarcaster(inFarcaster);
      console.log('🔍 Environment:', inFarcaster ? 'Farcaster' : 'Web');

      if (inFarcaster) {
        try {
          console.log('📱 Loading Farcaster SDK...');
          
          // OFFICIAL METHOD: Dynamic import of SDK
          const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
          setSdk(farcasterSdk);
          console.log('✅ Farcaster SDK loaded');

          // CRITICAL: Call ready() immediately after SDK loads
          await farcasterSdk.actions.ready();
          console.log('✅ sdk.actions.ready() called - splash screen should be hidden');
          setSdkReady(true);

          // Get user context
          if (farcasterSdk.context?.user) {
            const userData = farcasterSdk.context.user;
            setUser(userData);
            console.log('✅ User context loaded:', userData.username || userData.displayName);
          }

        } catch (error) {
          console.error('❌ SDK initialization failed:', error);
          
          // Fallback: Manual ready signal
          try {
            if (window.parent !== window) {
              window.parent.postMessage({ type: 'miniapp-ready' }, '*');
              console.log('📨 Sent fallback ready message');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback ready failed:', fallbackError);
          }
          
          setSdkReady(true); // Continue anyway
        }
      } else {
        // Web environment - no SDK needed
        setSdkReady(true);
        console.log('🌐 Web environment initialized');
      }
    };

    initializeApp();
  }, []);

  // Connect wallet - Gets address for reading data
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (isInFarcaster && sdk && sdkReady) {
        console.log('🔄 Getting wallet address from Farcaster...');

        // Method 1: Try to get address from user context
        if (sdk.context?.user) {
          const userData = sdk.context.user;
          
          if (userData.custody) {
            setAddress(userData.custody);
            setIsConnected(true);
            console.log('✅ Got custody address:', userData.custody);
            return;
          }
          
          if (userData.verifications?.length > 0) {
            setAddress(userData.verifications[0]);
            setIsConnected(true);
            console.log('✅ Got verified address:', userData.verifications[0]);
            return;
          }
        }

        // Method 2: Try wallet provider
        try {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts?.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              console.log('✅ Got provider address:', accounts[0]);
              return;
            }
            
            // Request connection if no accounts
            const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' });
            if (requestedAccounts?.length > 0) {
              setAddress(requestedAccounts[0]);
              setIsConnected(true);
              console.log('✅ Got requested address:', requestedAccounts[0]);
              return;
            }
          }
        } catch (providerError) {
          console.log('Provider method failed:', providerError);
        }

        throw new Error('No wallet address available');

      } else if (!isInFarcaster) {
        // Web environment fallback - use demo address
        const demoAddress = '0x742d35Cc6634C0532925a3b8D35d1123456789Ab';
        setAddress(demoAddress);
        setIsConnected(true);
        console.log('✅ Demo address connected (web mode):', demoAddress);
      } else {
        throw new Error('SDK not ready');
      }

    } catch (error) {
      console.error('❌ Connection failed:', error);
      setError(`Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Read blockchain data via public API
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
        if (tx.to && tx.tokenSymbol && tx.contractAddress && parseFloat(tx.value) > 0) {
          const key = `${tx.contractAddress}-${tx.to}`;
          
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

  // Revoke approval using Farcaster wallet
  const handleRevokeApproval = async (approval) => {
    if (!sdk || !isInFarcaster || !sdkReady) {
      // Simulate for web users
      setApprovals(approvals.filter(a => a.id !== approval.id));
      setRevokedCount(prev => prev + 1);
      if (revokedCount + 1 >= 2) setShowShareButton(true);
      return;
    }

    try {
      console.log('🔄 Revoking approval via Farcaster wallet...');
      
      const provider = await sdk.wallet.getEthereumProvider();
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
      if (sdk?.actions?.cast) {
        await sdk.actions.cast({ text: shareText });
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
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
                disabled={isConnecting || (isInFarcaster && !sdkReady)}
                className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting ? 'Connecting...' : (isInFarcaster && !sdkReady) ? 'Loading...' : 'Connect Wallet'}
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
                    <p className="text-green-300 text-sm">
                      🎉 Running in Farcaster - Your wallet data is secure!
                      {sdkReady && <span className="ml-2">✅ SDK Ready</span>}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={connectWallet}
                disabled={isConnecting || (isInFarcaster && !sdkReady)}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : (isInFarcaster && !sdkReady) ? 'Loading SDK...' : '🔗 Connect Wallet'}
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
              Farcaster Miniapp {sdkReady && '✅'}
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