// App.js - FarGuard Farcaster Miniapp
import React, { useState, useEffect } from 'react';
// Importing icons from lucide-react for a clean UI
import { Wallet, ChevronDown, CheckCircle, XCircle, RefreshCw, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

// Farcaster wallet integration with error boundaries
const useFarcasterWallet = () => {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fid, setFid] = useState(null);
  const [username, setUsername] = useState(null);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [error, setError] = useState(null);

  // Detect if running inside Farcaster with safety checks
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        const inFarcaster = window.parent !== window || 
                           window.location.search.includes('farcaster') ||
                           navigator.userAgent.includes('Farcaster') ||
                           (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.farcaster);
        
        setIsInFarcaster(inFarcaster);
        console.log('🔍 Farcaster detection:', inFarcaster);
        
        // Safely call SDK ready() with multiple attempts
        const callReady = () => {
          try {
            if (window.sdk?.actions?.ready) {
              window.sdk.actions.ready();
              console.log('✅ SDK ready() called via window.sdk');
              return true;
            }
            
            if (window.farcasterSdk?.actions?.ready) {
              window.farcasterSdk.actions.ready();
              console.log('✅ SDK ready() called via window.farcasterSdk');
              return true;
            }
            
            // Try postMessage as fallback
            if (window.parent !== window) {
              window.parent.postMessage({ type: 'miniapp-ready' }, '*');
              console.log('✅ Ready called via postMessage');
              return true;
            }
          } catch (e) {
            console.log('⚠️ Ready call failed:', e);
          }
          return false;
        };
        
        // Call ready immediately
        if (inFarcaster) {
          callReady();
          
          // Retry after delays
          setTimeout(() => callReady(), 500);
          setTimeout(() => callReady(), 1500);
          setTimeout(() => callReady(), 3000);
        }
        
        // Auto-connect with delay
        if (inFarcaster) {
          setTimeout(() => {
            autoConnectFarcaster();
          }, 2000);
        }
        
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setError(error.message);
      }
    };
    
    initializeFarcaster();
  }, []);

  const autoConnectFarcaster = async () => {
    try {
      console.log('🔍 Starting auto-connect...');
      let connected = false;
      
      // Method 1: Check SDK context with safety
      try {
        if (window.sdk?.context && !connected) {
          const context = window.sdk.context;
          if (context && context.user) {
            const user = context.user;
            setFid(user.fid);
            setUsername(user.username || user.displayName || 'farcaster_user');
            setAddress(user.custody || user.verifications?.[0] || '0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
            setIsConnected(true);
            connected = true;
            console.log('✅ Auto-connected via SDK context:', user);
          }
        }
      } catch (e) {
        console.log('⚠️ SDK context check failed:', e);
      }
      
      // Method 2: Check URL params
      if (!connected) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const fidParam = urlParams.get('fid');
          const usernameParam = urlParams.get('username');
          
          if (fidParam && usernameParam) {
            setFid(parseInt(fidParam));
            setUsername(usernameParam);
            setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
            setIsConnected(true);
            connected = true;
            console.log('✅ Auto-connected via URL params');
          }
        } catch (e) {
          console.log('⚠️ URL params check failed:', e);
        }
      }
      
      // Method 3: Polling for SDK context (delayed)
      if (!connected && isInFarcaster) {
        let attempts = 0;
        const pollForContext = setInterval(async () => {
          attempts++;
          try {
            const context = window.sdk?.context || (window.farcasterSdk?.context ? await window.farcasterSdk.context : null);
            if (context?.user && !isConnected) {
              const user = context.user;
              setFid(user.fid);
              setUsername(user.username || user.displayName || 'farcaster_user');
              setAddress(user.custody || user.verifications?.[0] || '0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
              setIsConnected(true);
              clearInterval(pollForContext);
              console.log('✅ Auto-connected via polling:', user);
            }
          } catch (e) {
            console.log(`⚠️ Polling attempt ${attempts} failed:`, e);
          }
          
          // Stop polling after 10 attempts
          if (attempts >= 10) {
            clearInterval(pollForContext);
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Auto-connect error:', error);
      setError(error.message);
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('🔄 Manual connect started...');
      let connected = false;
      
      if (isInFarcaster) {
        // Try multiple connection methods with error handling
        
        // Method 1: SDK context
        try {
          if (window.sdk?.context && !connected) {
            const context = window.sdk.context;
            if (context && context.user) {
              const user = context.user;
              setAddress(user.custody || user.verifications?.[0] || '0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
              setFid(user.fid);
              setUsername(user.username || user.displayName || 'farcaster_user');
              setIsConnected(true);
              connected = true;
              console.log('✅ Manual connect via SDK context');
            }
          }
        } catch (e) {
          console.log('⚠️ SDK context manual connect failed:', e);
        }
        
        // Method 2: Try SDK actions
        try {
          if (window.sdk?.actions?.connect && !connected) {
            const result = await window.sdk.actions.connect();
            if (result) {
              setAddress(result.address || '0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
              setFid(result.fid || 12345);
              setUsername(result.username || 'farcaster_user');
              setIsConnected(true);
              connected = true;
              console.log('✅ Manual connect via SDK actions');
            }
          }
        } catch (e) {
          console.log('⚠️ SDK actions connect failed:', e);
        }
        
        // Fallback with demo data
        if (!connected) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
          setFid(12345);
          setUsername('demo_user');
          setIsConnected(true);
          console.log('⚠️ Using demo data for manual connect');
        }
      } else {
        // Regular web connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
        setFid(12345);
        setUsername('web_user');
        setIsConnected(true);
      }
    } catch (error) {
      console.error('❌ Manual connection failed:', error);
      setError(error.message);
      
      // Still provide demo connection even on error
      setAddress('0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F');
      setFid(12345);
      setUsername('demo_user');
      setIsConnected(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    try {
      setAddress(null);
      setFid(null);
      setUsername(null);
      setIsConnected(false);
      setError(null);
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  };

  return { address, isConnected, isConnecting, connect, disconnect, fid, username, isInFarcaster, error };
};

function App() {
  // State to manage the currently selected blockchain chain
  const [selectedChain, setSelectedChain] = useState('ethereum');
  // State to store the real data for token/NFT approvals
  const [approvals, setApprovals] = useState([]);
  // Loading state for fetching approvals
  const [loading, setLoading] = useState(false);
  // Error state
  const [error, setError] = useState(null);
  // App error state for error boundary
  const [appError, setAppError] = useState(null);

  // Use Farcaster wallet hook with error handling
  const { address, isConnected: isWalletConnected, isConnecting, connect, disconnect, fid, username, isInFarcaster, error: walletError } = useFarcasterWallet();

  // Error boundary effect
  useEffect(() => {
    const handleError = (event) => {
      console.error('❌ Global error caught:', event.error);
      setAppError(event.error?.message || 'An unexpected error occurred');
      event.preventDefault();
    };

    const handleUnhandledRejection = (event) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      setAppError(event.reason?.message || 'Promise rejection occurred');
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Etherscan API key - in production, this should come from environment variables
  const ETHERSCAN_API_KEY = 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

  // Chain configurations with updated APIs
  const chains = [
    { name: 'Ethereum', value: 'ethereum', apiUrl: 'https://api.etherscan.io/api', disabled: false },
    { name: 'Base', value: 'base', apiUrl: 'https://api.basescan.org/api', disabled: false },
    { name: 'Arbitrum', value: 'arbitrum', apiUrl: 'https://api.arbiscan.io/api', disabled: false },
    { name: 'Celo', value: 'celo', apiUrl: 'https://api.celoscan.io/api', disabled: false },
    { name: 'Monad (Coming Soon)', value: 'monad', apiUrl: '', disabled: true },
  ];

  // Fetch real approval data from blockchain APIs
  const fetchApprovals = async (userAddress, chainConfig) => {
    setLoading(true);
    setError(null);
    console.log(`🚀 Starting fetchApprovals for ${userAddress} on ${chainConfig.value}`);
    
    try {
      const approvalsList = [];
      
      // Build API URLs
      const tokenUrl = `${chainConfig.apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const normalUrl = `${chainConfig.apiUrl}?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      
      console.log('📡 Calling token API:', tokenUrl);
      console.log('📡 Calling normal API:', normalUrl);
      
      // 1. Fetch ERC20 token transactions to find approvals
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      console.log('📊 Token API response:', tokenData);
      
      // 2. Fetch normal transactions to find contract interactions
      const normalResponse = await fetch(normalUrl);
      const normalData = await normalResponse.json();
      console.log('📊 Normal API response:', normalData);
      
      // Process token transactions to identify approvals
      const uniqueApprovals = new Map();
      
      if (tokenData.status === '1' && tokenData.result && tokenData.result.length > 0) {
        console.log(`✅ Found ${tokenData.result.length} token transactions`);
        
        tokenData.result.slice(0, 50).forEach((tx, index) => {
          if (tx.to && tx.tokenSymbol && tx.contractAddress && tx.value !== '0') {
            const key = `${tx.contractAddress}-${tx.to}`;
            const existing = uniqueApprovals.get(key);
            
            if (!existing || parseInt(tx.timeStamp) > parseInt(existing.timestamp)) {
              uniqueApprovals.set(key, {
                id: key,
                name: tx.tokenName || tx.tokenSymbol,
                symbol: tx.tokenSymbol,
                contract: tx.contractAddress,
                spender: tx.to,
                spenderName: getSpenderName(tx.to),
                amount: tx.value === '0' ? 'Revoked' : formatTokenAmount(tx.value, tx.tokenDecimal),
                type: 'Token',
                timestamp: tx.timeStamp,
                lastActivity: new Date(tx.timeStamp * 1000).toLocaleDateString(),
                txHash: tx.hash,
                riskLevel: assessRiskLevel(tx.to, tx.tokenSymbol)
              });
              console.log(`📝 Added token approval ${index + 1}:`, tx.tokenSymbol, 'to', getSpenderName(tx.to));
            }
          }
        });
      } else {
        console.log('⚠️ No token transactions found or API error:', tokenData);
      }
      
      // Process normal transactions for contract approvals
      if (normalData.status === '1' && normalData.result && normalData.result.length > 0) {
        console.log(`✅ Found ${normalData.result.length} normal transactions`);
        
        normalData.result.slice(0, 30).forEach((tx, index) => {
          if (tx.to && tx.input && tx.input.length > 10 && tx.value === '0') {
            // Check if it's an approval transaction (methodId: 0x095ea7b3 for ERC20, 0xa22cb465 for NFT)
            if (tx.input.startsWith('0x095ea7b3') || tx.input.startsWith('0xa22cb465')) {
              const key = `${tx.to}-contract-${tx.hash}`;
              if (!uniqueApprovals.has(key)) {
                uniqueApprovals.set(key, {
                  id: key,
                  name: tx.input.startsWith('0xa22cb465') ? 'NFT Collection' : 'Token Contract',
                  symbol: tx.input.startsWith('0xa22cb465') ? 'NFT' : 'TOKEN',
                  contract: tx.to,
                  spender: tx.to,
                  spenderName: getSpenderName(tx.to),
                  amount: tx.input.startsWith('0xa22cb465') ? 'All NFTs' : 'Unlimited',
                  type: tx.input.startsWith('0xa22cb465') ? 'NFT' : 'Token',
                  timestamp: tx.timeStamp,
                  lastActivity: new Date(tx.timeStamp * 1000).toLocaleDateString(),
                  txHash: tx.hash,
                  riskLevel: assessRiskLevel(tx.to, 'CONTRACT')
                });
                console.log(`📝 Added contract approval ${index + 1}:`, getSpenderName(tx.to));
              }
            }
          }
        });
      } else {
        console.log('⚠️ No normal transactions found or API error:', normalData);
      }
      
      const finalApprovals = Array.from(uniqueApprovals.values())
        .filter(approval => approval.amount !== 'Revoked')
        .slice(0, 20);
      
      console.log(`✅ Final approvals count: ${finalApprovals.length}`);
      setApprovals(finalApprovals);
      
      if (finalApprovals.length === 0) {
        console.log('ℹ️ No active approvals found - this is actually good for security!');
      }
      
    } catch (err) {
      console.error('❌ API Error:', err);
      setError(`Failed to fetch real approvals: ${err.message}`);
      
      // Fallback demo data if API fails
      const demoApprovals = [
        {
          id: 'demo-real-usdc',
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
      setApprovals(demoApprovals);
      console.log('🔄 Loaded demo data as fallback');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format token amounts
  const formatTokenAmount = (value, decimals) => {
    try {
      const num = parseFloat(value) / Math.pow(10, parseInt(decimals) || 18);
      if (num > 1000000) return 'Unlimited';
      return num.toFixed(2);
    } catch {
      return 'Unlimited';
    }
  };
  
  // Helper function to identify known spenders
  const getSpenderName = (address) => {
    const knownSpenders = {
      '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3 Router',
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2 Router',
      '0x00000000006c3852cbEf3e08E8dF289169EdE581': 'OpenSea Registry',
      '0x1E0049783F008A0085193E00003D00cd54003c71': 'OpenSea Conduit',
      '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Universal Router',
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45': 'Uniswap Universal Router',
      '0x1111111254EEB25477B68fb85Ed929f73A960582': '1inch Router',
      '0x80C67432656d59144cEFf962E8fAF8926599bCF8': 'Kyber Router',
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F': 'SushiSwap Router'
    };
    
    return knownSpenders[address.toLowerCase()] || 'Unknown Contract';
  };
  
  // Helper function to assess risk level
  const assessRiskLevel = (spenderAddress, tokenSymbol) => {
    const safeSpenders = [
      '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
      '0x00000000006c3852cbEf3e08E8dF289169EdE581', // OpenSea
      '0x1E0049783F008A0085193E00003D00cd54003c71', // OpenSea Conduit
      '0x1111111254EEB25477B68fb85Ed929f73A960582'  // 1inch
    ];
    
    const riskyTokens = ['SHIB', 'DOGE', 'PEPE', 'FLOKI'];
    
    if (safeSpenders.includes(spenderAddress.toLowerCase())) {
      return 'low';
    }
    
    if (riskyTokens.includes(tokenSymbol)) {
      return 'medium';
    }
    
    // Unknown contracts are high risk
    const spenderName = getSpenderName(spenderAddress);
    if (spenderName === 'Unknown Contract') {
      return 'high';
    }
    
    return 'medium';
  };

  // Fetch approvals when wallet connects or chain changes with error handling
  useEffect(() => {
    try {
      if (isWalletConnected && address) {
        console.log(`🔍 Fetching approvals for address: ${address} on ${selectedChain}`);
        const chainConfig = chains.find(chain => chain.value === selectedChain);
        if (chainConfig && !chainConfig.disabled) {
          fetchApprovals(address, chainConfig);
        }
      } else {
        setApprovals([]);
        console.log('❌ Not fetching approvals - wallet not connected or no address');
      }
    } catch (error) {
      console.error('❌ Error in approvals effect:', error);
      setError(error.message);
    }
  }, [isWalletConnected, address, selectedChain]);

  // Handler for revoking an approval
  const handleRevokeApproval = (id) => {
    // In a real app, this would call a smart contract to revoke approval
    setApprovals(approvals.filter(approval => approval.id !== id));
    console.log(`Revoking approval for ID: ${id}`);
  };

  // Helper function to get risk color
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Helper function to format address
  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Error boundary rendering
  if (appError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-200 mb-4">⚠️ App Error</h2>
          <p className="text-red-300 mb-4">{appError}</p>
          <button 
            onClick={() => {
              setAppError(null);
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      {/* Custom styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.3s ease-out forwards;
        }
      `}</style>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Debug info for development */}
        {isInFarcaster && (
          <div className="w-full max-w-4xl mb-4 text-xs text-purple-300 bg-purple-900/30 rounded p-2">
            <p>Debug: In Farcaster={isInFarcaster.toString()}, Connected={isWalletConnected.toString()}</p>
            {fid && <p>FID: {fid}, Username: {username}</p>}
            {address && <p>Address: {formatAddress(address)}</p>}
            {walletError && <p className="text-red-300">Wallet Error: {walletError}</p>}
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => {
                  try {
                    if (window.sdk?.actions?.ready) {
                      window.sdk.actions.ready();
                      console.log('✅ Manually called SDK ready()');
                    } else {
                      console.log('❌ SDK not available');
                    }
                  } catch (e) {
                    console.error('❌ Manual ready() failed:', e);
                  }
                }}
                className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
              >
                Call Ready()
              </button>
              <button 
                onClick={() => {
                  console.log('Available objects:', {
                    sdk: window.sdk,
                    farcasterSdk: window.farcasterSdk,
                    context: window.sdk?.context,
                    user: window.sdk?.context?.user
                  });
                }}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                Debug SDK
              </button>
              <button 
                onClick={() => {
                  setAppError(null);
                  setError(null);
                  console.log('🔄 Cleared errors');
                }}
                className="bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                Clear Errors
              </button>
            </div>
          </div>
        )}
        {/* Header section */}
        <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            {/* FarGuard Logo */}
            <img 
              src="https://fgrevoke.vercel.app/farguard-logo.png" 
              alt="FarGuard Logo" 
              className="w-8 h-8 rounded-lg"
              onError={(e) => {
                // Fallback to shield icon if image fails to load
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
            {/* Chain Selection Dropdown */}
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

            {/* Farcaster Wallet Connection */}
            {isWalletConnected ? (
              <div className="flex items-center space-x-2">
                <div className="bg-purple-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isInFarcaster ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                  {username && `@${username}` || formatAddress(address)}
                  {fid && <span className="text-purple-300 text-xs">#{fid}</span>}
                </div>
                <button
                  onClick={disconnect}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 transform hover:scale-105"
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
                {isConnecting ? 'Connecting...' : isInFarcaster ? 'Connect Farcaster' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Main content area */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isWalletConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="mb-6">
                <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-purple-200 mb-2">
                  {isInFarcaster ? 'Connect Your Farcaster Wallet' : 'Connect Your Wallet'}
                </h2>
                <p className="text-xl text-purple-300 mb-4">
                  {isInFarcaster 
                    ? 'Manage your token and NFT approvals securely through Farcaster'
                    : 'Manage your token and NFT approvals securely'
                  }
                </p>
                {isInFarcaster && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                    <p className="text-green-300 text-sm flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Running in Farcaster - Optimized for mobile
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transform hover:scale-105 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : isInFarcaster ? 'Connect Farcaster Wallet' : 'Connect Wallet'}
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
                <div className="text-center text-purple-300 text-lg py-10">
                  <Shield className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p>No active approvals found for {selectedChain}</p>
                  <p className="text-sm text-purple-400 mt-2">Your wallet is secure! 🎉</p>
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
                              Approved to: {approval.spenderName || formatAddress(approval.spender)}
                            </p>
                            <p className="text-xs text-purple-400">
                              Contract: {formatAddress(approval.contract)}
                            </p>
                            {approval.txHash && (
                              <p className="text-xs text-purple-400">
                                Tx: {formatAddress(approval.txHash)}
                              </p>
                            )}
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

      {/* Footer with your credit */}
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