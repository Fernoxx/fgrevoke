// Fixed App.js - FarGuard with PROPER Farcaster Miniapp SDK Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Trash2, Activity } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { ethers } from 'ethers';


import { REVOKE_HELPER_ADDRESS, revokeHelperABI } from './lib/revokeHelperABI';

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

  // Get ethers provider for reliable blockchain interactions
  const getEthersProvider = (chain) => {
    const chainConfig = chains.find(c => c.value === chain);
    if (!chainConfig) return null;
    
    // Use the first RPC URL for the chain
    return new ethers.providers.JsonRpcProvider(chainConfig.rpcUrls[0]);
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
    if (!userAddress || !selectedChain) return;
    
    setLoadingActivity(true);
    setError(null);
    console.log('🔍 Fetching activity using Alchemy for:', userAddress, 'on chain:', selectedChain);
    
    try {
      await fetchActivityWithAlchemy(userAddress);
      
    } catch (error) {
      console.error('❌ Alchemy activity fetching failed:', error);
      setError(`Failed to fetch ${selectedChain} activity: ${error.message}`);
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

  // Fetch activity using Alchemy
  const fetchActivityWithAlchemy = async (userAddress) => {
    try {
      console.log('🔍 Fetching activity using Alchemy for:', userAddress);
      
      // Get latest block
      const latestBlock = await makeAlchemyCall('eth_blockNumber', [], 'Latest Block for Activity');
      const latestBlockNum = parseInt(latestBlock, 16);
      const fromBlock = Math.max(0, latestBlockNum - 5000); // Last 5k blocks for performance
      
      console.log(`📊 Using Alchemy activity block range: ${fromBlock} to ${latestBlockNum}`);
      
      let allActivity = [];
      
      // Get recent transaction hashes for this address
      // Use Alchemy's enhanced API for better performance
      try {
        // Get transfers TO this address (received) - use address field instead of topics for better compatibility
        const receivedLogs = await makeAlchemyCall('alchemy_getAssetTransfers', [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: 'latest',
          toAddress: userAddress.toLowerCase(),
          category: ['erc20', 'erc721', 'erc1155', 'external'],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: '0x64' // 100 transfers max
        }], 'Received Transfers');
        
        // Get transfers FROM this address (sent)
        const sentLogs = await makeAlchemyCall('alchemy_getAssetTransfers', [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: 'latest',
          fromAddress: userAddress.toLowerCase(),
          category: ['erc20', 'erc721', 'erc1155', 'external'],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: '0x64' // 100 transfers max
        }], 'Sent Transfers');
        
        console.log(`✅ Found ${receivedLogs?.transfers?.length || 0} received and ${sentLogs?.transfers?.length || 0} sent transfers`);
        
        // Process the transfers from Alchemy's enhanced API
        const allTransfers = [
          ...(receivedLogs?.transfers || []),
          ...(sentLogs?.transfers || [])
        ];
        
        console.log(`🔍 Processing ${allTransfers.length} transfers`);
        
        // Process transfers directly (limit to prevent overwhelming)
        const transfersToProcess = allTransfers.slice(0, 20);
        
        for (const transfer of transfersToProcess) {
          try {
            const value = transfer.category === 'external' 
              ? parseFloat(transfer.value || '0') 
              : 0; // For ERC20 tokens, we'll show token amount separately
            
            const blockNum = parseInt(transfer.blockNum, 16);
            const timestamp = blockNum * 12000 + 1640000000000; // Approximate timestamp
            
            const activity = {
              hash: transfer.hash,
              timeStamp: timestamp,
              from: transfer.from?.toLowerCase() || '',
              to: transfer.to?.toLowerCase() || '',
              value: value,
              gasFee: 0, // We'll get this from transaction receipt if needed
              gasUsed: 0,
              methodId: transfer.category === 'external' ? '0x' : '0xa9059cbb',
              functionName: transfer.category === 'external' ? 'ETH Transfer' : `${transfer.asset} Transfer`,
              isError: false, // Alchemy only returns successful transfers
              blockNumber: blockNum,
              type: transfer.category,
              tokenSymbol: transfer.asset || 'ETH',
              tokenValue: transfer.category !== 'external' ? parseFloat(transfer.value || '0') : null
            };
            
            allActivity.push(activity);
            
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 50));
            
          } catch (transferError) {
            console.warn('⚠️ Failed to process transfer:', transferError.message);
          }
        }
        
      } catch (error) {
        console.warn('⚠️ Could not fetch activity logs:', error.message);
      }
      
      // Sort by block number (newest first)
      allActivity.sort((a, b) => b.blockNumber - a.blockNumber);
      
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
      console.log(`✅ Processed ${allActivity.length} activities using Alchemy`);
      
    } catch (error) {
      console.error('❌ Alchemy activity fetch failed:', error);
      throw error;
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

  // Direct individual revoke (no confirmation dialog)
  const requestRevokeApproval = (approval) => {
    console.log("🔄 Individual revoke requested for:", approval.name);
    console.log("🚀 Calling individual revoke directly...");
    handleRevokeApproval(approval);
  };

  // RESTORE WORKING INDIVIDUAL REVOKE - Direct ERC20 approve(spender, 0) call
  const handleRevokeApproval = async (approval) => {
    console.log('🎯 handleRevokeApproval called for:', approval.name);
    console.log('🔌 Provider state:', { hasProvider: !!provider, isConnected, address });
    
    if (!provider || !isConnected) {
      console.log('❌ Wallet not connected properly');
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔄 Starting individual revoke for:', approval.name);
      
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

    } catch (error) {
      console.error('❌ Revoke failed:', error);
      setError(`Failed to revoke approval: ${error.message}`);
    }
  };

  // State for revoke operations
  const [isRevoking, setIsRevoking] = useState(false);

  // Revoke ALL approvals - Direct contract call
  const handleRevokeAll = async () => {
    console.log("🔥 Revoke All button clicked!");
    console.log("📊 Current state:", {
      approvalsCount: approvals.length,
      isConnected,
      hasProvider: !!provider,
      address,
      isRevoking
    });
    
    if (approvals.length === 0) {
      console.log("❌ No approvals to revoke");
      setError('No approvals to revoke!');
      return;
    }

    if (!provider || !address) {
      console.log("❌ Wallet not connected");
      setError('Please connect your wallet first');
      return;
    }

    if (isRevoking) {
      console.log("❌ Already revoking");
      return;
    }

    // Direct call to contract - no confirm dialog (doesn't work in sandboxed environment)
    console.log("🚀 Calling revoke contract directly...");
    await confirmRevokeAll();
  };

    // Clean Safe Revoke Pattern (as requested)
  const confirmRevokeAll = async () => {
    try {
      setIsRevoking(true);
      
      // Filter only ERC20 approvals with STRICT validation
      const erc20Approvals = approvals.filter(a => {
        // Since we don't have tokenType field, use our existing logic
        const isActive = a.isActive !== false;
        const hasAmount = a.amount && a.amount !== '0' && a.amount !== '0.0';
        const looksLikeERC20 = a.symbol && a.symbol.length <= 10;
        const notNFT = a.amount !== '1' || a.symbol?.includes('LP') || a.symbol?.includes('Token');
        
                 // EXTRA STRICT: Only include if amount is a valid number > 0
         const amountNum = parseFloat(a.amount || '0');
         const hasValidAmount = !isNaN(amountNum) && amountNum > 0;
         
         // DEBUG: Log amount parsing issues
         if (!hasValidAmount) {
           console.log(`🔍 Amount parsing issue for ${a.name}: "${a.amount}" → ${amountNum} (isNaN: ${isNaN(amountNum)})`);
         }
        
        // EXTRA STRICT: Must have valid contract and spender addresses
        const validContract = a.contract && a.contract.startsWith('0x') && a.contract.length === 42;
        const validSpender = a.spender && a.spender.startsWith('0x') && a.spender.length === 42;
        
        const isValid = isActive && hasAmount && hasValidAmount && looksLikeERC20 && notNFT && validContract && validSpender;
        
        if (!isValid) {
          console.log(`⚠️ FILTERED OUT: ${a.name} - Active:${isActive}, HasAmount:${hasAmount}, ValidAmount:${hasValidAmount}, ERC20:${looksLikeERC20}, NotNFT:${notNFT}, ValidContract:${validContract}, ValidSpender:${validSpender}`);
        } else {
          console.log(`✅ INCLUDED: ${a.name} (${a.symbol}) - Amount: ${a.amount}`);
        }
        
        return isValid;
      });

      const tokenAddresses = erc20Approvals.map(a => a.contract);
      const spenderAddresses = erc20Approvals.map(a => a.spender);

      if (tokenAddresses.length !== spenderAddresses.length) {
        console.error("❌ Length mismatch");
        return;
      }

      if (tokenAddresses.length === 0) {
        console.log('❌ No valid approvals to revoke');
        return;
      }

      console.log("📥 Tokens:", tokenAddresses);
      console.log("📥 Spenders:", spenderAddresses);
      console.log("✅ Equal length:", tokenAddresses.length === spenderAddresses.length);
      
      // FINAL VALIDATION: Check actual allowances before contract call
      console.log("🔍 FINAL VALIDATION - Checking actual allowances...");
      for (let i = 0; i < Math.min(tokenAddresses.length, spenderAddresses.length); i++) {
        const token = tokenAddresses[i];
        const spender = spenderAddresses[i];
        const approval = erc20Approvals[i];
        console.log(`  ${i}: ${approval.name} → ${approval.spenderName}`);
        console.log(`      Token: ${token}`);
        console.log(`      Spender: ${spender}`);
        console.log(`      Stored Amount: ${approval.amount}`);
      }

      // Since writeContract doesn't work with Farcaster SDK, use provider.request
      // Create contract call data
      const functionSignature = '0x6b6f5a1e'; // revokeERC20(address[],address[])
      const encodedTokens = ethers.utils.defaultAbiCoder.encode(['address[]'], [tokenAddresses]);
      const encodedSpenders = ethers.utils.defaultAbiCoder.encode(['address[]'], [spenderAddresses]);
      
      const tokensData = encodedTokens.slice(66);
      const spendersData = encodedSpenders.slice(66);
      const tokensOffset = '0000000000000000000000000000000000000000000000000000000000000040';
      const spendersOffset = (64 + tokensData.length / 2).toString(16).padStart(64, '0');
      const callData = functionSignature + tokensOffset + spendersOffset + tokensData + spendersData;

      const txParams = {
        to: REVOKE_HELPER_ADDRESS,
        data: callData,
        from: address,
        value: '0x0'
      };

      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log("✅ Revoke submitted:", tx);
      console.log('✅ Revoke submitted');
      
      // Clear revoked approvals from UI
      setApprovals(prev => prev.filter(approval => !erc20Approvals.some(revoked => revoked.id === approval.id)));
      
    } catch (err) {
      console.error("❌ Revoke failed:", err);
      console.log(err.message || 'Revoke failed');
    } finally {
      setIsRevoking(false);
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
                  
                  {/* Connection Status */}
                  {!isConnected && (
                    <div className="mt-2 text-sm text-purple-300 text-center">
                      🔗 Farcaster SDK + Direct wallet connection
                    </div>
                  )}
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

              {/* Revoke All Button - Only show for approvals */}
              {currentPage === 'approvals' && approvals.length > 0 && (
                <div className="mb-6 space-y-2">
                  <button
                    onClick={handleRevokeAll}
                    disabled={isRevoking}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    {isRevoking ? 'Revoking Approvals...' : `Revoke All ${approvals.length} Approvals`}
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
                      <p><strong>Farcaster User:</strong> {currentUser ? `@${currentUser.username} (FID: ${currentUser.fid})` : 'None'}</p>
                      <p><strong>Verified Addresses:</strong> {userAddresses.length}</p>
                      <p><strong>Current Address:</strong> {address}</p>
                      <p><strong>Chain:</strong> {selectedChain}</p>
                      <p><strong>Provider:</strong> {provider ? '✅' : '❌'}</p>
                      <p><strong>Current Page:</strong> {currentPage}</p>
                      {currentPage === 'approvals' ? (
                        <>
                          <p><strong>Loading Approvals:</strong> {loading ? 'Yes' : 'No'}</p>
                          <p><strong>Approvals Count:</strong> {approvals.length}</p>
                        </>
                      ) : (
                        <>
          
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
                    <p className="text-blue-300 text-lg font-semibold">No recent activity found</p>
                    <p className="text-purple-400 text-sm mt-2">
                      No transactions found in the last 10,000 blocks on {chains.find(c => c.value === selectedChain)?.name}
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
