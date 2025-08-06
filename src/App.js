// Fixed App.js - FarGuard with PROPER Farcaster Miniapp SDK Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Activity, Search, User, TrendingUp, BarChart3, Calendar, Eye } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useReadContract } from 'wagmi';
import { rewardClaimerAddress, rewardClaimerABI } from './lib/rewardClaimerABI';


function App() {

  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('approvals'); // 'approvals', 'activity', or 'spy'
  const [activityPageNumber, setActivityPageNumber] = useState(1);
  const transactionsPerPage = 10;

  // Spy functionality states
  const [spyAddress, setSpyAddress] = useState('');
  const [spyData, setSpyData] = useState(null);
  const [loadingSpy, setLoadingSpy] = useState(false);
  const [spyError, setSpyError] = useState(null);

  // Farcaster integration states
  const [currentUser, setCurrentUser] = useState(null); // Real Farcaster user data
  const [address, setAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]); // All user's addresses
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setContext] = useState(null);
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

  // API Configuration - Using your Vercel environment variables
  const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || process.env.REACT_APP_ETHERSCAN_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r';
  const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY || 'e0dab6b6fd544048b38913529be65eeb';
  const BASESCAN_KEY = process.env.REACT_APP_BASESCAN_KEY || ETHERSCAN_API_KEY;
  const ARBISCAN_KEY = process.env.REACT_APP_ARBISCAN_KEY || ETHERSCAN_API_KEY;
  
  console.log('🔑 API Keys loaded:', {
    etherscan: ETHERSCAN_API_KEY ? `${ETHERSCAN_API_KEY.substring(0, 8)}...` : 'missing',
    alchemy: ALCHEMY_API_KEY ? `${ALCHEMY_API_KEY.substring(0, 8)}...` : 'missing',
    basescan: BASESCAN_KEY ? `${BASESCAN_KEY.substring(0, 8)}...` : 'missing',
    arbiscan: ARBISCAN_KEY ? `${ARBISCAN_KEY.substring(0, 8)}...` : 'missing'
  });

  // Rate limiting
  const [, setApiCallCount] = useState(0);

  // Chain configuration using Etherscan V2 API with chainid parameter
  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/api', // Standard Etherscan API
      etherscanV2Url: 'https://api.etherscan.io/v2/api?chainid=1',
      rpcUrls: [
        `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        'https://ethereum-rpc.publicnode.com'
      ],
      chainId: 1,
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: 'ETH'
    },
    { 
      name: 'Base', 
      value: 'base', 
      apiUrl: 'https://api.etherscan.io/v2/api?chainid=8453', // ✅ Correct Etherscan V2 format for Base
      etherscanV2Url: 'https://api.etherscan.io/v2/api?chainid=8453',
      rpcUrls: [
        `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        'https://base-mainnet.publicnode.com',
        'https://base.meowrpc.com'
      ],
      chainId: 8453,
      explorerUrl: 'https://basescan.org',
      nativeCurrency: 'ETH'
    },
    { 
      name: 'Arbitrum', 
      value: 'arbitrum', 
      apiUrl: 'https://api.etherscan.io/v2/api?chainid=42161', // ✅ Correct Etherscan V2 format for Arbitrum
      etherscanV2Url: 'https://api.etherscan.io/v2/api?chainid=42161',
      rpcUrls: [
        `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-rpc.publicnode.com'
      ],
      chainId: 42161,
      explorerUrl: 'https://arbiscan.io',
      nativeCurrency: 'ETH'
    }
  ];

  // Use Alchemy for all blockchain data - much more reliable than Etherscan APIs
  const getAlchemyConfig = (chain) => {
    const configs = {
      'ethereum': {
        baseUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        apiKey: ALCHEMY_API_KEY,
        chainId: 1
      },
      'base': {
        baseUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        apiKey: ALCHEMY_API_KEY,
        chainId: 8453
      },
      'arbitrum': {
        baseUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        apiKey: ALCHEMY_API_KEY,
        chainId: 42161
      }
    };
    return configs[chain] || configs['ethereum'];
  };

  // Fallback to Etherscan V2 API when Alchemy fails
  const makeEtherscanV2Call = async (url, description = 'Etherscan V2 Call') => {
    try {
      setApiCallCount(prev => prev + 1);
      console.log(`🌐 ${description}:`, url.split('&apikey=')[0] + '&apikey=***');
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📡 ${description} Response:`, { 
        status: data.status, 
        message: data.message,
        resultCount: data.result?.length || (data.result ? 1 : 0)
      });
      
      return data;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error);
      throw error;
    }
  };

  // Get approvals using Etherscan V2 API (fallback)
  const fetchApprovalsWithEtherscanV2 = async (userAddress) => {
    try {
      console.log('🔍 Fallback: Fetching approvals using Etherscan V2 for:', userAddress);
      
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
      
      // Use Etherscan V2 API with correct format
      const url = `${chainConfig.apiUrl}&module=logs&action=getLogs&fromBlock=0&toBlock=latest&topic0=${approvalTopic}&topic1=0x${paddedAddress}&apikey=${ETHERSCAN_API_KEY}`;
      
      console.log('📋 Using Etherscan V2 API format:');
      console.log(`- Chain: ${selectedChain} (chainid=${chainConfig.chainId})`);
      console.log(`- URL: ${chainConfig.apiUrl}&module=logs&action=getLogs...`);
      
      const data = await makeEtherscanV2Call(url, 'Etherscan V2 Approval Logs');
      
      if (data.status === '1' && Array.isArray(data.result)) {
        console.log(`✅ Etherscan V2 returned ${data.result.length} approval logs`);
        
        if (data.result.length > 0) {
          await processApprovalsFromEtherscan(data.result, userAddress);
        } else {
          console.log('ℹ️ No approval events found');
          setApprovals([]);
        }
      } else if (data.status === '0' && data.message === 'No records found') {
        console.log('ℹ️ No approval events found for this address');
        setApprovals([]);
      } else {
        throw new Error(data.message || 'Unknown Etherscan V2 error');
      }
    } catch (error) {
      console.error('❌ Etherscan V2 approval fetch failed:', error);
      throw error;
    }
  };

  // Process approvals from Etherscan format
  const processApprovalsFromEtherscan = async (logs, userAddress) => {
    console.log('🔄 Processing approvals from Etherscan V2...', { logsCount: logs.length });
    const approvalMap = new Map();
    
    // Process recent logs first
    const recentLogs = logs.slice(-50).reverse();
    let processedCount = 0;
    
    for (const log of recentLogs) {
      try {
        if (processedCount >= 20) break; // Limit processing
        
        const tokenContract = log.address?.toLowerCase();
        const spenderAddress = log.topics && log.topics[2] ? 
          '0x' + log.topics[2].slice(26).toLowerCase() : null;
        
        if (!tokenContract || !spenderAddress || spenderAddress === '0x0000000000000000000000000000000000000000') {
          continue;
        }
        
        const key = `${tokenContract}-${spenderAddress}`;
        if (approvalMap.has(key)) continue;
        
        console.log(`🔍 Checking approval: ${tokenContract.slice(0,8)}... -> ${spenderAddress.slice(0,8)}...`);
        
        // Check current allowance using Alchemy (still use Alchemy for contract calls)
        const allowance = await checkAllowanceWithAlchemy(tokenContract, userAddress, spenderAddress);
        
        if (allowance && allowance !== '0') {
          console.log(`✅ Active allowance found: ${allowance}`);
          
          // Get token info using Alchemy
          const tokenInfo = await getTokenInfoWithAlchemy(tokenContract);
          
          const approval = {
            id: key,
            name: tokenInfo.name || 'Unknown Token',
            symbol: tokenInfo.symbol || 'UNK',
            contract: tokenContract,
            spender: spenderAddress,
            spenderName: getSpenderName(spenderAddress),
            amount: formatAllowance(allowance, tokenInfo.decimals),
            riskLevel: assessRiskLevel(spenderAddress),
            txHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16) || log.blockNumber,
            isActive: true
          };
          
          approvalMap.set(key, approval);
          processedCount++;
          
          console.log(`📝 Added approval: ${approval.name} (${approval.symbol}) -> ${approval.spenderName}`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn('⚠️ Error processing approval:', error.message);
      }
    }
    
    const finalApprovals = Array.from(approvalMap.values());
    setApprovals(finalApprovals);
    console.log(`✅ Processed ${finalApprovals.length} active approvals using Etherscan V2`);
  };





  // Alchemy API call helper - more reliable than Etherscan
  const makeAlchemyCall = async (method, params, description = 'Alchemy Call') => {
    try {
      setApiCallCount(prev => prev + 1);
      const alchemyConfig = getAlchemyConfig(selectedChain);
      
      const requestBody = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params
      };
      
      console.log(`🌐 ${description}:`, method, params);
      
      const response = await fetch(alchemyConfig.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📡 ${description} Response:`, { 
        method: method,
        resultType: typeof data.result,
        hasResult: !!data.result,
        error: data.error
      });
      
      if (data.error) {
        throw new Error(`Alchemy error: ${data.error.message}`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error);
      throw error;
    }
  };

  // Get approval logs using Alchemy
  const fetchApprovalsWithAlchemy = async (userAddress) => {
    try {
      console.log('🔍 Fetching approvals using Alchemy for:', userAddress);
      
      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const paddedAddress = '0x' + userAddress.slice(2).toLowerCase().padStart(64, '0');
      
      // Get latest block
      const latestBlock = await makeAlchemyCall('eth_blockNumber', [], 'Latest Block');
      const latestBlockNum = parseInt(latestBlock, 16);
      const fromBlock = Math.max(0, latestBlockNum - 50000); // Last 50k blocks
      
      console.log(`📊 Using Alchemy block range: ${fromBlock} to ${latestBlockNum}`);
      
      // Get approval logs using simplified topic filter to avoid 400 error
      const logs = await makeAlchemyCall('eth_getLogs', [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: 'latest',
        topics: [approvalTopic] // Only use the main approval topic, filter by user address later
      }], 'Approval Logs');
      
      console.log(`✅ Alchemy returned ${logs.length} approval logs`);
      
      if (logs.length > 0) {
        await processApprovalsFromAlchemy(logs, userAddress);
      } else {
        console.log('ℹ️ No approval events found');
        setApprovals([]);
      }
    } catch (error) {
      console.error('❌ Alchemy approval fetch failed:', error);
      throw error;
    }
  };

  // Process approval logs from Alchemy
  const processApprovalsFromAlchemy = async (logs, userAddress) => {
    console.log('🔄 Processing approvals from Alchemy...', { logsCount: logs.length });
    const approvalMap = new Map();
    
    // Process recent logs first
    const recentLogs = logs.slice(-50).reverse();
    let processedCount = 0;
    
    for (const log of recentLogs) {
      try {
        if (processedCount >= 20) break; // Limit processing
        
        // Extract data from approval log
        const tokenContract = log.address?.toLowerCase();
        const ownerAddress = log.topics && log.topics[1] ? 
          '0x' + log.topics[1].slice(26).toLowerCase() : null;
        const spenderAddress = log.topics && log.topics[2] ? 
          '0x' + log.topics[2].slice(26).toLowerCase() : null;
        
        // Filter by user address since we couldn't do it in the API call
        if (ownerAddress !== userAddress.toLowerCase()) {
          continue;
        }
        
        if (!tokenContract || !spenderAddress || spenderAddress === '0x0000000000000000000000000000000000000000') {
          continue;
        }
        
        const key = `${tokenContract}-${spenderAddress}`;
        if (approvalMap.has(key)) continue;
        
        console.log(`🔍 Checking approval: ${tokenContract.slice(0,8)}... -> ${spenderAddress.slice(0,8)}...`);
        
        // Check current allowance using Alchemy
        const allowance = await checkAllowanceWithAlchemy(tokenContract, userAddress, spenderAddress);
        
        if (allowance && allowance !== '0') {
          console.log(`✅ Active allowance found: ${allowance}`);
          
          // Get token info using Alchemy
          const tokenInfo = await getTokenInfoWithAlchemy(tokenContract);
          
          const approval = {
            id: key,
            name: tokenInfo.name || 'Unknown Token',
            symbol: tokenInfo.symbol || 'UNK',
            contract: tokenContract,
            spender: spenderAddress,
            spenderName: getSpenderName(spenderAddress),
            amount: formatAllowance(allowance, tokenInfo.decimals),
            riskLevel: assessRiskLevel(spenderAddress),
            txHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16),
            isActive: true
          };
          
          approvalMap.set(key, approval);
          processedCount++;
          
          console.log(`📝 Added approval: ${approval.name} (${approval.symbol}) -> ${approval.spenderName}`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn('⚠️ Error processing approval:', error.message);
      }
    }
    
    const finalApprovals = Array.from(approvalMap.values());
    setApprovals(finalApprovals);
    console.log(`✅ Processed ${finalApprovals.length} active approvals using Alchemy`);
  };

  // Check allowance using Alchemy
  const checkAllowanceWithAlchemy = async (tokenContract, owner, spender) => {
    try {
      const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
      const spenderPadded = spender.slice(2).toLowerCase().padStart(64, '0');
      const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;
      
      const result = await makeAlchemyCall('eth_call', [{
        to: tokenContract,
        data: data
      }, 'latest'], 'Allowance Check');
      
      if (result && result !== '0x' && result !== '0x0') {
        return BigInt(result).toString();
      }
      
      return '0';
    } catch (error) {
      console.warn(`Allowance check failed:`, error.message);
      return '0';
    }
  };

  // Get token info using Alchemy
  const getTokenInfoWithAlchemy = async (tokenAddress) => {
    try {
      const calls = [
        { method: '0x06fdde03', property: 'name' },
        { method: '0x95d89b41', property: 'symbol' },
        { method: '0x313ce567', property: 'decimals' }
      ];
      
      const results = {};
      
      for (const call of calls) {
        try {
          const result = await makeAlchemyCall('eth_call', [{
            to: tokenAddress,
            data: call.method
          }, 'latest'], `Token ${call.property}`);
          
          if (result && result !== '0x') {
            if (call.property === 'decimals') {
              results[call.property] = parseInt(result, 16);
            } else {
              // Decode hex string
              const hex = result.slice(2);
              let decoded = '';
              for (let i = 0; i < hex.length; i += 2) {
                const charCode = parseInt(hex.slice(i, i + 2), 16);
                if (charCode > 0) {
                  decoded += String.fromCharCode(charCode);
                }
              }
              results[call.property] = decoded.trim() || `Token${call.property.toUpperCase()}`;
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

  // PROPER SDK Initialization with Real Farcaster User Detection
  useEffect(() => {
    const initializeSDK = async () => {
      console.log('🚀 Initializing Farcaster SDK...');
      
      try {
        // Check if we're in a miniapp context (Farcaster or Base App)
        const isInMiniApp = await sdk.isInMiniApp();
        console.log('📱 Is in MiniApp:', isInMiniApp);
        
        if (isInMiniApp) {
          console.log('✅ Running in miniapp environment (Farcaster/Base App)');
          
          // Get context data with real user information
          const contextData = await sdk.context;
          console.log('📊 Full Context data:', contextData);
          setContext(contextData);

          // Extract Real Farcaster User Data
          if (contextData?.user) {
            console.log('👤 Real Farcaster user found:', contextData.user);
            
            const realUserData = {
              fid: contextData.user.fid,                    // Real FID (e.g., 242597)
              username: contextData.user.username,          // Real username (e.g., "ferno")  
              displayName: contextData.user.displayName,    // Real display name
              pfpUrl: contextData.user.pfpUrl,             // Profile picture URL
              bio: contextData.user.bio,                   // User bio
              followerCount: contextData.user.followerCount,
              followingCount: contextData.user.followingCount
            };
            
            console.log('🎯 Extracted real user data:', realUserData);
            setCurrentUser(realUserData);
            
            // Get user's verified addresses from Farcaster
            if (contextData.user.verifiedAddresses && contextData.user.verifiedAddresses.length > 0) {
              console.log('🔑 Found verified addresses:', contextData.user.verifiedAddresses);
              setUserAddresses(contextData.user.verifiedAddresses);
              
              // Set the first verified address as primary
              const primaryAddress = contextData.user.verifiedAddresses[0];
              setAddress(primaryAddress.toLowerCase());
              setIsConnected(true);
              console.log('✅ Auto-connected with verified address:', primaryAddress);
            } else {
              console.log('⚠️ No verified addresses found for user, will need wallet connection');
            }
          } else {
            console.log('⚠️ No user data in context');
          }

          // CRITICAL: Call ready() to hide splash screen in miniapp
          console.log('📞 Calling sdk.actions.ready()...');
          await sdk.actions.ready();
          console.log('✅ SDK ready called successfully!');
        } else {
          console.log('🌐 Running in web browser (not miniapp)');
          // For web browser usage, just set SDK as ready without miniapp features
        }
        
        setSdkReady(true);
        
      } catch (error) {
        console.error('❌ SDK initialization failed:', error);
        // Don't show error for web usage, just log it
        console.log('🌐 Continuing with web-only mode');
        setSdkReady(true);
      }
    };

    initializeSDK();
  }, []);

  // Enhanced Wallet Connection - handles both verified addresses and manual connections
  const connectWallet = async () => {
    console.log('🔌 Starting wallet connection...');
    setIsConnecting(true);
    setError(null);

    try {
      if (!sdkReady) {
        throw new Error('SDK not ready. Please wait for initialization.');
      }

      // If user already has verified addresses, use those first
      if (userAddresses.length > 0) {
        console.log('🔑 Using verified Farcaster addresses:', userAddresses);
        const primaryAddress = userAddresses[0].toLowerCase();
        setAddress(primaryAddress);
        setIsConnected(true);
        console.log('✅ Connected with verified address:', primaryAddress);
        return;
      }

      // Try to get wallet provider (miniapp SDK first, then fallback to web3)
      console.log('🌐 Getting Ethereum provider...');
      let ethProvider = null;
      
      try {
        // Try miniapp SDK first (for Farcaster/Base App)
        ethProvider = await sdk.wallet.getEthereumProvider();
        console.log('✅ Got provider from miniapp SDK');
      } catch (sdkError) {
        console.log('⚠️ Miniapp provider failed, trying web3 fallback...');
        
        // Fallback to window.ethereum for web browsers
        if (typeof window !== 'undefined' && window.ethereum) {
          ethProvider = window.ethereum;
          console.log('✅ Got provider from window.ethereum');
        } else {
          throw new Error('No wallet available. Please install MetaMask or use this app in Farcaster/Base App.');
        }
      }
      
      if (!ethProvider) {
        throw new Error('No wallet provider available. Please ensure you have verified addresses in your Farcaster profile or connect a wallet.');
      }

      console.log('✅ Provider obtained, requesting accounts...');
      setProvider(ethProvider);

      // Request account access
      const accounts = await ethProvider.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const walletAddress = accounts[0].toLowerCase();
      console.log('👛 Manual wallet connected:', walletAddress);

      // Get current chain
      const chainId = await ethProvider.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);

      // Map chainId to our supported chains
      const chainIdNum = parseInt(chainId, 16);
      let detectedChain = 'ethereum'; // default
      if (chainIdNum === 8453) detectedChain = 'base';
      if (chainIdNum === 42161) detectedChain = 'arbitrum';
      
      console.log(`🔗 Detected chain: ${detectedChain} (${chainIdNum})`);
      setSelectedChain(detectedChain);

      setAddress(walletAddress);
      setIsConnected(true);

      console.log('🎉 Manual wallet connection successful! Ready to fetch real data...');

    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };



  // Listen for account changes
  useEffect(() => {
    if (provider) {
      const handleAccountsChanged = (accounts) => {
        console.log('👥 Accounts changed:', accounts);
        if (accounts.length === 0) {
          disconnect();
        } else if (accounts[0] !== address) {
          setAddress(accounts[0]);
        }
      };

      const handleChainChanged = (chainId) => {
        console.log('🔗 Chain changed:', chainId);
        // Optionally update selectedChain based on chainId
      };

      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);

      return () => {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider, address]);

  // Fetch approvals with Alchemy first, then Etherscan V2 fallback
  const fetchRealApprovals = useCallback(async (userAddress) => {
    setLoading(true);
    setError(null);
    console.log('🔍 Fetching approvals for:', userAddress, 'on chain:', selectedChain);
    
    try {
      // Try Alchemy first (preferred method)
      try {
        const alchemyConfig = getAlchemyConfig(selectedChain);
        console.log(`🌟 Trying Alchemy for ${selectedChain}:`, {
          baseUrl: alchemyConfig.baseUrl.split('/')[2], // Just show domain
          keyLength: alchemyConfig.apiKey ? alchemyConfig.apiKey.length : 0,
          keyPreview: alchemyConfig.apiKey ? `${alchemyConfig.apiKey.substring(0, 8)}...` : 'missing'
        });

        await fetchApprovalsWithAlchemy(userAddress);
        console.log('✅ Successfully fetched approvals using Alchemy');
        
      } catch (alchemyError) {
        console.warn('⚠️ Alchemy failed, trying Etherscan V2 fallback:', alchemyError.message);
        
        // Fallback to Etherscan V2 API
        const chainConfig = chains.find(chain => chain.value === selectedChain);
        console.log(`🔄 Fallback to Etherscan V2 for ${selectedChain}:`, {
          apiUrl: chainConfig.apiUrl,
          chainId: chainConfig.chainId,
          etherscanKey: ETHERSCAN_API_KEY ? `${ETHERSCAN_API_KEY.substring(0, 8)}...` : 'missing'
        });
        
        await fetchApprovalsWithEtherscanV2(userAddress);
        console.log('✅ Successfully fetched approvals using Etherscan V2 fallback');
      }
      
    } catch (error) {
      console.error('❌ Both Alchemy and Etherscan V2 failed:', error);
      setError(`Failed to fetch approvals: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedChain]);



  // Fetch chain activity using Alchemy - much more reliable
  const fetchChainActivity = useCallback(async (userAddress) => {
    if (!userAddress) return;
    
    setLoadingActivity(true);
    setError(null);
    console.log('🔍 Fetching COMPLETE activity for:', userAddress, 'across all chains');
    
    try {
      const result = await fetchCompleteActivityWithEtherscanV2(userAddress);
      
      if (result.activities && result.activities.length > 0) {
        setChainActivity(result.activities);
        
        if (result.stats) {
          setActivityStats({
            totalTransactions: result.stats.totalTxns,
            totalValue: result.stats.totalEthSent,
            totalGasFees: result.stats.totalGasETH,
            dappsUsed: result.stats.dAppsUsed,
            lastActivity: result.activities[0]?.timeStamp || null,
            chainStats: result.stats.chainStats
          });
        }
        
        console.log(`✅ Processed ${result.activities.length} activities with complete analytics`);
      } else {
        console.log('⚠️ No activities found');
        setChainActivity([]);
        setActivityStats({
          totalTransactions: 0,
          totalValue: 0,
          totalGasFees: 0,
          dappsUsed: 0,
          lastActivity: null
        });
      }
      
    } catch (error) {
      console.error('❌ Complete activity fetching failed:', error);
      setError(`Failed to fetch complete activity: ${error.message}`);
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

  // Fetch COMPLETE activity using Etherscan V2 APIs across all chains
  const fetchCompleteActivityWithEtherscanV2 = async (userAddress) => {
    try {
      console.log('🔍 Fetching COMPLETE activity for:', userAddress, 'on chain:', selectedChain);
      
      const chains = [
        { name: 'ethereum', url: 'https://api.etherscan.io/v2/api', chainId: 1 },
        { name: 'base', url: 'https://api.etherscan.io/v2/api', chainId: 8453 },
        { name: 'arbitrum', url: 'https://api.etherscan.io/v2/api', chainId: 42161 }
      ];
      
      let allActivity = [];
      let totalStats = {
        totalTxns: 0,
        totalGasETH: 0,
        totalEthSent: 0,
        uniqueContracts: new Set(),
        chainStats: {}
      };
      
      // Fetch from all chains or just selected chain
      const chainsToFetch = selectedChain === 'all' ? chains : chains.filter(c => c.name === selectedChain);
      
      for (const chain of chainsToFetch) {
        try {
          console.log(`🔍 Fetching complete history for ${chain.name}...`);
          
          // Build the complete transaction history URL
          const txListUrl = `${chain.url}?chainid=${chain.chainId}&module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
          
          console.log(`🌐 ${chain.name.toUpperCase()} Complete TX History:`, txListUrl.replace(ETHERSCAN_API_KEY, '***'));
          
          const response = await fetch(txListUrl);
          const data = await response.json();
          
          if (data.status === '1' && Array.isArray(data.result)) {
            const txList = data.result;
            console.log(`✅ Found ${txList.length} transactions on ${chain.name}`);
            
            let chainGasETH = 0;
            let chainEthSent = 0;
            let chainTxns = txList.length;
            
            // Process each transaction for analytics
            for (const tx of txList) {
              try {
                // Calculate gas fees (gasUsed * gasPrice)
                const gasUsed = Number(tx.gasUsed || 0);
                const gasPrice = Number(tx.gasPrice || 0);
                const gasFeeWei = gasUsed * gasPrice;
                const gasFeeETH = gasFeeWei / 1e18;
                
                chainGasETH += gasFeeETH;
                
                // Calculate ETH sent (only for outgoing transactions)
                if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                  const valueETH = Number(tx.value || 0) / 1e18;
                  chainEthSent += valueETH;
                  
                  // Track unique contracts interacted with
                  if (tx.to && tx.to !== userAddress.toLowerCase() && tx.input && tx.input !== '0x') {
                    totalStats.uniqueContracts.add(tx.to.toLowerCase());
                  }
                }
                
                // Add to activity list (limit display to last 50 for UI performance)
                if (allActivity.length < 50) {
                  const activity = {
                    hash: tx.hash,
                    timeStamp: parseInt(tx.timeStamp) * 1000,
                    from: tx.from?.toLowerCase() || '',
                    to: tx.to?.toLowerCase() || '',
                    value: Number(tx.value || 0) / 1e18,
                    gasFee: gasFeeETH,
                    gasUsed: gasUsed,
                    methodId: tx.methodId || (tx.input?.substring(0, 10)) || '0x',
                    functionName: tx.functionName || (tx.input && tx.input !== '0x' ? 'Contract Interaction' : 'ETH Transfer'),
                    isError: tx.isError === '1',
                    blockNumber: parseInt(tx.blockNumber || 0),
                    chain: chain.name,
                    chainId: chain.chainId
                  };
                  
                  allActivity.push(activity);
                }
                
              } catch (txError) {
                console.warn(`⚠️ Failed to process transaction ${tx.hash}:`, txError.message);
              }
            }
            
            // Store chain-specific stats
            totalStats.chainStats[chain.name] = {
              totalTxns: chainTxns,
              totalGasETH: chainGasETH,
              totalEthSent: chainEthSent
            };
            
            totalStats.totalTxns += chainTxns;
            totalStats.totalGasETH += chainGasETH;
            totalStats.totalEthSent += chainEthSent;
            
            console.log(`✅ ${chain.name.toUpperCase()} Stats:`, {
              transactions: chainTxns,
              gasSpent: `${chainGasETH.toFixed(6)} ETH`,
              ethSent: `${chainEthSent.toFixed(6)} ETH`
            });
            
          } else {
            console.warn(`⚠️ ${chain.name} API returned:`, data.message || 'No data');
          }
          
          // Small delay between chain requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (chainError) {
          console.error(`❌ Failed to fetch ${chain.name} activity:`, chainError.message);
        }
      }
      
      // Final comprehensive stats
      const dAppsUsed = totalStats.uniqueContracts.size;
      
      console.log('🎯 COMPLETE WALLET ANALYTICS:', {
        totalTransactions: totalStats.totalTxns,
        totalGasSpent: `${totalStats.totalGasETH.toFixed(6)} ETH`,
        totalEthSent: `${totalStats.totalEthSent.toFixed(6)} ETH`,
        dAppsInteracted: dAppsUsed,
        chainBreakdown: totalStats.chainStats
      });
      
      return {
        activities: allActivity.sort((a, b) => b.timeStamp - a.timeStamp), // Sort by newest first
        stats: {
          totalTxns: totalStats.totalTxns,
          totalGasETH: totalStats.totalGasETH,
          totalEthSent: totalStats.totalEthSent,
          dAppsUsed: dAppsUsed,
          chainStats: totalStats.chainStats
        }
      };
      
    } catch (error) {
      console.error('❌ Complete activity fetch failed:', error);
      return { activities: [], stats: null };
    }
  };

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

  // Helper functions for token data (using Alchemy)
  const checkCurrentAllowance = async (tokenContract, owner, spender) => {
    try {
      // Use the existing checkAllowanceWithAlchemy function
      const allowance = await checkAllowanceWithAlchemy(tokenContract, owner, spender);
      return { allowance: allowance || '0' };
    } catch (error) {
      console.warn(`Allowance check failed:`, error.message);
      return { allowance: '0' };
    }
  };

  const getTokenInfo = async (tokenAddress) => {
    try {
      // Use the existing getTokenInfoWithAlchemy function
      const tokenInfo = await getTokenInfoWithAlchemy(tokenAddress);
      return {
        name: tokenInfo.name || 'Unknown Token',
        symbol: tokenInfo.symbol || 'UNK',
        decimals: tokenInfo.decimals || 18
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

  // Track revoke and claim status with localStorage
  const hasRevoked = localStorage.getItem('hasRevoked') === 'true';
  const hasClaimedLocally = localStorage.getItem('hasClaimed') === 'true';
  const showClaim = localStorage.getItem('hasRevoked') === 'true' && localStorage.getItem('hasClaimed') !== 'true';
  const [showShare, setShowShare] = useState(false);

  // Initialize showShare state based on localStorage
  useEffect(() => {
    if (hasClaimedLocally) {
      setShowShare(true);
    }
  }, [hasClaimedLocally]);

  // Reset activity page number when switching chains or pages
  useEffect(() => {
    setActivityPageNumber(1);
  }, [selectedChain, currentPage]);

  // Real revoke function - requires wallet popup and successful transaction
  const requestRevokeApproval = async (approval) => {
    console.log("🔄 Individual revoke requested for:", approval.name);
    console.log("🔌 Provider state:", { hasProvider: !!provider, isConnected, address });
    
    if (!provider || !isConnected) {
      console.log('❌ Wallet not connected properly');
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔄 Starting individual revoke for:', approval.name);
      
      // Clear any previous errors
      setError(null);
      
      // Ensure we're on the right chain
      const chainConfig = chains.find(c => c.value === selectedChain);
      const expectedChainId = `0x${chainConfig.chainId.toString(16)}`;
      
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== expectedChainId) {
          console.log('🔄 Switching to correct chain...');
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        }
      } catch (switchError) {
        console.log('Chain switch error (might be expected):', switchError);
      }

      // ERC20 approve(spender, 0) call data - This ACTUALLY revokes the approval on-chain
      const revokeData = `0x095ea7b3${approval.spender.slice(2).padStart(64, '0')}${'0'.repeat(64)}`;
      
      const txParams = {
        to: approval.contract,
        data: revokeData,
        from: address,
        value: '0x0'
      };

      console.log('📝 Transaction params:', txParams);
      console.log('📝 Submitting REAL revoke transaction - this will actually remove approval from wallet...');
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('✅ Revoke transaction submitted successfully:', txHash);
      console.log('🔗 Token approval ACTUALLY revoked on blockchain - spender can no longer access tokens');
      
      // Mark as revoked and update UI after successful blockchain transaction
      localStorage.setItem('hasRevoked', 'true');
      setApprovals(prev => prev.filter(a => a.id !== approval.id));
      
      console.log('✅ Blockchain revoke complete + UI updated:', approval.name);

    } catch (error) {
      console.error('❌ Revoke failed:', error);
      console.error('❌ Error details:', error);
      
      // Don't remove the approval from UI if transaction failed
      if (error.code === 4001) {
        setError('Transaction cancelled by user');
      } else {
        setError(`Failed to revoke approval: ${error.message}`);
      }
    }
  };







  // Reward Claimer Contract Interactions using same provider as revoke
  const { data: totalClaims } = useReadContract({
    abi: rewardClaimerABI,
    address: rewardClaimerAddress,
    functionName: 'totalClaims',
  });

  const handleClaim = async () => {
    try {
      setError(null);
      console.log('🎁 Starting claim process using existing Farcaster/Coinbase wallet...');
      
      if (!provider || !isConnected) {
        console.log('❌ Wallet not connected properly');
        setError('Please connect your wallet first');
        return;
      }

      // Ensure we're on Base chain for the claim
      const baseChainId = '0x2105'; // Base chain ID in hex
      
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== baseChainId) {
          console.log('🔄 Switching to Base chain for claim...');
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: baseChainId }],
          });
        }
      } catch (switchError) {
        console.log('Chain switch error:', switchError);
      }

      // Encode claimReward() function call
      const claimFunctionSignature = '0xb88a802f'; // claimReward()
      
      const txParams = {
        to: rewardClaimerAddress,
        data: claimFunctionSignature,
        from: address,
        value: '0x0'
      };

      console.log('📝 Claim transaction params:', txParams);
      console.log('📝 Calling claimReward() on Base contract - wallet popup should appear...');
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('✅ Claim transaction submitted successfully:', txHash);
      console.log('💰 User successfully claimed 0.5 USDC from Base contract');
      
      // Mark as claimed in localStorage and show share button
      localStorage.setItem('hasClaimed', 'true');
      setShowShare(true);
      
      console.log('🔒 Claim button will now be hidden (hasClaimed = true)');
    } catch (error) {
      console.error('❌ Claim failed:', error);
      
      if (error.code === 4001) {
        setError('Transaction cancelled by user');
      } else {
        setError(`Claim failed: ${error.message}`);
      }
    }
  };

  const shareCast = () => {
    const text = encodeURIComponent("Claimed 0.5 USDC for just securing my wallet - try it here: https://fgrevoke.vercel.app");
    window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank');
  };

  // Share to Farcaster using proper SDK method
  const handleShare = async () => {
    const currentChainName = chains.find(c => c.value === selectedChain)?.name || selectedChain;
    
    const shareText = currentPage === 'activity'
      ? `🔍 Just analyzed my ${currentChainName} wallet activity with FarGuard!

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
        console.log('📝 Composing cast via SDK...');
        await sdk.actions.composeCast({ text: shareText });
        console.log('✅ Shared to Farcaster');
        return;
      }
      
      // Fallback to clipboard
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
    setActivityStats({
      totalTransactions: 0,
      totalValue: 0,
      totalGasFees: 0,
      dappsUsed: 0,
      lastActivity: null
    });
    
    // Note: We keep currentUser and userAddresses as they come from Farcaster profile
    // and should persist across wallet connections/disconnections
    console.log('🔌 Disconnected wallet but kept Farcaster user profile data');
  };

  // Spy functionality - comprehensive wallet analysis
  const searchSpyAddress = async () => {
    if (!spyAddress || spyAddress.length !== 42) {
      setSpyError('Please enter a valid Ethereum address (42 characters starting with 0x)');
      return;
    }

    setLoadingSpy(true);
    setSpyError(null);
    setSpyData(null);

    try {
      console.log('🕵️ Starting comprehensive spy analysis for:', spyAddress);
      
      const spyResults = {
        address: spyAddress,
        farcasterProfile: null,
        socialProfiles: {},
        tokenHoldings: [],
        profitLoss: {
          monthly: {},
          total: 0,
          heatmapData: []
        },
        walletActivity: [],
        stats: {
          totalTransactions: 0,
          totalValue: 0,
          dappsUsed: 0,
          firstTransaction: null,
          lastTransaction: null
        }
      };

      // Parallel data fetching for better performance
      await Promise.allSettled([
        fetchFarcasterProfile(spyAddress, spyResults),
        fetchSocialProfiles(spyAddress, spyResults),
        fetchTokenHoldings(spyAddress, spyResults),
        fetchProfitLossData(spyAddress, spyResults),
        fetchWalletActivity(spyAddress, spyResults)
      ]);

      setSpyData(spyResults);
      console.log('✅ Spy analysis complete:', spyResults);

    } catch (error) {
      console.error('❌ Spy analysis failed:', error);
      setSpyError('Failed to analyze address. Please try again.');
    } finally {
      setLoadingSpy(false);
    }
  };

  // Fetch Farcaster profile using Neynar API or SDK
  const fetchFarcasterProfile = async (address, results) => {
    try {
      console.log('🔍 Searching Farcaster profile for:', address);
      
      // Try using Neynar API (free tier)
      const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
        headers: {
          'Api-Key': 'NEYNAR_API_DOCS' // Public demo key - replace with your own for production
        }
      });

      if (neynarResponse.ok) {
        const data = await neynarResponse.json();
        if (data && Object.keys(data).length > 0) {
          const userProfile = Object.values(data)[0];
          if (userProfile && userProfile.length > 0) {
            const profile = userProfile[0];
            results.farcasterProfile = {
              fid: profile.fid,
              username: profile.username,
              displayName: profile.display_name,
              bio: profile.profile?.bio?.text || '',
              followerCount: profile.follower_count,
              followingCount: profile.following_count,
              pfpUrl: profile.pfp_url,
              verifiedAddresses: profile.verified_addresses?.eth_addresses || []
            };
            console.log('✅ Found Farcaster profile:', results.farcasterProfile);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Farcaster profile lookup failed:', error.message);
    }
  };

  // Fetch social profiles (ENS, Lens, etc.)
  const fetchSocialProfiles = async (address, results) => {
    try {
      // ENS Resolution
      try {
        const ensResponse = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
        if (ensResponse.ok) {
          const ensData = await ensResponse.json();
          if (ensData.name) {
            results.socialProfiles.ens = {
              name: ensData.name,
              avatar: ensData.avatar,
              description: ensData.description
            };
          }
        }
      } catch (ensError) {
        console.warn('⚠️ ENS lookup failed:', ensError.message);
      }

      // Lens Protocol (using public API)
      try {
        const lensResponse = await fetch('https://api.lens.dev/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query Profiles($request: ProfilesRequest!) {
                profiles(request: $request) {
                  items {
                    id
                    handle
                    name
                    bio
                    stats {
                      totalFollowers
                      totalFollowing
                    }
                    picture {
                      ... on NftImage {
                        uri
                      }
                      ... on MediaSet {
                        original {
                          url
                        }
                      }
                    }
                    ownedBy
                  }
                }
              }
            `,
            variables: {
              request: {
                ownedBy: [address],
                limit: 10
              }
            }
          })
        });

        if (lensResponse.ok) {
          const lensData = await lensResponse.json();
          if (lensData.data?.profiles?.items?.length > 0) {
            const profile = lensData.data.profiles.items[0];
            results.socialProfiles.lens = {
              handle: profile.handle,
              name: profile.name,
              bio: profile.bio,
              followers: profile.stats.totalFollowers,
              following: profile.stats.totalFollowing,
              picture: profile.picture?.original?.url || profile.picture?.uri
            };
          }
        }
      } catch (lensError) {
        console.warn('⚠️ Lens lookup failed:', lensError.message);
      }

    } catch (error) {
      console.warn('⚠️ Social profiles lookup failed:', error.message);
    }
  };

  // Fetch token holdings using Alchemy API
  const fetchTokenHoldings = async (address, results) => {
    try {
      console.log('💰 Fetching REAL token holdings for:', address);
      
      // Get token balances using Alchemy
      const response = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, 'DEFAULT_TOKENS']
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Alchemy token response:', data);
        
        if (data.result?.tokenBalances) {
          const validTokens = data.result.tokenBalances
            .filter(token => {
              const balance = parseInt(token.tokenBalance || '0x0', 16);
              return balance > 0;
            })
            .slice(0, 20); // Limit to top 20 tokens

          console.log(`📊 Found ${validTokens.length} tokens with balance`);

          // Get token metadata for each token
          for (const token of validTokens) {
            try {
              const metadataResponse = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'alchemy_getTokenMetadata',
                  params: [token.contractAddress]
                })
              });

              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata.result) {
                  const balance = parseInt(token.tokenBalance, 16);
                  const decimals = metadata.result.decimals || 18;
                  const formattedBalance = balance / Math.pow(10, decimals);

                  if (formattedBalance > 0) {
                    results.tokenHoldings.push({
                      contractAddress: token.contractAddress,
                      symbol: metadata.result.symbol || 'UNKNOWN',
                      name: metadata.result.name || 'Unknown Token',
                      balance: formattedBalance,
                      rawBalance: token.tokenBalance,
                      decimals: decimals,
                      logo: metadata.result.logo
                    });
                  }
                }
              }
              
              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (tokenError) {
              console.warn('⚠️ Token metadata failed for:', token.contractAddress, tokenError.message);
            }
          }
        }
      }

      // Also check ETH balance
      try {
        const ethResponse = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest']
          })
        });

        if (ethResponse.ok) {
          const ethData = await ethResponse.json();
          if (ethData.result) {
            const ethBalance = parseInt(ethData.result, 16) / 1e18;
            if (ethBalance > 0) {
              results.tokenHoldings.unshift({
                contractAddress: 'ETH',
                symbol: 'ETH',
                name: 'Ethereum',
                balance: ethBalance,
                rawBalance: ethData.result,
                decimals: 18,
                logo: null
              });
            }
          }
        }
      } catch (ethError) {
        console.warn('⚠️ ETH balance fetch failed:', ethError.message);
      }

    } catch (error) {
      console.error('❌ Token holdings fetch failed:', error.message);
    }
  };

  // Fetch profit/loss data and create heatmap for CURRENT MONTH only
  const fetchProfitLossData = async (address, results) => {
    try {
      console.log('📈 Calculating REAL profit/loss data for:', address);
      
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Get current month start timestamp
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startTimestamp = Math.floor(monthStart.getTime() / 1000);
      
      console.log(`🗓️ Analyzing current month: ${currentMonth} (from ${monthStart.toISOString()})`);
      
      // Initialize current month data
      const monthlyPnL = {};
      monthlyPnL[currentMonth] = { profit: 0, loss: 0, net: 0, transactions: 0 };
      
      const dailyActivity = new Map(); // Track daily transaction counts for heatmap
      
      // Fetch transactions from multiple chains
      const chains = [
        { 
          name: 'Ethereum', 
          url: `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Base', 
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        }
      ];

      for (const chain of chains) {
        try {
          console.log(`🔍 Fetching ${chain.name} transactions...`);
          const response = await fetch(chain.url);
          const data = await response.json();
          
          if (data.status === '1' && data.result && Array.isArray(data.result)) {
            console.log(`📊 ${chain.name}: Found ${data.result.length} total transactions`);
            
            // Filter transactions for current month only
            const currentMonthTxs = data.result.filter(tx => {
              const txTimestamp = parseInt(tx.timeStamp);
              return txTimestamp >= startTimestamp;
            });
            
            console.log(`📅 ${chain.name}: ${currentMonthTxs.length} transactions in current month`);
            
            currentMonthTxs.forEach(tx => {
              const txDate = new Date(parseInt(tx.timeStamp) * 1000);
              const dayKey = txDate.toISOString().split('T')[0];
              
              // Count daily activity for heatmap
              dailyActivity.set(dayKey, (dailyActivity.get(dayKey) || 0) + 1);
              
              const value = parseFloat(tx.value) / 1e18; // Convert Wei to ETH
              const gasUsed = (parseFloat(tx.gasUsed || 0) * parseFloat(tx.gasPrice || 0)) / 1e18;
              
              if (tx.from.toLowerCase() === address.toLowerCase()) {
                // Outgoing transaction
                monthlyPnL[currentMonth].loss += value + gasUsed;
              } else {
                // Incoming transaction  
                monthlyPnL[currentMonth].profit += value;
              }
              
              monthlyPnL[currentMonth].transactions++;
            });
            
          } else {
            console.log(`⚠️ ${chain.name}: ${data.message || 'No transactions found'}`);
          }
          
          // Small delay between API calls
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (chainError) {
          console.error(`❌ ${chain.name} transaction fetch failed:`, chainError.message);
        }
      }
      
      // Calculate net P&L
      monthlyPnL[currentMonth].net = monthlyPnL[currentMonth].profit - monthlyPnL[currentMonth].loss;
      
      console.log('💰 Current month P&L:', monthlyPnL[currentMonth]);

      // Create heatmap data for current month only (last 30 days)
      const heatmapData = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        const dayKey = date.toISOString().split('T')[0];
        const dayActivity = dailyActivity.get(dayKey) || 0;
        
        // Activity levels: 0 = no activity, 1-4 = increasing activity
        const activityLevel = dayActivity === 0 ? 0 : Math.min(Math.ceil(dayActivity / 2), 4);
        
        heatmapData.push({
          date: dayKey,
          activity: activityLevel,
          transactions: dayActivity,
          value: 0 // We'll calculate this if needed
        });
      }

      results.profitLoss = {
        monthly: monthlyPnL,
        total: monthlyPnL[currentMonth].net,
        heatmapData: heatmapData,
        currentMonth: currentMonth
      };

    } catch (error) {
      console.error('❌ Profit/loss calculation failed:', error.message);
    }
  };

  // Fetch comprehensive wallet activity with REAL stats
  const fetchWalletActivity = async (address, results) => {
    try {
      console.log('🔍 Fetching REAL comprehensive wallet activity for:', address);
      
      const activity = [];
      const stats = {
        totalTransactions: 0,
        totalValue: 0,
        dappsUsed: new Set(),
        firstTransaction: null,
        lastTransaction: null
      };

      // Fetch from multiple chains
      const chains = [
        { 
          name: 'Ethereum', 
          url: `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
          explorerUrl: 'https://etherscan.io'
        },
        { 
          name: 'Base', 
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
          explorerUrl: 'https://basescan.org'
        }
      ];

      for (const chain of chains) {
        try {
          console.log(`🔍 Fetching ${chain.name} activity...`);
          const response = await fetch(chain.url);
          const data = await response.json();
          
          if (data.status === '1' && data.result && Array.isArray(data.result)) {
            console.log(`📊 ${chain.name}: Found ${data.result.length} transactions`);
            
            // Process all transactions for accurate stats
            data.result.forEach(tx => {
              const txDate = new Date(parseInt(tx.timeStamp) * 1000);
              const value = parseFloat(tx.value) / 1e18;
              
              // Add to activity list (limit to recent 50 per chain for display)
              if (activity.length < 100) {
                activity.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: value,
                  timestamp: parseInt(tx.timeStamp),
                  date: txDate,
                  chain: chain.name,
                  gasUsed: tx.gasUsed,
                  gasPrice: tx.gasPrice,
                  status: tx.isError === '0' ? 'success' : 'failed',
                  methodId: tx.input?.slice(0, 10) || '0x',
                  blockNumber: tx.blockNumber,
                  explorerUrl: chain.explorerUrl
                });
              }

              // Update stats with ALL transactions
              stats.totalTransactions++;
              stats.totalValue += value;
              
              // Track unique contracts interacted with
              if (tx.to && tx.to !== address.toLowerCase() && tx.to !== '0x') {
                stats.dappsUsed.add(tx.to.toLowerCase());
              }

              // Track first and last transaction dates
              if (!stats.firstTransaction || txDate < new Date(stats.firstTransaction)) {
                stats.firstTransaction = txDate.toISOString();
              }
              
              if (!stats.lastTransaction || txDate > new Date(stats.lastTransaction)) {
                stats.lastTransaction = txDate.toISOString();
              }
            });
            
          } else {
            console.log(`⚠️ ${chain.name}: ${data.message || 'No transactions found'}`);
          }
          
          // Small delay between chain requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (chainError) {
          console.error(`❌ ${chain.name} activity fetch failed:`, chainError.message);
        }
      }

      // Sort by timestamp (newest first)
      activity.sort((a, b) => b.timestamp - a.timestamp);

      console.log('📈 Final wallet stats:', {
        totalTransactions: stats.totalTransactions,
        totalValue: stats.totalValue.toFixed(4) + ' ETH',
        uniqueDapps: stats.dappsUsed.size,
        activityRecords: activity.length
      });

      results.walletActivity = activity;
      results.stats = {
        totalTransactions: stats.totalTransactions,
        totalValue: stats.totalValue,
        dappsUsed: stats.dappsUsed.size,
        firstTransaction: stats.firstTransaction,
        lastTransaction: stats.lastTransaction
      };

    } catch (error) {
      console.error('❌ Wallet activity fetch failed:', error.message);
    }
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

              {/* User Profile & Connection */}
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  {/* Enhanced User Profile Display */}
                  <div className="bg-purple-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      {/* User Info - No Profile Picture, FID integrated */}
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {currentUser?.username ? `@${currentUser.username}` : 
                           currentUser?.displayName || 
                           formatAddress(address)}
                          {currentUser?.fid && (
                            <span className="text-purple-300 text-xs ml-2">
                              FID: {currentUser.fid}
                            </span>
                          )}
                        </span>
                        {currentUser?.displayName && currentUser?.username && (
                          <span className="text-xs text-purple-300">{currentUser.displayName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Address Selector for multiple addresses */}
                  {userAddresses.length > 1 && (
                    <select
                      className="bg-purple-600 text-white text-sm py-1 px-2 rounded focus:outline-none"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    >
                      {userAddresses.map((addr, idx) => (
                        <option key={addr} value={addr.toLowerCase()}>
                          Address {idx + 1}: {formatAddress(addr)}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <button
                    onClick={disconnect}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting || !sdkReady}
                    className="flex items-center justify-center px-6 py-2 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    {isConnecting ? 'Connecting...' : 
                     userAddresses.length > 0 ? 'Use Verified Address' : 'Connect Wallet'}
                  </button>
                  

                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs - Only show when connected */}
          {isConnected && (
            <div className="flex space-x-1 bg-purple-900 p-1 rounded-lg">
              <button
                onClick={() => setCurrentPage('approvals')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                  currentPage === 'approvals'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white hover:bg-purple-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                Revoke
              </button>
              <button
                onClick={() => setCurrentPage('spy')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                  currentPage === 'spy'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white hover:bg-purple-700'
                }`}
              >
                <Activity className="w-4 h-4" />
                Spy
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <img src="/farguard-logo.png" alt="FarGuard Logo" className="w-16 h-16 mx-auto mb-4" />
              
              {/* Personalized Welcome for Farcaster Users */}
              {currentUser ? (
                <div className="mb-6">
                  <div className="text-center mb-3">
                    <h2 className="text-2xl font-bold text-purple-200">
                      Welcome, {currentUser.displayName || `@${currentUser.username}`}!
                    </h2>
                    <p className="text-sm text-purple-400">
                      FID: {currentUser.fid} • Ready to secure your wallet
                    </p>
                  </div>
                  
                  {userAddresses.length > 0 ? (
                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                      <p className="text-green-300 text-sm">
                        ✅ Found {userAddresses.length} verified address{userAddresses.length > 1 ? 'es' : ''} in your Farcaster profile
                      </p>
                      <div className="text-xs text-green-200 mt-1">
                        {userAddresses.slice(0, 2).map((addr, idx) => (
                          <div key={addr}>{formatAddress(addr)}</div>
                        ))}
                        {userAddresses.length > 2 && <div>+{userAddresses.length - 2} more...</div>}
                      </div>
                    </div>
                  ) : (
                    !isConnected && (
                      <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-3 mb-4">
                        <p className="text-blue-200 text-sm">
                          {userAddresses.length > 0 
                            ? '🔗 Ready to connect with your verified Farcaster addresses'
                            : '🔗 Connect your wallet to view token approvals and activity'
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-purple-200 mb-2">Secure Your Wallet</h2>
                  <p className="text-xl text-purple-300 mb-4">
                    View your REAL token approvals and revoke risky permissions
                  </p>
                </div>
              )}
              
              {!sdkReady && (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-sm">
                    🔄 Initializing Farcaster SDK...
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
                disabled={isConnecting || !sdkReady}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {!sdkReady ? 'Initializing...' : 
                 isConnecting ? 'Connecting...' : 
                 userAddresses.length > 0 ? '🔗 Use Verified Addresses' : '🔗 Connect Wallet'}
              </button>
            </div>
          ) : (
            <div>
              {/* Connected View */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-purple-200">
                  {currentPage === 'approvals' 
                    ? `Active Token Approvals (${chains.find(c => c.value === selectedChain)?.name})`
                    : currentPage === 'spy'
                    ? 'Wallet Spy - Comprehensive Analysis'
                    : `Wallet Activity (${chains.find(c => c.value === selectedChain)?.name})`
                  }
                </h2>
                <p className="text-sm text-purple-400 mt-1">
                  Connected: {formatAddress(address)}
                </p>
                <div className="flex gap-2 mt-3">
                  {currentPage !== 'spy' && (
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share {currentPage === 'activity' ? 'Activity' : 'Success'}
                    </button>
                  )}
                  {currentPage === 'approvals' ? (
                    <button
                      onClick={() => fetchRealApprovals(address)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  ) : currentPage === 'activity' ? (
                    <button
                      onClick={() => fetchChainActivity(address)}
                      disabled={loadingActivity}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Stats */}
              {currentPage === 'approvals' ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
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
                </div>
              ) : currentPage === 'activity' ? (
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
              ) : currentPage === 'spy' && spyData ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-white">{spyData.stats.totalTransactions}</p>
                    <p className="text-sm text-purple-200">Total Transactions</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{spyData.tokenHoldings.length}</p>
                    <p className="text-sm text-purple-200">Tokens Held</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{spyData.profitLoss.total > 0 ? '+' : ''}{spyData.profitLoss.total.toFixed(3)}</p>
                    <p className="text-sm text-purple-200">ETH P&L</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400">{spyData.stats.dappsUsed}</p>
                    <p className="text-sm text-purple-200">dApps Used</p>
                  </div>
                </div>
              ) : null}



              {/* Error Display */}
              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {/* Reward Claimer Section */}
              {isConnected && address && (
                <div className="mb-6">
                  {showClaim && totalClaims < 50 && (
                    <div className="mb-4">
                      <button
                        onClick={handleClaim}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-colors"
                      >
                        🎁 Claim 0.5 USDC
                      </button>
                    </div>
                  )}

                  {showShare && (
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 border border-green-500 rounded-lg p-4 mb-4">
                      <h3 className="text-white font-bold text-lg mb-3 text-center">Success. Thanks for using Farguard</h3>
                      
                      <div className="space-y-3">
                        <button
                          onClick={shareCast}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        
                        <button
                          onClick={() => {
                            setCurrentPage('approvals');
                            setShowShare(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Revoke More
                        </button>
                      </div>
                    </div>
                  )}



                  {totalClaims >= 50 && !hasClaimedLocally && (
                    <div className="bg-gray-700 border border-gray-500 rounded-lg p-4 mb-4">
                      <h3 className="text-gray-200 font-bold text-lg mb-2">🔒 Rewards Ended</h3>
                      <p className="text-gray-300 text-sm">
                        All 50 rewards have been claimed. Thanks for securing your wallet!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              {currentPage === 'spy' ? (
                // Spy Interface
                <div className="space-y-6">
                  {/* Address Input Section */}
                  <div className="bg-purple-700 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye className="w-6 h-6 text-purple-300" />
                      <h3 className="text-xl font-bold text-white">Enter Address to Analyze</h3>
                    </div>
                    <p className="text-purple-300 text-sm mb-4">
                      Paste any Ethereum address below to get comprehensive analysis including Farcaster profile, social links, token holdings, profit/loss tracking, and complete transaction history.
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={spyAddress}
                        onChange={(e) => setSpyAddress(e.target.value)}
                        placeholder="0x1234567890abcdef1234567890abcdef12345678"
                        className="flex-1 px-4 py-3 bg-purple-800 border border-purple-600 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={searchSpyAddress}
                        disabled={loadingSpy || !spyAddress}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search className={`w-4 h-4 ${loadingSpy ? 'animate-spin' : ''}`} />
                        {loadingSpy ? 'Analyzing...' : 'Search'}
                      </button>
                    </div>
                    {spyError && (
                      <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-red-200 text-sm">{spyError}</p>
                      </div>
                    )}
                  </div>

                  {/* Loading State */}
                  {loadingSpy && (
                    <div className="space-y-4">
                      <div className="bg-purple-700 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-6 h-6 bg-purple-600 rounded animate-pulse"></div>
                          <div className="h-6 bg-purple-600 rounded w-48 animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-purple-600 rounded w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-purple-600 rounded w-1/2 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Spy Results */}
                  {spyData && !loadingSpy && (
                    <div className="space-y-6">
                      {/* Profile Section */}
                      {spyData.farcasterProfile && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <User className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Farcaster Profile</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-white font-semibold">@{spyData.farcasterProfile.username}</p>
                              <p className="text-purple-300">{spyData.farcasterProfile.displayName}</p>
                              <p className="text-purple-400 text-sm mt-2">FID: {spyData.farcasterProfile.fid}</p>
                              {spyData.farcasterProfile.bio && (
                                <p className="text-purple-200 text-sm mt-2">{spyData.farcasterProfile.bio}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-purple-300 text-sm">
                                {spyData.farcasterProfile.followerCount} followers • {spyData.farcasterProfile.followingCount} following
                              </p>
                              {spyData.farcasterProfile.verifiedAddresses.length > 0 && (
                                <p className="text-green-400 text-sm mt-2">
                                  ✅ {spyData.farcasterProfile.verifiedAddresses.length} verified address{spyData.farcasterProfile.verifiedAddresses.length > 1 ? 'es' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Social Profiles */}
                      {(spyData.socialProfiles.ens || spyData.socialProfiles.lens) && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <ExternalLink className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Social Profiles</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {spyData.socialProfiles.ens && (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2">ENS</h4>
                                <p className="text-purple-200">{spyData.socialProfiles.ens.name}</p>
                                {spyData.socialProfiles.ens.description && (
                                  <p className="text-purple-400 text-sm mt-1">{spyData.socialProfiles.ens.description}</p>
                                )}
                              </div>
                            )}
                            {spyData.socialProfiles.lens && (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2">Lens Protocol</h4>
                                <p className="text-purple-200">{spyData.socialProfiles.lens.handle}</p>
                                <p className="text-purple-400 text-sm">{spyData.socialProfiles.lens.followers} followers</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Token Holdings */}
                      {spyData.tokenHoldings.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Token Holdings</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {spyData.tokenHoldings.slice(0, 12).map((token, index) => (
                              <div key={index} className="bg-purple-800 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-semibold text-sm">{token.symbol}</p>
                                    <p className="text-purple-400 text-xs">{token.name}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-purple-200 text-sm">{token.balance.toFixed(4)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {spyData.tokenHoldings.length > 12 && (
                            <p className="text-purple-400 text-sm mt-3 text-center">
                              +{spyData.tokenHoldings.length - 12} more tokens
                            </p>
                          )}
                        </div>
                      )}

                      {/* Profit/Loss Heatmap */}
                      {spyData.profitLoss.heatmapData.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Activity Heatmap (Last 12 Months)</h3>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            {spyData.profitLoss.heatmapData.slice(-365).map((day, index) => {
                              const intensity = day.activity;
                              const colors = [
                                'bg-purple-900', // 0 activity
                                'bg-green-800', // 1 activity
                                'bg-green-600', // 2 activity
                                'bg-green-500', // 3 activity
                                'bg-green-400'  // 4+ activity
                              ];
                              return (
                                <div
                                  key={index}
                                  className={`w-3 h-3 rounded-sm ${colors[intensity] || colors[0]}`}
                                  title={`${day.date}: ${day.activity} activity`}
                                ></div>
                              );
                            })}
                          </div>
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(spyData.profitLoss.monthly).slice(0, 4).map(([month, data]) => (
                              <div key={month} className="bg-purple-800 rounded-lg p-3 text-center">
                                <p className="text-white font-semibold text-sm">{month}</p>
                                <p className={`text-xs ${data.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {data.net >= 0 ? '+' : ''}{data.net.toFixed(4)} ETH
                                </p>
                                <p className="text-purple-400 text-xs">{data.transactions} txns</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wallet Activity */}
                      {spyData.walletActivity.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
                          </div>
                          <div className="space-y-3">
                            {spyData.walletActivity.slice(0, 10).map((tx, index) => (
                              <div key={index} className="bg-purple-800 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${tx.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                      <p className="text-white text-sm font-medium">
                                        {tx.value > 0 ? `${tx.value.toFixed(4)} ETH` : 'Contract Interaction'}
                                      </p>
                                      <span className="bg-blue-600 px-2 py-1 rounded text-xs text-white">
                                        {tx.chain}
                                      </span>
                                    </div>
                                    <p className="text-purple-400 text-xs mt-1">
                                      From: {formatAddress(tx.from)} → To: {formatAddress(tx.to)}
                                    </p>
                                    <p className="text-purple-400 text-xs">
                                      {new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString()}
                                    </p>
                                  </div>
                                  <a
                                    href={`${tx.chain === 'Ethereum' ? 'https://etherscan.io' : 'https://basescan.org'}/tx/${tx.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-300 hover:text-white transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                          {spyData.walletActivity.length > 10 && (
                            <p className="text-purple-400 text-sm mt-3 text-center">
                              +{spyData.walletActivity.length - 10} more transactions
                            </p>
                          )}
                        </div>
                      )}

                      {/* No Data Found */}
                      {!spyData.farcasterProfile && 
                       !spyData.socialProfiles.ens && 
                       !spyData.socialProfiles.lens && 
                       spyData.tokenHoldings.length === 0 && 
                       spyData.walletActivity.length === 0 && (
                        <div className="text-center py-8">
                          <Eye className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                          <p className="text-purple-300 text-lg font-semibold">No data found</p>
                          <p className="text-purple-400 text-sm mt-2">
                            This address has no visible activity or associated profiles
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : currentPage === 'approvals' ? (
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
                          <span>Block: {approval.blockNumber}</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => requestRevokeApproval(approval)}
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
                )
              ) : (
                // Activity View
                loadingActivity ? (
                  <div className="space-y-4">
                    <p className="text-center text-purple-300">Loading wallet activity...</p>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-purple-700 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-purple-600 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-purple-600 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : chainActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <p className="text-blue-300 text-lg font-semibold">No activity found</p>
                    <p className="text-purple-400 text-sm mt-2">
                      No transactions found in complete wallet history across all chains
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityStats.lastActivity && (
                      <div className="bg-purple-700 rounded-lg p-4 mb-4">
                        <p className="text-purple-200 text-sm">
                          <strong>Last Activity:</strong> {new Date(activityStats.lastActivity).toLocaleDateString()} at {new Date(activityStats.lastActivity).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {(() => {
                      const startIndex = (activityPageNumber - 1) * transactionsPerPage;
                      const endIndex = startIndex + transactionsPerPage;
                      const paginatedActivity = chainActivity.slice(startIndex, endIndex);
                      const totalPages = Math.ceil(chainActivity.length / transactionsPerPage);

                      return (
                        <>
                          {paginatedActivity.map((tx, index) => (
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
                              {tx.chain && (
                                <p className="text-xs text-blue-400 mt-1">
                                  <span className="bg-blue-600 px-2 py-1 rounded text-white">{tx.chain.toUpperCase()}</span>
                                </p>
                              )}
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
                            title="View Transaction"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-purple-600">
                            <button
                              onClick={() => setActivityPageNumber(prev => Math.max(1, prev - 1))}
                              disabled={activityPageNumber === 1}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ←
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => setActivityPageNumber(i + 1)}
                                className={`px-3 py-1 rounded ${
                                  activityPageNumber === i + 1 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-purple-600 text-white hover:bg-purple-500'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            
                            <button
                              onClick={() => setActivityPageNumber(prev => Math.min(totalPages, prev + 1))}
                              disabled={activityPageNumber === totalPages}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              →
                            </button>
                            
                            <span className="text-purple-300 text-sm ml-2">
                              Page {activityPageNumber} of {totalPages} ({chainActivity.length} transactions)
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  </div>
                )
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer - Reduced margin for miniapp compatibility */}
      <footer className="mt-4 p-2 text-center border-t border-purple-700">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-purple-300">
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
