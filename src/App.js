// Fixed App.js - FarGuard with Complete Activity Tracking for All Chains
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Trash2, BarChart3, ArrowLeft, Activity } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('approvals'); // 'approvals' or 'activity'

  // Farcaster integration states
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [context, setContext] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [provider, setProvider] = useState(null);

  // Activity states for all chains
  const [chainActivity, setChainActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityStats, setActivityStats] = useState({
    totalTransactions: 0,
    totalValue: 0,
    totalGasFees: 0,
    dappsUsed: 0,
    lastActivity: null
  });

  // API Configuration with better rate limiting
  const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r';
  const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY || 'e0dab6b6fd544048b38913529be65eeb';
  const BASESCAN_KEY = process.env.REACT_APP_BASESCAN_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ARBISCAN_KEY = process.env.REACT_APP_ARBISCAN_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

  // Rate limiting state
  const [lastApiCall, setLastApiCall] = useState(0);
  const [apiCallCount, setApiCallCount] = useState(0);

  // Chain configuration
  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/api',
      chainId: 1,
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: 'ETH'
    },
    { 
      name: 'Base', 
      value: 'base', 
      apiUrl: 'https://api.basescan.org/api',
      chainId: 8453,
      explorerUrl: 'https://basescan.org',
      nativeCurrency: 'ETH'
    },
    { 
      name: 'Arbitrum', 
      value: 'arbitrum', 
      apiUrl: 'https://api.arbiscan.io/api',
      chainId: 42161,
      explorerUrl: 'https://arbiscan.io',
      nativeCurrency: 'ETH'
    }
  ];

  // Get API key for current chain
  const getApiKey = (chain) => {
    switch(chain) {
      case 'base': return BASESCAN_KEY;
      case 'arbitrum': return ARBISCAN_KEY;
      default: return ETHERSCAN_API_KEY;
    }
  };

  // Rate limiting helper
  const respectRateLimit = async () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    const minInterval = 300; // Increased to 300ms for better reliability

    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    setLastApiCall(Date.now());
    setApiCallCount(prev => prev + 1);
  };

  // Enhanced API call wrapper with better error handling
  const makeApiCall = async (url, context = 'API call', retries = 2) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await respectRateLimit();
        
        console.log(`🌐 ${context} (attempt ${attempt}):`, url.split('&apikey=')[0] + '&apikey=***');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`📊 ${context} response:`, { 
          status: data.status, 
          message: data.message,
          resultCount: Array.isArray(data.result) ? data.result.length : 'N/A'
        });
        
        // Handle different types of responses
        if (data.status === '0') {
          const errorMessage = data.message || data.result || 'Unknown API error';
          
          // Handle specific errors
          if (errorMessage.includes('rate limit') || errorMessage.includes('Max rate limit')) {
            if (attempt < retries) {
              console.log(`⏳ Rate limit hit, waiting before retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
              continue;
            }
            throw new Error('Rate limit reached. Please wait and try again.');
          }
          
          if (errorMessage.includes('No transactions found') || 
              errorMessage.includes('No records found') ||
              errorMessage.includes('No logs found') ||
              errorMessage.toLowerCase().includes('no result')) {
            return { status: '1', result: [] }; // Return empty result for no data
          }
          
          if (errorMessage.includes('Invalid API Key')) {
            throw new Error('Invalid API key configuration.');
          }
          
          // For debugging - log the exact error but don't crash the app
          console.warn(`⚠️ API returned error: ${errorMessage}`);
          
          // Return empty result for unknown errors to prevent app crashes
          if (attempt >= retries) {
            console.error(`❌ API failed after ${retries} attempts: ${errorMessage}`);
            return { status: '1', result: [] };
          }
          
          throw new Error(`API Error: ${errorMessage}`);
        }
        
        return data;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`⏰ ${context} timed out (attempt ${attempt})`);
          if (attempt < retries) continue;
          throw new Error('Request timed out. Please try again.');
        }
        
        console.error(`❌ ${context} failed (attempt ${attempt}):`, error.message);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }
  };

  // PROPER SDK Initialization
  useEffect(() => {
    const initializeSDK = async () => {
      console.log('🚀 Initializing Farcaster SDK...');
      
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        console.log('📱 Is in MiniApp:', isInMiniApp);
        
        if (!isInMiniApp) {
          console.log('⚠️ Not running in Farcaster miniapp');
          setError('This app must be opened in Farcaster');
          return;
        }

        const contextData = await sdk.context;
        console.log('📊 Context data:', contextData);
        setContext(contextData);

        if (contextData?.user) {
          console.log('👤 User found in context:', contextData.user);
          setUser(contextData.user);
        }

        console.log('📞 Calling sdk.actions.ready()...');
        await sdk.actions.ready();
        console.log('✅ SDK ready called successfully!');
        
        setSdkReady(true);
        
      } catch (error) {
        console.error('❌ SDK initialization failed:', error);
        setError(`Failed to initialize: ${error.message}`);
      }
    };

    initializeSDK();
  }, []);

  // Wallet Connection
  const connectWallet = async () => {
    console.log('🔌 Starting wallet connection...');
    setIsConnecting(true);
    setError(null);

    try {
      if (!sdkReady) {
        throw new Error('SDK not ready. Please wait for initialization.');
      }

      console.log('🌐 Getting Ethereum provider...');
      const ethProvider = await sdk.wallet.getEthereumProvider();
      
      if (!ethProvider) {
        throw new Error('Ethereum provider not available. Please ensure you have a wallet connected in Farcaster.');
      }

      console.log('✅ Provider obtained, requesting accounts...');
      setProvider(ethProvider);

      const accounts = await ethProvider.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const walletAddress = accounts[0].toLowerCase();
      console.log('👛 Wallet connected:', walletAddress);

      const chainId = await ethProvider.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);

      const chainIdNum = parseInt(chainId, 16);
      let detectedChain = 'ethereum';
      if (chainIdNum === 8453) detectedChain = 'base';
      if (chainIdNum === 42161) detectedChain = 'arbitrum';
      
      console.log(`🔗 Detected chain: ${detectedChain} (${chainIdNum})`);
      setSelectedChain(detectedChain);

      setAddress(walletAddress);
      setIsConnected(true);
      
      if (!user && context?.user) {
        setUser(context.user);
      } else if (!user) {
        setUser({ address: walletAddress });
      }

      console.log('🎉 Wallet connection successful!');

    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch approvals function
  const fetchRealApprovals = useCallback(async (userAddress) => {
    if (!userAddress || !selectedChain) return;
    
    setLoading(true);
    setError(null);
    console.log('🔍 Fetching approvals for:', userAddress, 'on chain:', selectedChain);
    
    try {
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      const apiKey = getApiKey(selectedChain);

      // Use a broader block range and different approach for reliability
      let fromBlock = 'earliest';
      
      // For recent activity, use last 100k blocks
      try {
        const latestBlockResponse = await makeApiCall(
          `${chainConfig.apiUrl}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`,
          'Latest Block'
        );
        
        if (latestBlockResponse.result) {
          const latestBlock = parseInt(latestBlockResponse.result, 16);
          fromBlock = Math.max(0, latestBlock - 100000).toString();
          console.log(`📊 Using block range: ${fromBlock} to latest`);
        }
      } catch (blockError) {
        console.log('⚠️ Using earliest block as fallback');
        fromBlock = 'earliest';
      }

      // Get ERC20 token transfers to find tokens user has interacted with
      const transferResponse = await makeApiCall(
        `${chainConfig.apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=${fromBlock}&endblock=latest&page=1&offset=100&sort=desc&apikey=${apiKey}`,
        'Token Transfers'
      );

      let tokensToCheck = new Set();
      
      if (transferResponse.result && transferResponse.result.length > 0) {
        // Get unique token contracts from transfers
        transferResponse.result.forEach(transfer => {
          if (transfer.contractAddress) {
            tokensToCheck.add(transfer.contractAddress.toLowerCase());
          }
        });
        console.log(`🎯 Found ${tokensToCheck.size} tokens from transfers`);
      }

      // If no token transfers found, try approval events
      if (tokensToCheck.size === 0) {
        const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
        const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
        
        const logsResponse = await makeApiCall(
          `${chainConfig.apiUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=latest&topic0=${approvalTopic}&topic1=0x${paddedAddress}&apikey=${apiKey}`,
          'Approval Logs'
        );
        
        if (logsResponse.result && logsResponse.result.length > 0) {
          logsResponse.result.forEach(log => {
            if (log.address) {
              tokensToCheck.add(log.address.toLowerCase());
            }
          });
          console.log(`📝 Found ${tokensToCheck.size} tokens from approval logs`);
        }
      }

      if (tokensToCheck.size === 0) {
        console.log('ℹ️ No token interactions found for this address');
        setApprovals([]);
        return;
      }

      // Check current allowances for found tokens
      const activeApprovals = [];
      let processedCount = 0;
      
      for (const tokenContract of Array.from(tokensToCheck).slice(0, 20)) { // Limit to 20 tokens
        try {
          console.log(`🔍 Checking token ${processedCount + 1}/${Math.min(tokensToCheck.size, 20)}: ${tokenContract.slice(0,8)}...`);
          
          // Get token info first
          const tokenInfo = await getTokenInfo(tokenContract, chainConfig, apiKey);
          
          // Check for common spenders
          const commonSpenders = [
            '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
            '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
            '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
            '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router 2
            '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router
          ];
          
          for (const spender of commonSpenders) {
            try {
              const allowanceInfo = await checkCurrentAllowance(tokenContract, userAddress, spender, chainConfig, apiKey);
              
              if (allowanceInfo && allowanceInfo.allowance && allowanceInfo.allowance !== '0') {
                const approval = {
                  id: `${tokenContract}-${spender}`,
                  name: tokenInfo.name || 'Unknown Token',
                  symbol: tokenInfo.symbol || 'UNK',
                  contract: tokenContract,
                  spender: spender,
                  spenderName: getSpenderName(spender),
                  amount: formatAllowance(allowanceInfo.allowance, tokenInfo.decimals),
                  riskLevel: assessRiskLevel(spender),
                  isActive: true
                };
                
                activeApprovals.push(approval);
                console.log(`✅ Active approval: ${approval.name} -> ${approval.spenderName}`);
              }
            } catch (allowanceError) {
              console.warn(`⚠️ Allowance check failed for ${spender}:`, allowanceError.message);
            }
          }
          
          processedCount++;
          
          // Rate limiting between token checks
          if (processedCount < tokensToCheck.size) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (tokenError) {
          console.warn(`⚠️ Token check failed for ${tokenContract}:`, tokenError.message);
        }
      }
      
      setApprovals(activeApprovals);
      console.log(`✅ Found ${activeApprovals.length} active approvals`);
      
    } catch (error) {
      console.error('❌ Approval fetching failed:', error);
      // Don't show error for empty results or network issues
      if (error.message.includes('No transactions') || 
          error.message.includes('No records') ||
          error.message.includes('Rate limit')) {
        console.log('ℹ️ No approvals found or rate limited - this is normal');
        setApprovals([]);
      } else {
        setError(`Failed to fetch approvals: ${error.message}`);
        setApprovals([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedChain]);

  // Fetch activity for the selected chain
  const fetchChainActivity = useCallback(async (userAddress) => {
    if (!userAddress || !selectedChain) return;
    
    setLoadingActivity(true);
    setError(null);
    console.log('🔍 Fetching activity for:', userAddress, 'on chain:', selectedChain);
    
    try {
      const chainConfig = chains.find(c => c.value === selectedChain);
      const apiKey = getApiKey(selectedChain);
      
      // Get latest block for range
      let fromBlock = '0';
      try {
        const blockResponse = await makeApiCall(
          `${chainConfig.apiUrl}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`,
          'Latest Block for Activity'
        );
        if (blockResponse.result) {
          const latestBlock = parseInt(blockResponse.result, 16);
          fromBlock = Math.max(0, latestBlock - 50000).toString(); // Last ~50k blocks for better performance
          console.log(`📊 Activity block range: ${fromBlock} to latest`);
        }
      } catch (blockError) {
        console.log('⚠️ Could not get latest block for activity, using fromBlock=0');
      }

      // Get normal transactions
      const txResponse = await makeApiCall(
        `${chainConfig.apiUrl}?module=account&action=txlist&address=${userAddress}&startblock=${fromBlock}&endblock=latest&page=1&offset=50&sort=desc&apikey=${apiKey}`,
        `${chainConfig.name} Transactions`
      );
      
      let allActivity = [];
      
      if (txResponse.result && txResponse.result.length > 0) {
        const transactions = txResponse.result.map(tx => {
          const value = parseFloat(tx.value || '0') / Math.pow(10, 18);
          const gasUsed = parseInt(tx.gasUsed || '0');
          const gasPrice = parseInt(tx.gasPrice || '0');
          const gasFee = (gasUsed * gasPrice) / Math.pow(10, 18);
          
          return {
            hash: tx.hash,
            timeStamp: parseInt(tx.timeStamp) * 1000,
            from: tx.from?.toLowerCase() || '',
            to: tx.to?.toLowerCase() || '',
            value: value,
            gasFee: gasFee,
            gasUsed: gasUsed,
            methodId: tx.methodId || '0x',
            functionName: tx.functionName || (value > 0 ? 'Transfer' : 'Contract Call'),
            isError: tx.isError === '1',
            blockNumber: parseInt(tx.blockNumber || '0'),
            type: 'transaction'
          };
        });
        
        allActivity = transactions;
      }

      // Get ERC20 token transfers
      try {
        const tokenResponse = await makeApiCall(
          `${chainConfig.apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=${fromBlock}&endblock=latest&page=1&offset=50&sort=desc&apikey=${apiKey}`,
          `${chainConfig.name} Token Transfers`
        );
        
        if (tokenResponse.result && tokenResponse.result.length > 0) {
          const tokenTransfers = tokenResponse.result.map(tx => {
            const value = parseFloat(tx.value || '0') / Math.pow(10, parseInt(tx.tokenDecimal || '18'));
            const gasUsed = parseInt(tx.gasUsed || '0');
            const gasPrice = parseInt(tx.gasPrice || '0');
            const gasFee = (gasUsed * gasPrice) / Math.pow(10, 18);
            
            return {
              hash: tx.hash,
              timeStamp: parseInt(tx.timeStamp) * 1000,
              from: tx.from?.toLowerCase() || '',
              to: tx.to?.toLowerCase() || '',
              value: 0, // Token transfers don't count toward ETH value
              tokenValue: value,
              tokenSymbol: tx.tokenSymbol || 'TOKEN',
              gasFee: gasFee,
              gasUsed: gasUsed,
              functionName: `${tx.tokenSymbol || 'TOKEN'} Transfer`,
              isError: false,
              blockNumber: parseInt(tx.blockNumber || '0'),
              type: 'token_transfer',
              contractAddress: tx.contractAddress
            };
          });
          
          // Merge with existing activity
          allActivity = [...allActivity, ...tokenTransfers];
        }
      } catch (tokenError) {
        console.warn('⚠️ Token transfer fetch failed:', tokenError.message);
      }

      // Sort by timestamp (newest first)
      allActivity.sort((a, b) => b.timeStamp - a.timeStamp);
      
      // Calculate stats
      const totalValue = allActivity.reduce((sum, tx) => sum + (tx.value || 0), 0);
      const totalGasFees = allActivity.reduce((sum, tx) => sum + (tx.gasFee || 0), 0);
      const uniqueContracts = new Set(
        allActivity
          .filter(tx => tx.to !== userAddress.toLowerCase() && tx.to && tx.to !== '0x0000000000000000000000000000000000000000')
          .map(tx => tx.to)
      );
      const lastActivity = allActivity.length > 0 ? new Date(allActivity[0].timeStamp) : null;

      setActivityStats({
        totalTransactions: allActivity.length,
        totalValue: totalValue,
        totalGasFees: totalGasFees,
        dappsUsed: uniqueContracts.size,
        lastActivity: lastActivity
      });

      setChainActivity(allActivity);
      console.log(`✅ Processed ${allActivity.length} activities on ${chainConfig.name}`);
      
    } catch (error) {
      console.error('❌ Activity fetching failed:', error);
      // Don't show error for empty results or network issues
      if (error.message.includes('No transactions') || 
          error.message.includes('No records') ||
          error.message.includes('Rate limit')) {
        console.log('ℹ️ No activity found or rate limited - this is normal');
      } else {
        setError(`Failed to fetch ${selectedChain} activity: ${error.message}`);
      }
      setChainActivity([]);
      setActivityStats({
        totalTransactions: 0,
        totalValue: 0,
        totalGasFees: 0,
        dappsUsed: 0,
        lastActivity: null
      });
    } finally {
      setLoadingActivity(false);
    }
  }, [selectedChain]);

  // Auto-fetch data when conditions change
  useEffect(() => {
    if (address && isConnected) {
      if (currentPage === 'approvals') {
        fetchRealApprovals(address);
      } else if (currentPage === 'activity') {
        fetchChainActivity(address);
      }
    }
  }, [address, isConnected, selectedChain, currentPage, fetchRealApprovals, fetchChainActivity]);

  // Helper functions
  const checkCurrentAllowance = async (tokenContract, owner, spender, chainConfig, apiKey) => {
    try {
      const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
      const spenderPadded = spender.slice(2).toLowerCase().padStart(64, '0');
      const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;
      
      const response = await makeApiCall(
        `${chainConfig.apiUrl}?module=proxy&action=eth_call&to=${tokenContract}&data=${data}&tag=latest&apikey=${apiKey}`,
        'Allowance Check'
      );
      
      if (response.result && response.result !== '0x' && response.result !== '0x0') {
        const allowance = BigInt(response.result).toString();
        return { allowance };
      }
      
      return { allowance: '0' };
    } catch (error) {
      console.warn(`Allowance check failed:`, error.message);
      return { allowance: '0' };
    }
  };

  const getTokenInfo = async (tokenAddress, chainConfig, apiKey) => {
    try {
      const calls = [
        { method: '0x06fdde03', property: 'name' },    // name()
        { method: '0x95d89b41', property: 'symbol' },  // symbol()
        { method: '0x313ce567', property: 'decimals' } // decimals()
      ];
      
      const results = {};
      
      for (const call of calls) {
        try {
          const response = await makeApiCall(
            `${chainConfig.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=${call.method}&tag=latest&apikey=${apiKey}`,
            `Token ${call.property}`
          );
          
          if (response.result && response.result !== '0x') {
            if (call.property === 'decimals') {
              results[call.property] = parseInt(response.result, 16);
            } else {
              // Decode hex string
              const hex = response.result.slice(2);
              let decoded = '';
              for (let i = 0; i < hex.length; i += 2) {
                const charCode = parseInt(hex.slice(i, i + 2), 16);
                if (charCode > 0) {
                  decoded += String.fromCharCode(charCode);
                }
              }
              results[call.property] = decoded.trim() || `Unknown ${call.property}`;
            }
          }
        } catch (callError) {
          console.warn(`Failed to get ${call.property}:`, callError.message);
        }
      }
      
      return {
        name: results.name || 'Unknown Token',
        symbol: results.symbol || 'UNK',
        decimals: results.decimals || 18
      };
    } catch (error) {
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

  // Revoke approval function
  const handleRevokeApproval = async (approval) => {
    if (!provider || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔄 Revoking approval:', approval.name);
      
      const chainConfig = chains.find(c => c.value === selectedChain);
      const expectedChainId = `0x${chainConfig.chainId.toString(16)}`;
      
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== expectedChainId) {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        }
      } catch (switchError) {
        console.log('Chain switch error:', switchError);
      }

      const revokeData = `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'0'.repeat(64)}`;
      
      const txParams = {
        to: approval.contract,
        data: revokeData,
        from: address,
        value: '0x0'
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('✅ Revoke transaction submitted:', txHash);
      setApprovals(prev => prev.filter(a => a.id !== approval.id));

    } catch (error) {
      console.error('❌ Revoke failed:', error);
      setError(`Failed to revoke approval: ${error.message}`);
    }
  };

  // Revoke all approvals
  const handleRevokeAll = async () => {
    if (approvals.length === 0) {
      alert('No approvals to revoke!');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke ALL ${approvals.length} token approvals?`
    );

    if (!confirmed) return;

    for (const approval of approvals) {
      try {
        await handleRevokeApproval(approval);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to revoke ${approval.name}:`, error);
      }
    }
  };

  // Share function
  const handleShare = async () => {
    const currentChainName = chains.find(c => c.value === selectedChain)?.name || selectedChain;
    
    const shareText = currentPage === 'activity' 
      ? `📊 Just checked my complete ${currentChainName} activity with FarGuard! 

💰 ${activityStats.totalTransactions} transactions
🏗️ ${activityStats.dappsUsed} dApps used
⛽ ${activityStats.totalGasFees.toFixed(4)} ${chains.find(c => c.value === selectedChain)?.nativeCurrency} in gas fees

Track your journey: https://fgrevoke.vercel.app`
      : `🛡️ Just secured my ${currentChainName} wallet with FarGuard! 

✅ Reviewed ${approvals.length} token approvals
🔒 Protecting my assets from risky permissions

Secure yours too: https://fgrevoke.vercel.app`;

    try {
      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({ text: shareText });
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
    setChainActivity([]);
    setError(null);
    setProvider(null);
    setCurrentPage('approvals');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Header */}
        <header className="w-full max-w-4xl flex flex-col space-y-4 py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <img src="/farguard-logo.png" alt="FarGuard Logo" className="w-8 h-8" />
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
                  disabled={isConnecting || !sdkReady}
                  className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          {isConnected && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage('approvals')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentPage === 'approvals' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-700 text-purple-200 hover:bg-purple-600'
                }`}
              >
                🛡️ Approvals
              </button>
              <button
                onClick={() => setCurrentPage('activity')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentPage === 'activity' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-700 text-purple-200 hover:bg-purple-600'
                }`}
              >
                📊 {chains.find(c => c.value === selectedChain)?.name} Activity
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <img src="/farguard-logo.png" alt="FarGuard Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-purple-200 mb-2">Connect Your Farcaster Wallet</h2>
              <p className="text-xl text-purple-300 mb-4">
                View your REAL token approvals and complete blockchain activity
              </p>
              
              {!sdkReady ? (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-sm">🔄 Initializing Farcaster SDK...</p>
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                  <p className="text-green-300 text-sm">✅ SDK Ready!</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={connectWallet}
                disabled={isConnecting || !sdkReady}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {!sdkReady ? 'Initializing...' : isConnecting ? 'Connecting...' : '🔗 Connect Farcaster Wallet'}
              </button>
            </div>
          ) : (
            <div>
              {/* Page Headers */}
              {currentPage === 'approvals' ? (
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-200">
                      Token Approvals ({chains.find(c => c.value === selectedChain)?.name})
                    </h2>
                    <p className="text-sm text-purple-400 mt-1">
                      Real approval data from: {formatAddress(address)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
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
              ) : (
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-200">
                      {chains.find(c => c.value === selectedChain)?.name} Activity
                    </h2>
                    <p className="text-sm text-purple-400 mt-1">
                      Complete activity history: {formatAddress(address)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Activity
                    </button>
                    <button
                      onClick={() => fetchChainActivity(address)}
                      disabled={loadingActivity}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>
              )}

              {/* Stats */}
              {currentPage === 'approvals' ? (
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
                    <p className="text-2xl font-bold text-blue-400">{apiCallCount}</p>
                    <p className="text-sm text-purple-200">API Calls</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-white">{activityStats.totalTransactions}</p>
                    <p className="text-sm text-purple-200">Transactions</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{activityStats.dappsUsed}</p>
                    <p className="text-sm text-purple-200">dApps Used</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{activityStats.totalValue.toFixed(3)}</p>
                    <p className="text-sm text-purple-200">{chains.find(c => c.value === selectedChain)?.nativeCurrency} Transferred</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400">{activityStats.totalGasFees.toFixed(4)}</p>
                    <p className="text-sm text-purple-200">{chains.find(c => c.value === selectedChain)?.nativeCurrency} Gas Fees</p>
                  </div>
                </div>
              )}

              {/* Revoke All Button */}
              {currentPage === 'approvals' && approvals.length > 0 && (
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

              {/* Debug Info */}
              {isConnected && (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4 text-xs">
                  <details>
                    <summary className="text-blue-300 cursor-pointer">🔍 Debug Info</summary>
                    <div className="mt-2 space-y-1 text-blue-200">
                      <p><strong>Address:</strong> {address}</p>
                      <p><strong>Chain:</strong> {selectedChain}</p>
                      <p><strong>Provider:</strong> {provider ? '✅' : '❌'}</p>
                      <p><strong>Current Page:</strong> {currentPage}</p>
                      <p><strong>API Calls Made:</strong> {apiCallCount}</p>
                      {currentPage === 'approvals' ? (
                        <>
                          <p><strong>Loading Approvals:</strong> {loading ? 'Yes' : 'No'}</p>
                          <p><strong>Approvals Count:</strong> {approvals.length}</p>
                        </>
                      ) : (
                        <>
                          <p><strong>Loading Activity:</strong> {loadingActivity ? 'Yes' : 'No'}</p>
                          <p><strong>Activities Count:</strong> {chainActivity.length}</p>
                          <p><strong>dApps Used:</strong> {activityStats.dappsUsed}</p>
                        </>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Content */}
              {currentPage === 'approvals' ? (
                loading ? (
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
                    <p className="text-purple-400 text-sm mt-2">
                      No active token approvals found on {chains.find(c => c.value === selectedChain)?.name}
                    </p>
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
                              window.open(`${chainConfig.explorerUrl}/address/${approval.contract}`, '_blank');
                            }}
                            className="px-3 py-2 text-purple-300 hover:text-white transition-colors"
                            title="View Contract"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Activity Page Content
                loadingActivity ? (
                  <div className="space-y-4">
                    <p className="text-center text-purple-300">Loading your {chains.find(c => c.value === selectedChain)?.name} activity...</p>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-purple-700 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-purple-600 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-purple-600 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-purple-600 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : chainActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <p className="text-blue-300 text-lg font-semibold">No activity found</p>
                    <p className="text-purple-400 text-sm mt-2">
                      No transactions found for this address on {chains.find(c => c.value === selectedChain)?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityStats.lastActivity && (
                      <div className="bg-purple-700 rounded-lg p-4 mb-4">
                        <p className="text-purple-200 text-sm">
                          <strong>Last Activity:</strong> {activityStats.lastActivity.toLocaleDateString()} at {activityStats.lastActivity.toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {chainActivity.map((tx, index) => (
                      <div key={`${tx.hash}-${index}`} className="bg-purple-700 rounded-lg p-4 hover:bg-purple-600 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center flex-1">
                            <Activity className={`w-5 h-5 mr-3 flex-shrink-0 ${tx.isError ? 'text-red-400' : 'text-green-400'}`} />
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-sm">
                                {tx.functionName || 'Transaction'}
                              </h3>
                              <p className="text-xs text-purple-300 mt-1">
                                To: {formatAddress(tx.to)}
                              </p>
                              <p className="text-xs text-purple-400">
                                {new Date(tx.timeStamp).toLocaleDateString()} at {new Date(tx.timeStamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {tx.type === 'token_transfer' 
                                ? `${tx.tokenValue?.toFixed(4) || '0'} ${tx.tokenSymbol}` 
                                : tx.value > 0 
                                  ? `${tx.value.toFixed(4)} ${chains.find(c => c.value === selectedChain)?.nativeCurrency}` 
                                  : 'Contract Call'
                              }
                            </p>
                            <p className="text-xs text-purple-300">
                              Gas: {tx.gasFee?.toFixed(6) || '0'} {chains.find(c => c.value === selectedChain)?.nativeCurrency}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-purple-300 mb-3">
                          <span>Block: {tx.blockNumber}</span>
                          <span className={`px-2 py-1 rounded ${tx.isError ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                            {tx.isError ? 'Failed' : 'Success'}
                          </span>
                        </div>

                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              const chainConfig = chains.find(c => c.value === selectedChain);
                              window.open(`${chainConfig.explorerUrl}/tx/${tx.hash}`, '_blank');
                            }}
                            className="px-3 py-2 text-purple-300 hover:text-white transition-colors"
                            title={`View on ${chains.find(c => c.value === selectedChain)?.name} Explorer`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-8 p-4 text-center border-t border-purple-700">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-purple-300">
          {sdkReady && (
            <span className="flex items-center gap-1 text-green-400">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              Farcaster Miniapp ✅
            </span>
          )}
          {sdkReady && <span className="text-purple-400">•</span>}
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
