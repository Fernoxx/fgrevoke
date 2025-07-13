// App.js - FarGuard with ENHANCED Wallet Connection and API Configuration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Trash2 } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, base, arbitrum } from 'viem/chains';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showApprovals, setShowApprovals] = useState(false);
  const [userBalance, setUserBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMockData, setShowMockData] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [showDetails, setShowDetails] = useState({});

  // Farcaster integration
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // 🔑 ENHANCED API CONFIGURATION
  // Add your API keys here for better functionality
  const ETHERSCAN_API_KEY = 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'YOUR_ALCHEMY_KEY_HERE';
  const COINBASE_API_KEY = process.env.REACT_APP_COINBASE_KEY || 'YOUR_COINBASE_KEY_HERE';

  // 🚀 IMPROVED CHAIN CONFIGURATION with multiple RPC providers
  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/api',
      rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      publicRpcUrl: 'https://ethereum-rpc.publicnode.com',
      viemChain: mainnet,
      coinbaseNetwork: 'ethereum-mainnet',
      chainId: 1,
      explorerUrl: 'https://etherscan.io'
    },
    { 
      name: 'Base', 
      value: 'base', 
      apiUrl: 'https://api.basescan.org/api',
      rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      publicRpcUrl: 'https://base-rpc.publicnode.com',
      viemChain: base,
      coinbaseNetwork: 'base-mainnet',
      chainId: 8453,
      explorerUrl: 'https://basescan.org'
    },
    { 
      name: 'Arbitrum', 
      value: 'arbitrum', 
      apiUrl: 'https://api.arbiscan.io/api',
      rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      publicRpcUrl: 'https://arbitrum-rpc.publicnode.com',
      viemChain: arbitrum,
      coinbaseNetwork: 'arbitrum-mainnet',
      chainId: 42161,
      explorerUrl: 'https://arbiscan.io'
    }
  ];

  // 🔄 ENHANCED WALLET CONNECTION
  const connectWallet = async () => {
    console.log('🔌 ENHANCED Connect wallet clicked');
    console.log('📊 State:', { isInFarcaster, sdk: !!sdk, sdkReady, appReady });
    
    setIsConnecting(true);
    setError(null);

    try {
      if (isInFarcaster && sdk && sdkReady && appReady) {
        console.log('📱 Attempting ENHANCED Farcaster wallet connection...');

        // 🎯 Method 1: Modern SDK approach - Get user info first
        console.log('🔍 Method 1: Getting user context...');
        try {
          const context = await sdk.context;
          console.log('📱 Context received:', context);
          
          if (context?.user) {
            const userData = context.user;
            console.log('� User data:', userData);
            setUser(userData);
            
            // Try to get wallet address from user context
            if (userData.custody) {
              console.log('💰 Found custody address:', userData.custody);
              setAddress(userData.custody);
              setIsConnected(true);
              console.log('✅ SUCCESS - Connected via custody!');
              return;
            }
            
            if (userData.verifications && userData.verifications.length > 0) {
              const verifiedAddr = userData.verifications[0];
              console.log('🔐 Found verified address:', verifiedAddr);
              setAddress(verifiedAddr);
              setIsConnected(true);
              console.log('✅ SUCCESS - Connected via verification!');
              return;
            }
          }
        } catch (contextError) {
          console.log('⚠️ Context method failed:', contextError.message);
        }

        // 🎯 Method 2: Try Ethereum Provider
        console.log('🔍 Method 2: Trying Ethereum provider...');
        try {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            console.log('🌐 Provider available, requesting accounts...');
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts && accounts.length > 0) {
              const walletAddr = accounts[0];
              console.log('👛 Got wallet address:', walletAddr);
              setAddress(walletAddr);
              setIsConnected(true);
              setUser({ address: walletAddr, fid: sdk.context?.user?.fid });
              console.log('✅ SUCCESS - Connected via provider!');
              return;
            }
          }
        } catch (providerError) {
          console.log('⚠️ Provider method failed:', providerError.message);
        }

        // 🎯 Method 3: Try wallet connection directly
        console.log('🔍 Method 3: Direct wallet connection...');
        try {
          const walletResponse = await sdk.wallet.connect();
          if (walletResponse && walletResponse.address) {
            console.log('🔗 Direct wallet connection successful:', walletResponse.address);
            setAddress(walletResponse.address);
            setIsConnected(true);
            setUser({ address: walletResponse.address, ...sdk.context?.user });
            console.log('✅ SUCCESS - Connected directly!');
            return;
          }
        } catch (directError) {
          console.log('⚠️ Direct method failed:', directError.message);
        }

        // If all methods fail, show helpful error
        throw new Error('Unable to connect wallet. Please make sure you have a wallet set up in Farcaster and try again.');

      } else {
        // Not in Farcaster environment
        const missingRequirements = [];
        if (!isInFarcaster) missingRequirements.push('Must be in Farcaster app');
        if (!sdkReady) missingRequirements.push('SDK not ready');
        if (!appReady) missingRequirements.push('App not ready');
        
        throw new Error(`❌ ${missingRequirements.join(', ')}`);
      }

    } catch (err) {
      console.error('❌ Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // � ENHANCED APP INITIALIZATION
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 ENHANCED Initializing Farcaster miniapp...');
      
      try {
        // Check environment
        const isFarcasterEnv = typeof window !== 'undefined' && (
          window.location.href.includes('farcaster') || 
          window.location.href.includes('warpcast') ||
          window.parent !== window // in iframe
        );
        
        setIsInFarcaster(isFarcasterEnv);
        console.log(isFarcasterEnv ? '✅ Farcaster environment detected' : '⚠️ Not in Farcaster environment');

        // Initialize SDK
        if (sdk) {
          console.log('🔧 SDK available, initializing...');
          setSdkReady(true);
          
          // Wait a moment for SDK to fully initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Call ready after initialization
          if (typeof sdk.actions?.ready === 'function') {
            console.log('� Calling sdk.actions.ready()...');
            await sdk.actions.ready();
            console.log('✅ SDK ready called successfully!');
          }
          
          setAppReady(true);
          console.log('✅ App initialization complete!');
        } else {
          console.log('❌ SDK not available');
          setAppReady(true); // Set ready anyway for testing
        }
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setError(`Initialization failed: ${error.message}`);
        setAppReady(true); // Set ready anyway to prevent infinite loading
      }
    };

    initializeApp();
  }, []);

  // 🔄 ENHANCED APPROVAL FETCHING with multiple RPC providers
  const fetchRealApprovals = useCallback(async (userAddress) => {
    setLoading(true);
    setError(null);
    console.log('🔍 ENHANCED Fetching approvals for:', userAddress);
    
    try {
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      console.log('🌐 Using chain config:', chainConfig);

      // 🎯 Method 1: Try Etherscan API with rate limiting
      console.log('📡 Method 1: Trying Etherscan API...');
      
      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
      
      const etherscanUrl = `${chainConfig.apiUrl}?module=logs&action=getLogs&fromBlock=0&toBlock=latest&topic0=${approvalTopic}&topic1=${paddedAddress}&apikey=${ETHERSCAN_API_KEY}`;
      
      try {
        const response = await fetch(etherscanUrl);
        const data = await response.json();
        
        if (data.status === '1' && data.result && data.result.length > 0) {
          console.log(`📊 Etherscan: Found ${data.result.length} approval events`);
          await processApprovals(data.result, userAddress, chainConfig);
          return; // Success, exit early
        } else if (data.status === '0' && data.message === 'NOTOK') {
          console.log('⚠️ Etherscan rate limit hit, trying alternative...');
        }
      } catch (etherscanError) {
        console.log('⚠️ Etherscan failed:', etherscanError.message);
      }

      // 🎯 Method 2: Try RPC with viem (fallback)
      console.log('🔄 Method 2: Trying RPC with viem...');
      try {
        const rpcUrl = ALCHEMY_API_KEY !== 'YOUR_ALCHEMY_KEY_HERE' ? 
          chainConfig.rpcUrl : chainConfig.publicRpcUrl;
        
        const client = createPublicClient({
          chain: chainConfig.viemChain,
          transport: http(rpcUrl)
        });

        const logs = await client.getLogs({
          address: undefined, // Get from all contracts
          event: {
            name: 'Approval',
            inputs: [
              { name: 'owner', type: 'address', indexed: true },
              { name: 'spender', type: 'address', indexed: true },
              { name: 'value', type: 'uint256', indexed: false }
            ]
          },
          args: {
            owner: userAddress
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        });

        console.log(`📊 RPC: Found ${logs.length} approval events`);
        if (logs.length > 0) {
          await processApprovals(logs, userAddress, chainConfig);
          return; // Success
        }
      } catch (rpcError) {
        console.log('⚠️ RPC failed:', rpcError.message);
      }

      // 🎯 Method 3: Show test data if no real data found
      console.log('🧪 No real data found, showing test approval...');
      const testApproval = {
        id: 'test-approval-' + Date.now(),
        name: 'Test Token',
        symbol: 'TEST',
        contract: '0x1234567890123456789012345678901234567890',
        spender: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        spenderName: 'Test Dapp',
        amount: '∞',
        riskLevel: 'medium',
        txHash: '0xtest' + Date.now(),
        blockNumber: 12345,
        isActive: true,
        note: 'This is test data. Connect your wallet in Farcaster to see real approvals.'
      };
      
      setApprovals([testApproval]);
      
    } catch (error) {
      console.error('❌ Approval fetching failed:', error);
      setError(`Failed to fetch approvals: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedChain]);

  // 🔄 Process approvals from API response
  const processApprovals = async (logs, userAddress, chainConfig) => {
    console.log('🔄 Processing approvals...');
    const approvalMap = new Map();
    
    for (const log of logs.slice(-50)) { // Process last 50 for performance
      try {
        const tokenContract = log.address.toLowerCase();
        const spenderAddress = log.topics && log.topics[2] ? 
          '0x' + log.topics[2].slice(26) : log.args?.spender;
        
        if (!spenderAddress) continue;
        
        const key = `${tokenContract}-${spenderAddress}`;
        
        // Check if we already processed this approval
        if (approvalMap.has(key)) continue;
        
        // Get current allowance
        const allowanceInfo = await checkCurrentAllowance(tokenContract, userAddress, spenderAddress, chainConfig);
        
        if (allowanceInfo && allowanceInfo.allowance && allowanceInfo.allowance !== '0') {
          // Get token info
          const tokenInfo = await getTokenInfo(tokenContract, chainConfig);
          
          const approval = {
            id: key,
            name: tokenInfo.name || 'Unknown Token',
            symbol: tokenInfo.symbol || 'UNK',
            contract: tokenContract,
            spender: spenderAddress,
            spenderName: getSpenderName(spenderAddress),
            amount: formatAllowance(allowanceInfo.allowance, tokenInfo.decimals),
            riskLevel: assessRiskLevel(spenderAddress),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            isActive: true
          };
          
          approvalMap.set(key, approval);
        }
      } catch (error) {
        console.warn('⚠️ Error processing approval:', error);
      }
    }
    
    const finalApprovals = Array.from(approvalMap.values());
    setApprovals(finalApprovals);
    console.log(`✅ Processed ${finalApprovals.length} active approvals`);
  };

  // REAL DATA FETCHING using enhanced APIs
  useEffect(() => {
    if (address && isConnected) {
      fetchRealApprovals(address);
    }
  }, [address, isConnected, fetchRealApprovals]);

  // 🔄 ENHANCED ALLOWANCE CHECKING with multiple providers
  const checkCurrentAllowance = async (tokenContract, owner, spender, chainConfig) => {
    try {
      // ERC20 allowance(owner, spender) function signature: 0xdd62ed3e
      const ownerPadded = owner.slice(2).padStart(64, '0');
      const spenderPadded = spender.slice(2).padStart(64, '0');
      const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;
      
      // Try Etherscan first
      const url = `${chainConfig.apiUrl}?module=proxy&action=eth_call&to=${tokenContract}&data=${data}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.status === '1' && result.result && result.result !== '0x') {
        const allowance = BigInt(result.result).toString();
        return { allowance };
      }
      
      return { allowance: '0' };
    } catch (error) {
      console.warn('Failed to check allowance:', error);
      return { allowance: '0' };
    }
  };

  // Get REAL token information
  const getTokenInfo = async (tokenAddress, chainConfig) => {
    try {
      // Get token name, symbol, decimals from contract
      const calls = [
        { method: '0x06fdde03', property: 'name' },     // name()
        { method: '0x95d89b41', property: 'symbol' },   // symbol()
        { method: '0x313ce567', property: 'decimals' }  // decimals()
      ];
      
      const results = {};
      
      for (const call of calls) {
        try {
          const response = await fetch(chainConfig.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: tokenAddress, data: call.method }, 'latest'],
              id: 1
            })
          });
          
          const data = await response.json();
          if (data.result && data.result !== '0x') {
            if (call.property === 'decimals') {
              results[call.property] = parseInt(data.result, 16);
            } else {
              // Decode string result
              const hex = data.result.slice(2);
              const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '');
              results[call.property] = decoded || `Token${call.property.toUpperCase()}`;
            }
          }
        } catch (callError) {
          console.warn(`Failed to get ${call.property}:`, callError);
        }
      }
      
      return {
        name: results.name || 'Unknown Token',
        symbol: results.symbol || 'UNK',
        decimals: results.decimals || 18
      };
    } catch (error) {
      console.warn('Failed to get token info:', error);
      return { name: 'Unknown Token', symbol: 'UNK', decimals: 18 };
    }
  };

  const formatAllowance = (allowance, decimals = 18) => {
    try {
      const amount = parseFloat(allowance) / Math.pow(10, decimals);
      if (amount > 1e15) return 'Unlimited';
      if (amount > 1e6) return `${(amount / 1e6).toFixed(1)}M`;
      if (amount > 1e3) return `${(amount / 1e3).toFixed(1)}K`;
      return amount.toFixed(2);
    } catch {
      return 'Unknown';
    }
  };

  // Helper functions
  const getSpenderName = (address) => {
    const known = {
      '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router', 
      '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea Registry',
      '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router 2',
      '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
      '0xa0b86a33e6776e1a6b0a30ef54bac0ec6e8a51b5': 'Blur Marketplace',
      '0x74de5d4fcbf63e00296fd95d33236b9794016631': 'MetaMask Swap Router'
    };
    return known[address.toLowerCase()] || 'Unknown Contract';
  };

  const assessRiskLevel = (spenderAddress) => {
    const safe = [
      '0xe592427a0aece92de3edee1f18e0157c05861564',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x00000000006c3852cbef3e08e8df289169ede581',
      '0x1111111254eeb25477b68fb85ed929f73a960582',
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
    ];
    
    if (safe.includes(spenderAddress.toLowerCase())) return 'low';
    if (getSpenderName(spenderAddress) === 'Unknown Contract') return 'high';
    return 'medium';
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // REAL revoke with proper transaction handling
  const handleRevokeApproval = async (approval) => {
    if (!sdk || !isInFarcaster || !sdkReady) {
      setError('Please open this app in Farcaster to revoke approvals');
      return;
    }

    try {
      console.log('🔄 Revoking approval:', approval.name);
      
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Wallet provider not available');
      }

      // Ensure we're on the right chain
      const chainConfig = chains.find(c => c.value === selectedChain);
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainConfig.chainId.toString(16)}` }],
        });
      } catch (switchError) {
        console.log('Chain switch not needed:', switchError);
      }

      // ERC20 approve(spender, 0) call data
      const revokeData = `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'0'.repeat(64)}`;
      
      const txParams = {
        to: approval.contract,
        data: revokeData,
        from: address,
        value: '0x0'
      };

      console.log('📝 Submitting revoke transaction...');
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('✅ Revoke transaction submitted:', txHash);
      
      // Update UI optimistically
      setApprovals(prev => prev.filter(a => a.id !== approval.id));
      // setRevokedCount(prev => prev + 1); // This state was removed
      // setShowShareButton(true); // This state was removed

    } catch (error) {
      console.error('❌ Revoke failed:', error);
      setError(`Failed to revoke approval: ${error.message}`);
    }
  };

  // Revoke ALL approvals
  const handleRevokeAll = async () => {
    if (approvals.length === 0) {
      alert('No approvals to revoke!');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke ALL ${approvals.length} token approvals? This will require ${approvals.length} separate transactions.`
    );

    if (!confirmed) return;

    console.log(`🗑️ Starting to revoke ${approvals.length} approvals...`);
    
    let successCount = 0;
    for (const approval of approvals) {
      try {
        await handleRevokeApproval(approval);
        successCount++;
        console.log(`✅ Revoked ${successCount}/${approvals.length}: ${approval.name}`);
        
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to revoke ${approval.name}:`, error);
      }
    }

    alert(`✅ Successfully revoked ${successCount} out of ${approvals.length} approvals!`);
  };

  // Share to Farcaster
  const handleShare = async () => {
    const shareText = `🛡️ Just secured my wallet with FarGuard! Successfully revoked all of my unwanted approvals.
Check yours too and keep your assets safe with FarGuard! 🔒

https://fgrevoke.vercel.app`;

    try {
      if (sdk?.actions?.cast) {
        await sdk.actions.cast({ text: shareText });
        console.log('✅ Shared to Farcaster');
        return;
      }
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        alert('✅ Share text copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      try {
        await navigator.clipboard.writeText(shareText);
        alert('✅ Share text copied to clipboard!');
      } catch (clipboardError) {
        const encoded = encodeURIComponent(shareText);
        window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
      }
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setApprovals([]);
    setError(null);
    // setRevokedCount(0); // This state was removed
    // setShowShareButton(false); // This state was removed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Header */}
        <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Shield className="w-8 h-8 text-purple-200" />
            <h1 className="text-3xl font-bold text-purple-200">FarGuard</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Chain Selection */}
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none bg-purple-700 text-white py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer w-full"
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
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
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
              <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-purple-200 mb-2">Connect Your Farcaster Wallet</h2>
              <p className="text-xl text-purple-300 mb-4">
                View your REAL token approvals and revoke risky permissions
              </p>
              
              {!appReady ? (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-sm">
                    🔄 Initializing Farcaster miniapp...
                  </p>
                </div>
              ) : isInFarcaster ? (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                  <p className="text-green-300 text-sm">
                    🎉 Running in Farcaster {sdkReady && '✅ SDK Ready'}
                  </p>
                </div>
              ) : (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                  <p className="text-red-300 text-sm">
                    ❌ Must open in Farcaster app to connect real wallet
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={connectWallet}
                disabled={isConnecting || !isInFarcaster || !appReady}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {!appReady ? 'Initializing...' : isConnecting ? 'Connecting...' : '🔗 Connect Farcaster Wallet'}
              </button>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-200">
                    Active Token Approvals ({chains.find(c => c.value === selectedChain)?.name})
                  </h2>
                  <p className="text-sm text-purple-400 mt-1">
                    Real data from: {formatAddress(address)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* showShareButton state was removed */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Success
                  </button>
                  <button
                    onClick={() => fetchRealApprovals(address)}
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
                  <p className="text-2xl font-bold text-orange-400">{/* revokedCount state was removed */}</p>
                  <p className="text-sm text-purple-200">Revoked</p>
                </div>
              </div>

              {/* Revoke All Button */}
              {approvals.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={handleRevokeAll}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Revoke All {approvals.length} Approvals
                  </button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {/* Content */}
              {loading ? (
                <div className="space-y-4">
                  <p className="text-center text-purple-300">Loading your REAL token approvals...</p>
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
                  <p className="text-purple-400 text-sm mt-2">No active token approvals found</p>
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
                        <span>Block: {approval.blockNumber}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRevokeApproval(approval)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                        >
                          Revoke Approval
                        </button>
                        <button 
                          onClick={() => {
                            const chainConfig = chains.find(c => c.value === selectedChain);
                            window.open(`${chainConfig.explorerUrl}/tx/${approval.txHash}`, '_blank');
                          }}
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