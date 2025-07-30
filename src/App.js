// Fixed App.js - FarGuard with PROPER Farcaster Miniapp SDK Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Activity } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useReadContract, useWriteContract } from 'wagmi';
import { rewardClaimerAddress, rewardClaimerABI } from './lib/rewardClaimerABI';


function App() {

  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('approvals'); // 'approvals' or 'activity'

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

  // Track if user has revoked at least one approval
  const hasRevokedAtLeastOne = localStorage.getItem('revoked') === 'true';

  // Mock revoke function (since we're focusing on reward claiming now)
  const requestRevokeApproval = (approval) => {
    console.log("🔄 Individual revoke requested for:", approval.name);
    
    // Mark as revoked in localStorage and remove from UI
    localStorage.setItem('revoked', 'true');
    setApprovals(prev => prev.filter(a => a.id !== approval.id));
    
    console.log('✅ Approval revoked (simulated):', approval.name);
  };







  // Reward Claimer Contract Interactions
  const { data: hasClaimed } = useReadContract({
    abi: rewardClaimerABI,
    address: rewardClaimerAddress,
    functionName: 'hasClaimed',
    args: [address],
    enabled: !!address,
  });

  const { data: totalClaims } = useReadContract({
    abi: rewardClaimerABI,
    address: rewardClaimerAddress,
    functionName: 'totalClaims',
  });

  const { writeContractAsync } = useWriteContract();

  const handleClaim = async () => {
    try {
      setError(null);
      console.log('🎁 Starting claim process...');
      
      const tx = await writeContractAsync({
        abi: rewardClaimerABI,
        address: rewardClaimerAddress,
        functionName: 'claimReward',
      });
      
      console.log('✅ Claim successful:', tx);
      alert('🎉 Claim successful! You received 0.5 USDC!');
    } catch (error) {
      console.error('❌ Claim failed:', error);
      setError(`Claim failed: ${error.message}`);
    }
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

Secure yours too:

https://fgrevoke.vercel.app`;

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
                      {/* Profile Picture */}
                      {currentUser?.pfpUrl && (
                        <img 
                          src={currentUser.pfpUrl} 
                          alt="Profile" 
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                      {/* User Info */}
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {currentUser?.username ? `@${currentUser.username}` : 
                           currentUser?.displayName || 
                           formatAddress(address)}
                        </span>
                        {currentUser?.displayName && currentUser?.username && (
                          <span className="text-xs text-purple-300">{currentUser.displayName}</span>
                        )}
                      </div>
                      {/* FID Badge */}
                      {currentUser?.fid && (
                        <span className="bg-purple-600 text-purple-200 text-xs px-2 py-1 rounded">
                          FID: {currentUser.fid}
                        </span>
                      )}
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
                Token Approvals
              </button>
              <button
                onClick={() => setCurrentPage('activity')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                  currentPage === 'activity'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white hover:bg-purple-700'
                }`}
              >
                <Activity className="w-4 h-4" />
                Wallet Activity
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
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {currentUser.pfpUrl && (
                      <img 
                        src={currentUser.pfpUrl} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full border-2 border-purple-400"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-purple-200">
                        Welcome, {currentUser.displayName || `@${currentUser.username}`}!
                      </h2>
                      <p className="text-sm text-purple-400">
                        FID: {currentUser.fid} • Ready to secure your wallet
                      </p>
                    </div>
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-200">
                    {currentPage === 'approvals' 
                      ? `Active Token Approvals (${chains.find(c => c.value === selectedChain)?.name})`
                      : `Wallet Activity (${chains.find(c => c.value === selectedChain)?.name})`
                    }
                  </h2>
                  <p className="text-sm text-purple-400 mt-1">
                    Connected: {formatAddress(address)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share {currentPage === 'activity' ? 'Activity' : 'Success'}
                  </button>
                  {currentPage === 'approvals' ? (
                    <button
                      onClick={() => fetchRealApprovals(address)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  ) : (
                    <button
                      onClick={() => fetchChainActivity(address)}
                      disabled={loadingActivity}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
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
                  {!hasClaimed && totalClaims < 50 && hasRevokedAtLeastOne && (
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 border border-green-500 rounded-lg p-4 mb-4">
                      <h3 className="text-white font-bold text-lg mb-2">🎁 Claim Your Reward!</h3>
                      <p className="text-green-100 text-sm mb-3">
                        You've revoked at least one approval! Claim 0.5 USDC as a reward.
                      </p>
                      <p className="text-green-200 text-xs mb-3">
                        {totalClaims || 0}/50 users have claimed. Be one of the first 50!
                      </p>
                      <button
                        onClick={handleClaim}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                      >
                        🎁 Claim 0.5 USDC
                      </button>
                    </div>
                  )}

                  {hasClaimed && (
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-500 rounded-lg p-4 mb-4">
                      <h3 className="text-white font-bold text-lg mb-2">✅ Reward Claimed!</h3>
                      <p className="text-purple-100 text-sm mb-3">
                        You've successfully claimed 0.5 USDC! Share your success:
                      </p>
                      <a
                        href={`https://warpcast.com/~/compose?text=${encodeURIComponent('🎉 Just claimed 0.5 USDC for securing my wallet with FarGuard! https://fgrevoke.vercel.app')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share on Farcaster
                      </a>
                    </div>
                  )}

                  {!hasRevokedAtLeastOne && totalClaims < 50 && (
                    <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 mb-4">
                      <h3 className="text-yellow-200 font-bold text-lg mb-2">💡 Earn 0.5 USDC</h3>
                      <p className="text-yellow-300 text-sm">
                        Revoke at least one token approval to unlock your reward claim!
                      </p>
                    </div>
                  )}

                  {totalClaims >= 50 && !hasClaimed && (
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
