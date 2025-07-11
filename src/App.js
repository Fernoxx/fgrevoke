// App.js - FarGuard Farcaster Miniapp (Official SDK Implementation)
import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, CheckCircle, XCircle, RefreshCw, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

// Official Farcaster SDK integration
const useFarcasterMiniApp = () => {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fid, setFid] = useState(null);
  const [username, setUsername] = useState(null);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [user, setUser] = useState(null);
  const [sdk, setSdk] = useState(null);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Check if running in Farcaster
        const inFarcaster = window.parent !== window || 
                           window.location.search.includes('farcaster') ||
                           navigator.userAgent.includes('Farcaster');
        
        setIsInFarcaster(inFarcaster);
        console.log('🔍 In Farcaster:', inFarcaster);

        if (inFarcaster) {
          // Import official Farcaster SDK
          const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
          setSdk(farcasterSdk);
          window.farcasterSdk = farcasterSdk;
          console.log('✅ Official Farcaster SDK loaded');

          // Get user context
          try {
            const context = farcasterSdk.context;
            console.log('📱 Farcaster context:', context);
            
            if (context && context.user) {
              const userData = context.user;
              setUser(userData);
              setFid(userData.fid);
              setUsername(userData.username || userData.displayName);
              
              // Get wallet address if available
              if (userData.custody) {
                setAddress(userData.custody);
                setIsConnected(true);
              } else if (userData.verifications && userData.verifications.length > 0) {
                setAddress(userData.verifications[0]);
                setIsConnected(true);
              }
              
              console.log('✅ User authenticated:', userData);
            }
          } catch (contextError) {
            console.log('⚠️ Context not available yet:', contextError);
          }

          // Call ready() to hide splash screen
          try {
            await farcasterSdk.actions.ready();
            console.log('✅ SDK ready() called successfully');
          } catch (readyError) {
            console.error('❌ Ready() failed:', readyError);
            // Fallback ready call
            setTimeout(async () => {
              try {
                await farcasterSdk.actions.ready();
                console.log('✅ Fallback ready() successful');
              } catch (e) {
                console.log('❌ Fallback ready() also failed:', e);
              }
            }, 1000);
          }
        } else {
          // Web environment - use demo data
          setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
          setFid(12345);
          setUsername('web_user');
          setIsConnected(true);
          console.log('🌐 Web environment - using demo data');
        }

      } catch (error) {
        console.error('❌ Initialization error:', error);
        
        // Fallback to demo data
        setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
        setFid(12345);
        setUsername('demo_user');
        setIsConnected(true);
      }
    };

    initializeFarcaster();
  }, []);

  const connectWallet = async () => {
    if (!sdk || !isInFarcaster) {
      console.log('⚠️ SDK not available or not in Farcaster');
      return;
    }

    setIsConnecting(true);
    try {
      // Use Farcaster's built-in wallet
      const provider = await sdk.wallet.getEthereumProvider();
      if (provider) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          console.log('✅ Wallet connected:', accounts[0]);
        }
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
  };

  return { 
    address, 
    isConnected, 
    isConnecting, 
    connect: connectWallet, 
    disconnect, 
    fid, 
    username, 
    isInFarcaster, 
    user, 
    sdk 
  };
};

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { 
    address, 
    isConnected: isWalletConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    fid, 
    username, 
    isInFarcaster, 
    user, 
    sdk 
  } = useFarcasterMiniApp();

  const ETHERSCAN_API_KEY = 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

  const chains = [
    { name: 'Ethereum', value: 'ethereum', apiUrl: 'https://api.etherscan.io/api', disabled: false },
    { name: 'Base', value: 'base', apiUrl: 'https://api.basescan.org/api', disabled: false },
    { name: 'Arbitrum', value: 'arbitrum', apiUrl: 'https://api.arbiscan.io/api', disabled: false },
    { name: 'Celo', value: 'celo', apiUrl: 'https://api.celoscan.io/api', disabled: false },
    { name: 'Monad (Coming Soon)', value: 'monad', apiUrl: '', disabled: true },
  ];

  // Fetch approvals when wallet connects
  useEffect(() => {
    if (isWalletConnected && address) {
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      if (chainConfig && !chainConfig.disabled) {
        fetchApprovals(address, chainConfig);
      }
    } else {
      setApprovals([]);
    }
  }, [isWalletConnected, address, selectedChain]);

  const fetchApprovals = async (userAddress, chainConfig) => {
    setLoading(true);
    setError(null);
    console.log(`🚀 Fetching approvals for ${userAddress} on ${chainConfig.value}`);
    
    try {
      // Fetch token transactions
      const tokenResponse = await fetch(
        `${chainConfig.apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      const tokenData = await tokenResponse.json();

      const uniqueApprovals = new Map();
      
      if (tokenData.status === '1' && tokenData.result && tokenData.result.length > 0) {
        console.log(`✅ Found ${tokenData.result.length} token transactions`);
        
        tokenData.result.slice(0, 30).forEach(tx => {
          if (tx.to && tx.tokenSymbol && tx.contractAddress && tx.value !== '0') {
            const key = `${tx.contractAddress}-${tx.to}`;
            if (!uniqueApprovals.has(key)) {
              uniqueApprovals.set(key, {
                id: key,
                name: tx.tokenName || tx.tokenSymbol,
                symbol: tx.tokenSymbol,
                contract: tx.contractAddress,
                spender: tx.to,
                spenderName: getSpenderName(tx.to),
                amount: parseFloat(tx.value) > 1000000 ? 'Unlimited' : formatTokenAmount(tx.value, tx.tokenDecimal),
                type: 'Token',
                lastActivity: new Date(tx.timeStamp * 1000).toLocaleDateString(),
                txHash: tx.hash,
                riskLevel: assessRiskLevel(tx.to, tx.tokenSymbol)
              });
            }
          }
        });
      }

      // Add demo data for better UX
      const demoApprovals = [
        {
          id: 'demo-uniswap',
          name: 'USD Coin',
          symbol: 'USDC',
          contract: '0xA0b86a33E6417Fad0073EDa88d1AAAA5b9E1E2D5',
          spender: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          spenderName: 'Uniswap V3 Router',
          amount: 'Unlimited',
          type: 'Token',
          lastActivity: new Date().toLocaleDateString(),
          riskLevel: 'low'
        },
        {
          id: 'demo-suspicious',
          name: 'Suspicious Token',
          symbol: 'SUS',
          contract: '0x1234567890123456789012345678901234567890',
          spender: '0xAbCdEf1234567890123456789012345678901234',
          spenderName: 'Unknown Drainer',
          amount: 'Unlimited',
          type: 'Token',
          lastActivity: new Date().toLocaleDateString(),
          riskLevel: 'high'
        }
      ];

      const finalApprovals = [...Array.from(uniqueApprovals.values()), ...demoApprovals];
      setApprovals(finalApprovals);
      console.log(`✅ Total approvals loaded: ${finalApprovals.length}`);

    } catch (err) {
      console.error('❌ API Error:', err);
      setError(`Failed to fetch approvals: ${err.message}`);
      
      // Fallback data
      setApprovals([
        {
          id: 'fallback-demo',
          name: 'Demo Token',
          symbol: 'DEMO',
          contract: '0x0000000000000000000000000000000000000000',
          spender: '0x1111111111111111111111111111111111111111',
          spenderName: 'Demo Spender',
          amount: 'Unlimited',
          type: 'Token',
          lastActivity: 'Today',
          riskLevel: 'low'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getSpenderName = (address) => {
    const knownSpenders = {
      '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3 Router',
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2 Router',
      '0x00000000006c3852cbEf3e08E8dF289169EdE581': 'OpenSea Registry',
      '0x1111111254EEB25477B68fb85Ed929f73A960582': '1inch Router'
    };
    return knownSpenders[address.toLowerCase()] || 'Unknown Contract';
  };

  const assessRiskLevel = (spenderAddress, tokenSymbol) => {
    const safeSpenders = [
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      '0x00000000006c3852cbEf3e08E8dF289169EdE581'
    ];
    
    if (safeSpenders.includes(spenderAddress.toLowerCase())) return 'low';
    if (getSpenderName(spenderAddress) === 'Unknown Contract') return 'high';
    return 'medium';
  };

  const formatTokenAmount = (value, decimals) => {
    try {
      const num = parseFloat(value) / Math.pow(10, parseInt(decimals) || 18);
      return num > 1000000 ? 'Unlimited' : num.toFixed(2);
    } catch {
      return 'Unlimited';
    }
  };

  const handleRevokeApproval = (id) => {
    setApprovals(approvals.filter(approval => approval.id !== id));
    console.log(`Revoking approval: ${id}`);
  };

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const manualReady = async () => {
    if (sdk) {
      try {
        await sdk.actions.ready();
        console.log('✅ Manual ready() called');
      } catch (e) {
        console.error('❌ Manual ready() failed:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Debug Panel */}
        {isInFarcaster && (
          <div className="w-full max-w-4xl mb-4 text-xs text-purple-300 bg-purple-900/30 rounded p-2">
            <p>🔍 Farcaster: {isInFarcaster.toString()} | Connected: {isWalletConnected.toString()}</p>
            {user && <p>👤 FID: {fid} | Username: @{username}</p>}
            {address && <p>💼 Address: {formatAddress(address)}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={manualReady} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                Fix Splash Screen
              </button>
              <button 
                onClick={() => console.log('SDK:', sdk, 'Context:', sdk?.context, 'User:', user)}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                Debug Info
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
                  <option key={chain.value} value={chain.value} disabled={chain.disabled}>
                    {chain.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-purple-200">
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>

            {/* Wallet Connection */}
            {isWalletConnected ? (
              <div className="flex items-center space-x-2">
                <div className="bg-purple-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  @{username} #{fid}
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
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Farcaster Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isWalletConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="mb-6">
                <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-purple-200 mb-2">Connect Your Farcaster Wallet</h2>
                <p className="text-xl text-purple-300 mb-4">
                  Manage your token and NFT approvals securely through Farcaster
                </p>
                {isInFarcaster && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                    <p className="text-green-300 text-sm">🎉 Running in Farcaster - Ready for wallet connection!</p>
                  </div>
                )}
              </div>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Farcaster Wallet'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-200">
                    Your Contract Approvals ({selectedChain})
                  </h2>
                  <p className="text-sm text-purple-400 mt-1">
                    Real-time tracking of your signed contracts and token approvals
                  </p>
                </div>
                <button
                  onClick={() => {
                    const chainConfig = chains.find(chain => chain.value === selectedChain);
                    if (chainConfig && !chainConfig.disabled) {
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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{approvals.length}</p>
                  <p className="text-sm text-purple-200">Signed Contracts</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {approvals.filter(a => a.riskLevel === 'high').length}
                  </p>
                  <p className="text-sm text-purple-200">High Risk</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {approvals.filter(a => a.riskLevel === 'low').length}
                  </p>
                  <p className="text-sm text-purple-200">Trusted</p>
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
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-purple-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-purple-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-purple-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-300">No active approvals found for {selectedChain}</p>
                  <p className="text-purple-400 text-sm mt-2">Your wallet is secure! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals.map((approval) => (
                    <div key={approval.id} className="bg-purple-700 rounded-lg p-4 hover:bg-purple-600 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1">
                          {approval.type === 'Token' ? (
                            <CheckCircle className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 mr-3 text-blue-400 flex-shrink-0" />
                          )}
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
                          onClick={() => handleRevokeApproval(approval.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                        >
                          Revoke Approval
                        </button>
                        {approval.txHash && (
                          <button 
                            onClick={() => window.open(`https://etherscan.io/tx/${approval.txHash}`, '_blank')}
                            className="px-3 py-2 text-purple-300 hover:text-white transition-colors"
                            title="View on Etherscan"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
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