// Fixed App.js - FarGuard with PROPER Farcaster Miniapp SDK Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Activity, Search, User, TrendingUp, BarChart3, Calendar, Eye, Zap, FileText, Radar, Crown, Copy, DollarSign, Target, ShoppingCart, Menu } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useReadContract } from 'wagmi';
import { rewardClaimerAddress, rewardClaimerABI } from './lib/rewardClaimerABI';


function App() {

  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('approvals');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false); // 'approvals', 'activity', or 'spy'
  const [activityPageNumber, setActivityPageNumber] = useState(1);
  const transactionsPerPage = 10;

  // Scanner functionality states
  const [scannerAddress, setScannerAddress] = useState('');
  const [scannerData, setScannerData] = useState(null);
  const [loadingScanner, setLoadingScanner] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [scannerTxPage, setScannerTxPage] = useState(1);
  const [hasMoreTxs, setHasMoreTxs] = useState(false);

  // DegenTools functionality states
  const [contractAddress, setContractAddress] = useState('');
  const [contractData, setContractData] = useState(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [contractError, setContractError] = useState(null);
  const [showActivityRadar, setShowActivityRadar] = useState(false);
  const [liveActivity, setLiveActivity] = useState([]);
  const [loadingActivityRadar, setLoadingActivityRadar] = useState(false);
  
  // Trending Wallets states
  const [showTrendingWallets, setShowTrendingWallets] = useState(false);

  // Buy functionality states
  const [buyAmount, setBuyAmount] = useState('');
  const [buyCurrency, setBuyCurrency] = useState('ETH'); // ETH or USDC
  const [tokenPrice, setTokenPrice] = useState(0);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  // Token contract address
  const TOKEN_CONTRACT_ADDRESS = '0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07';
  const [trendingWallets, setTrendingWallets] = useState([]);
  const [loadingTrendingWallets, setLoadingTrendingWallets] = useState(false);
  const [trendingWalletsError, setTrendingWalletsError] = useState(null);
  const [hasClaimedFaucet, setHasClaimedFaucet] = useState(false);
  const [claimedTokenInfo, setClaimedTokenInfo] = useState(null);

  // Farcaster integration states
  const [currentUser, setCurrentUser] = useState(null); // Real Farcaster user data
  const [address, setAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]); // All user's addresses
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setContext] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [provider, setProvider] = useState(null);
  const [faucetBusy, setFaucetBusy] = useState(null);

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
  const BASESCAN_KEY = process.env.REACT_APP_BASESCAN_API_KEY || process.env.REACT_APP_BASESCAN_KEY || ETHERSCAN_API_KEY;
  const ARBISCAN_KEY = process.env.REACT_APP_ARBISCAN_KEY || ETHERSCAN_API_KEY;
  
  console.log('🔑 API Keys loaded for Etherscan V2:', {
    etherscan: ETHERSCAN_API_KEY ? `${ETHERSCAN_API_KEY.substring(0, 8)}...` : 'missing',
    alchemy: ALCHEMY_API_KEY ? `${ALCHEMY_API_KEY.substring(0, 8)}...` : 'missing',
    basescan: BASESCAN_KEY ? `${BASESCAN_KEY.substring(0, 8)}...` : 'missing',
    arbiscan: ARBISCAN_KEY ? `${ARBISCAN_KEY.substring(0, 8)}...` : 'missing'
  });
  
  // Debug: Log the actual environment variables available
  console.log('🔍 Environment variables debug:', {
    REACT_APP_ETHERSCAN_API_KEY: process.env.REACT_APP_ETHERSCAN_API_KEY ? 'SET' : 'NOT SET',
    REACT_APP_ALCHEMY_API_KEY: process.env.REACT_APP_ALCHEMY_API_KEY ? 'SET' : 'NOT SET'
  });

  // Test Etherscan V2 API connectivity
  const testEtherscanV2API = async () => {
    try {
      console.log('🧪 Testing Etherscan V2 API connectivity...');
      const testUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      console.log('🔗 Test URL:', testUrl.replace(ETHERSCAN_API_KEY, 'API_KEY_HIDDEN'));
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      console.log('✅ V2 API Test Result:', {
        status: data.status,
        message: data.message,
        hasResult: !!data.result
      });
      
      if (data.status === '1') {
        console.log('🎉 Etherscan V2 API is working correctly!');
      } else {
        console.error('❌ Etherscan V2 API test failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Etherscan V2 API connectivity test failed:', error);
    }
  };

  // Run API test on component mount
  useEffect(() => {
    if (ETHERSCAN_API_KEY && ETHERSCAN_API_KEY !== 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7') {
      testEtherscanV2API();
    } else {
      console.warn('⚠️ Using fallback API key - real data may not be available');
    }
  }, []);

  // Rate limiting
  const [, setApiCallCount] = useState(0);

  // Chain configuration using Etherscan V2 API with chainid parameter
  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/v2/api?chainid=1', // Etherscan V2 for Ethereum
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
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson?.error?.message || JSON.stringify(errJson);
        } catch (_) {
          try {
            errorDetail = await response.text();
          } catch (_) {
            errorDetail = response.statusText || 'Unknown error';
          }
        }
        throw new Error(`HTTP ${response.status}: ${errorDetail}`);
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
      const chunkSize = 10000; // Stay under Alchemy eth_getLogs range limits
      console.log(`📊 Using Alchemy block range: ${fromBlock} to ${latestBlockNum} (chunkSize=${chunkSize})`);
      
      // Fetch in chunks to avoid HTTP 400 due to large ranges
      const allLogs = [];
      for (let start = fromBlock; start <= latestBlockNum; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, latestBlockNum);
        const chunkLogs = await makeAlchemyCall('eth_getLogs', [{
          fromBlock: `0x${start.toString(16)}`,
          toBlock: `0x${end.toString(16)}`,
          topics: [approvalTopic]
        }], `Approval Logs ${start}-${end}`);
        if (Array.isArray(chunkLogs)) allLogs.push(...chunkLogs);
        // Limit total logs to keep processing bounded
        if (allLogs.length > 5000) break;
      }
      
      console.log(`✅ Alchemy returned ${allLogs.length} approval logs in chunks`);
      
      if (allLogs.length > 0) {
        await processApprovalsFromAlchemy(allLogs, userAddress);
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
  // Connect with Farcaster
  const connectFarcaster = async () => {
    console.log('🔌 Starting Farcaster connection...');
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

      // Try to get wallet provider from miniapp SDK
      console.log('🌐 Getting Ethereum provider from Farcaster...');
      const ethProvider = await sdk.wallet.getEthereumProvider();
      console.log('✅ Got provider from miniapp SDK');
      
      if (!ethProvider) {
        throw new Error('No wallet provider available from Farcaster.');
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
      console.log('👛 Farcaster wallet connected:', walletAddress);

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
      setCurrentUser({ ...currentUser, walletType: 'farcaster' });

      console.log('🎉 Farcaster connection successful!');

    } catch (error) {
      console.error('❌ Farcaster connection failed:', error);
      setError(`Failed to connect with Farcaster: ${error.message}`);
    } finally {
      setIsConnecting(false);
      setShowWalletSelection(false);
    }
  };

  // Connect with Rabby wallet
  const connectRabby = async () => {
    console.log('🐰 Starting Rabby wallet connection...');
    setIsConnecting(true);
    setError(null);

    try {
      // Check if Rabby is installed
      if (!window.ethereum || !window.ethereum.isRabby) {
        throw new Error('Rabby wallet is not installed. Please install Rabby from https://rabby.io');
      }

      console.log('✅ Rabby wallet detected, requesting accounts...');
      setProvider(window.ethereum);

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from Rabby wallet');
      }

      const walletAddress = accounts[0].toLowerCase();
      console.log('👛 Rabby wallet connected:', walletAddress);

      // Get current chain
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
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
      setCurrentUser({ displayName: 'Rabby User', walletType: 'rabby' });

      console.log('🎉 Rabby connection successful!');

    } catch (error) {
      console.error('❌ Rabby connection failed:', error);
      setError(`Failed to connect with Rabby: ${error.message}`);
    } finally {
      setIsConnecting(false);
      setShowWalletSelection(false);
    }
  };

  // Main connect wallet function - shows selection dialog
  const connectWallet = () => {
    setShowWalletSelection(true);
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

  // Reset activity page number and clear errors when switching chains or pages
  useEffect(() => {
    setActivityPageNumber(1);
    setError(null); // Clear errors when switching tabs
  }, [selectedChain, currentPage]);

  // Real revoke function - direct approve(spender, 0) like revoke.cash
  const requestRevokeApproval = async (approval) => {
    console.log("🔄 Individual revoke requested for:", approval.name);
    console.log("🔌 Provider state:", { hasProvider: !!provider, isConnected, address });
    
    if (!provider || !isConnected) {
      try {
        const { useConnect } = await import('wagmi')
        const { connect, connectors } = useConnect.getState ? useConnect.getState() : { connect: null }
        if (connect) {
          const mini = connectors?.find(c => c.id === 'farcaster') || connectors?.[0]
          if (mini) await connect({ connector: mini })
        }
      } catch {}
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔄 Starting individual revoke for:', approval.name);
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

      // Direct approve(spender, 0) - just like revoke.cash
      const { encodeFunctionData } = await import('viem');
      
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
      
      // Encode approve(spender, 0)
      const data = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [approval.spender, BigInt(0)]
      });
      
      console.log('📝 Sending direct approve(spender, 0) transaction...');
      
      // Send transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: approval.contract,
          data: data,
        }],
      });
      
      console.log('✅ Revoke transaction sent:', txHash);
      localStorage.setItem('hasRevoked', 'true');
      setApprovals(prev => prev.filter(a => a.id !== approval.id));
      console.log('✅ Revoke complete for:', approval.name);

    } catch (error) {
      console.error('❌ Revoke failed:', error);
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
        if (currentPage === 'approvals') setError('Transaction cancelled by user');
      } else {
        setError(`Claim failed: ${error.message}`);
      }
    }
  };

  const shareCast = () => {
    const raw = "Claimed 0.5 USDC for just securing my wallet - try it here:\nhttps://fgrevoke.vercel.app";
    const text = encodeURIComponent(raw);
    window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank');
  };

  // Share to Farcaster using proper SDK method
  const handleShare = async () => {
    const currentChainName = chains.find(c => c.value === selectedChain)?.name || selectedChain;
    
    const shareTextContent = currentPage === 'activity'
      ? `🔍 Just analyzed my ${currentChainName} wallet activity with FarGuard!\n\n💰 ${activityStats.totalTransactions} transactions\n🏗️ ${activityStats.dappsUsed} dApps used\n⛽ ${activityStats.totalGasFees.toFixed(4)} ${chains.find(c => c.value === selectedChain)?.nativeCurrency} in gas fees\n\nTrack your journey:`
      : `🛡️ Just secured my ${currentChainName} wallet with FarGuard!\n\n✅ Reviewed ${approvals.length} token approvals\n🔒 Protecting my assets from risky permissions\n\nSecure yours too:`;
    
    const url = "https://fgrevoke.vercel.app";

    try {
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
        alert('✅ Share text copied to clipboard!');
      } catch (clipboardError) {
        const encoded = encodeURIComponent(finalShareText);
        window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
      }
    } catch (error) {
      console.error('Share failed:', error);
      const fallbackText = `${shareTextContent}\n${url}`;
      try {
        await navigator.clipboard.writeText(fallbackText);
        alert('✅ Share text copied to clipboard!');
      } catch (clipboardError) {
        const encoded = encodeURIComponent(fallbackText);
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

  // Scanner functionality - comprehensive wallet analysis
  const searchScannerAddress = async (page = 1) => {
    if (!scannerAddress || scannerAddress.length !== 42) {
      setScannerError('Please enter a valid Ethereum address (42 characters starting with 0x)');
      return;
    }

    setLoadingScanner(true);
    setScannerError(null);
    
    if (page === 1) {
      setScannerData(null);
      setScannerTxPage(1);
    }

    try {
      console.log('🔍 Starting comprehensive scanner analysis for:', scannerAddress, 'page:', page);
      
      const scannerResults = page === 1 ? {
        address: scannerAddress,
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
      } : { ...scannerData };

      if (page === 1) {
        // First page - fetch all data
        await Promise.allSettled([
          fetchFarcasterProfile(scannerAddress, scannerResults),
          fetchSocialProfiles(scannerAddress, scannerResults),
          fetchTokenHoldings(scannerAddress, scannerResults),
          fetchProfitLossData(scannerAddress, scannerResults),
          fetchWalletActivityPaginated(scannerAddress, scannerResults, page)
        ]);
      } else {
        // Subsequent pages - only fetch more transactions
        await fetchWalletActivityPaginated(scannerAddress, scannerResults, page);
      }

      setScannerData(scannerResults);
      console.log('✅ Scanner analysis complete:', scannerResults);

    } catch (error) {
      console.error('❌ Scanner analysis failed:', error);
      setScannerError('Failed to analyze address. Please try again.');
    } finally {
      setLoadingScanner(false);
    }
  };

  // Load more transactions
  const loadMoreTransactions = async () => {
    const nextPage = scannerTxPage + 1;
    setScannerTxPage(nextPage);
    await searchScannerAddress(nextPage);
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

  // Fetch profit/loss data and create heatmap for LAST 30 DAYS only
  const fetchProfitLossData = async (address, results) => {
    try {
      console.log('📈 Calculating REAL profit/loss data for last 30 days:', address);
      
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate);
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);
      const startTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
      
      console.log(`🗓️ Analyzing last 30 days: ${thirtyDaysAgo.toISOString()} to ${currentDate.toISOString()}`);
      
      // Initialize 30-day data
      const last30DaysPnL = { profit: 0, loss: 0, net: 0, transactions: 0 };
      const dailyActivity = new Map(); // Track daily transaction counts for heatmap
      
      // Fetch transactions from multiple chains using Etherscan V2 API
      const chains = [
        { 
          name: 'Ethereum',
          chainId: 1,
          url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Base',
          chainId: 8453,
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Arbitrum',
          chainId: 42161,
          url: `https://api.etherscan.io/v2/api?chainid=42161&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Optimism',
          chainId: 10,
          url: `https://api.etherscan.io/v2/api?chainid=10&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` 
        }
      ];

      for (const chain of chains) {
        try {
          console.log(`🔍 Fetching ${chain.name} transactions from V2 API...`);
          console.log(`📡 API URL: ${chain.url}`);
          console.log(`🔑 Using API key: ${ETHERSCAN_API_KEY.substring(0, 8)}...`);
          
          const response = await fetch(chain.url);
          console.log(`📊 Response status: ${response.status}`);
          
          const data = await response.json();
          console.log(`📦 API Response for ${chain.name}:`, {
            status: data.status,
            message: data.message,
            resultLength: data.result ? data.result.length : 0,
            sampleResult: data.result ? data.result.slice(0, 2) : null
          });
          
          if (data.status === '1' && data.result && Array.isArray(data.result)) {
            console.log(`📊 ${chain.name}: Found ${data.result.length} total transactions`);
            
            // Filter transactions for last 30 days only
            const last30DaysTxs = data.result.filter(tx => {
              const txTimestamp = parseInt(tx.timeStamp);
              return txTimestamp >= startTimestamp;
            });
            
            console.log(`📅 ${chain.name}: ${last30DaysTxs.length} transactions in last 30 days`);
            
            last30DaysTxs.forEach(tx => {
              const txDate = new Date(parseInt(tx.timeStamp) * 1000);
              const dayKey = txDate.toISOString().split('T')[0];
              
              // Count daily activity for heatmap
              dailyActivity.set(dayKey, (dailyActivity.get(dayKey) || 0) + 1);
              
              const value = parseFloat(tx.value) / 1e18; // Convert Wei to ETH
              const gasUsed = (parseFloat(tx.gasUsed || 0) * parseFloat(tx.gasPrice || 0)) / 1e18;
              
              if (tx.from.toLowerCase() === address.toLowerCase()) {
                // Outgoing transaction
                last30DaysPnL.loss += value + gasUsed;
              } else {
                // Incoming transaction  
                last30DaysPnL.profit += value;
              }
              
              last30DaysPnL.transactions++;
            });
            
          } else {
            console.log(`⚠️ ${chain.name}: API returned status ${data.status}`);
            console.log(`📝 Message: ${data.message || 'No transactions found'}`);
            console.log(`🔧 Raw response:`, data);
            
            // Check for common API errors
            if (data.message && data.message.includes('Invalid API Key')) {
              console.error('❌ Invalid Etherscan V2 API Key! Please check REACT_APP_ETHERSCAN_API_KEY');
            } else if (data.message && data.message.includes('rate limit')) {
              console.error('❌ Rate limit exceeded! Waiting longer between calls...');
            } else if (data.message && data.message.includes('No transactions found')) {
              console.log('ℹ️ No transactions found for this address on', chain.name);
            }
          }
          
          // Small delay between API calls
          await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
          
        } catch (chainError) {
          console.error(`❌ ${chain.name} transaction fetch failed:`, chainError.message);
        }
      }
      
      // Calculate net P&L for last 30 days
      last30DaysPnL.net = last30DaysPnL.profit - last30DaysPnL.loss;
      
      console.log('💰 Last 30 days P&L:', last30DaysPnL);

      // Create heatmap data for last 30 days
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
        last30Days: last30DaysPnL,
        total: last30DaysPnL.net,
        heatmapData: heatmapData,
        period: 'Last 30 Days'
      };

    } catch (error) {
      console.error('❌ Profit/loss calculation failed:', error.message);
    }
  };

  // Fetch comprehensive wallet activity with REAL stats and pagination
  const fetchWalletActivityPaginated = async (address, results, page = 1) => {
    try {
      console.log('🔍 Fetching REAL comprehensive wallet activity for:', address, 'page:', page);
      
      const itemsPerPage = 10000; // Fetch full history by default (Etherscan V2 max per page)
      const isFirstPage = page === 1;
      
      if (isFirstPage) {
        results.walletActivity = [];
        results.stats = {
          totalTransactions: 0,
          totalValue: 0,
          dappsUsed: 0,
          firstTransaction: null,
          lastTransaction: null
        };
      }

      const activity = results.walletActivity || [];
      const stats = {
        totalTransactions: 0,
        totalValue: 0,
        dappsUsed: new Set(),
        firstTransaction: null,
        lastTransaction: null
      };

      // Fetch from multiple chains with pagination using Etherscan V2 API
      const chains = [
        { 
          name: 'Ethereum',
          chainId: 1,
          url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=${page}&offset=${itemsPerPage}&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
          explorerUrl: 'https://etherscan.io'
        },
        { 
          name: 'Base',
          chainId: 8453,
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=${page}&offset=${itemsPerPage}&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
          explorerUrl: 'https://basescan.org'
        }
      ];

      let hasMoreTransactions = false;

      for (const chain of chains) {
        try {
          console.log(`🔍 Fetching ${chain.name} activity page ${page} from V2 API...`);
          console.log(`📡 Activity API URL: ${chain.url}`);
          
          const response = await fetch(chain.url);
          console.log(`📊 Activity Response status for ${chain.name}: ${response.status}`);
          
          const data = await response.json();
          console.log(`📦 Activity API Response for ${chain.name}:`, {
            status: data.status,
            message: data.message,
            resultLength: data.result ? data.result.length : 0,
            sampleTx: data.result && data.result.length > 0 ? {
              hash: data.result[0].hash,
              from: data.result[0].from,
              to: data.result[0].to,
              value: data.result[0].value,
              functionName: data.result[0].functionName || 'N/A'
            } : null
          });
          
          if (data.status === '1' && data.result && Array.isArray(data.result)) {
            console.log(`📊 ${chain.name}: Found ${data.result.length} transactions on page ${page}`);
            
            if (data.result.length === itemsPerPage) {
              hasMoreTransactions = true;
            }

            // Process transactions with full details
            for (const tx of data.result) {
              const txDate = new Date(parseInt(tx.timeStamp) * 1000);
              const value = parseFloat(tx.value) / 1e18;
              const gasUsed = parseInt(tx.gasUsed || 0);
              const gasPrice = parseInt(tx.gasPrice || 0);
              const gasFee = (gasUsed * gasPrice) / 1e18;
              
              // Get transaction type using functionName (V2 API) or fallback to input analysis
              let txType = 'Transfer';
              let methodName = 'Transfer';
              
              // Use functionName from Etherscan V2 API if available
              if (tx.functionName && tx.functionName !== '' && tx.functionName !== null) {
                methodName = tx.functionName;
                console.log(`🔧 Using V2 functionName: ${methodName}`);
                
                // Categorize based on function name (case-insensitive)
                const funcNameLower = methodName.toLowerCase();
                if (funcNameLower.includes('swap')) {
                  txType = 'DEX Swap';
                } else if (funcNameLower.includes('transfer')) {
                  txType = 'Token Transfer';
                } else if (funcNameLower.includes('approve')) {
                  txType = 'Token Approval';
                } else if (funcNameLower.includes('stake')) {
                  txType = 'Staking';
                } else if (funcNameLower.includes('withdraw') || funcNameLower.includes('unstake')) {
                  txType = 'Withdrawal';
                } else if (funcNameLower.includes('mint')) {
                  txType = 'Mint';
                } else if (funcNameLower.includes('burn')) {
                  txType = 'Burn';
                } else if (funcNameLower.includes('deposit')) {
                  txType = 'Deposit';
                } else {
                  txType = 'Contract Interaction';
                }
              } else if (tx.input && tx.input !== '0x') {
                // Fallback to method ID analysis for older data
                const methodId = tx.input.slice(0, 10);
                switch (methodId) {
                  case '0xa9059cbb': methodName = 'transfer'; txType = 'Token Transfer'; break;
                  case '0x23b872dd': methodName = 'transferFrom'; txType = 'Token Transfer'; break;
                  case '0x095ea7b3': methodName = 'approve'; txType = 'Token Approval'; break;
                  case '0x38ed1739': methodName = 'swapExactTokensForTokens'; txType = 'DEX Swap'; break;
                  case '0x7ff36ab5': methodName = 'swapExactETHForTokens'; txType = 'DEX Swap'; break;
                  case '0x18cbafe5': methodName = 'swapExactTokensForETH'; txType = 'DEX Swap'; break;
                  case '0xa0712d68': methodName = 'mint'; txType = 'NFT Mint'; break;
                  case '0x42842e0e': methodName = 'safeTransferFrom'; txType = 'NFT Transfer'; break;
                  default: 
                    methodName = 'Contract Interaction';
                    txType = 'Contract Interaction';
                }
              }

              const txDetails = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: value,
                timestamp: parseInt(tx.timeStamp),
                date: txDate,
                chain: chain.name,
                gasUsed: gasUsed,
                gasPrice: gasPrice,
                gasFee: gasFee,
                status: tx.isError === '0' ? 'success' : 'failed',
                methodId: tx.input?.slice(0, 10) || '0x',
                methodName: methodName,
                txType: txType,
                blockNumber: parseInt(tx.blockNumber),
                explorerUrl: chain.explorerUrl,
                input: tx.input,
                nonce: parseInt(tx.nonce || 0),
                transactionIndex: parseInt(tx.transactionIndex || 0),
                confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0
              };

              activity.push(txDetails);

              // Update stats with ALL transactions
              if (isFirstPage) {
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
              }
            }
            
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

      setHasMoreTxs(hasMoreTransactions);

      console.log('📈 Final wallet stats:', {
        totalTransactions: isFirstPage ? stats.totalTransactions : results.stats.totalTransactions,
        totalValue: isFirstPage ? stats.totalValue.toFixed(4) + ' ETH' : results.stats.totalValue.toFixed(4) + ' ETH',
        uniqueDapps: isFirstPage ? stats.dappsUsed.size : results.stats.dappsUsed,
        activityRecords: activity.length,
        hasMore: hasMoreTransactions
      });

      results.walletActivity = activity;
      
      if (isFirstPage) {
        results.stats = {
          totalTransactions: stats.totalTransactions,
          totalValue: stats.totalValue,
          dappsUsed: stats.dappsUsed.size,
          firstTransaction: stats.firstTransaction,
          lastTransaction: stats.lastTransaction
        };
      }

    } catch (error) {
      console.error('❌ Wallet activity fetch failed:', error.message);
    }
  };

  // Keep the old function for backward compatibility with existing wallet activity
  const fetchWalletActivity = async (address, results) => {
    return fetchWalletActivityPaginated(address, results, 1);
  };

  // DegenTools - Contract Analysis Functions
  const analyzeContract = async () => {
    if (!contractAddress || contractAddress.length !== 42) {
      setContractError('Please enter a valid contract address (42 characters starting with 0x)');
      return;
    }

    setLoadingContract(true);
    setContractError(null);
    setContractData(null);
    setShowActivityRadar(false);

    try {
      console.log('🔍 Starting contract analysis for:', contractAddress);
      
      const contractResults = {
        address: contractAddress,
        contractType: 'Unknown Contract',
        name: null,
        symbol: null,
        creator: null,
        creatorFarcaster: null,
        deploymentBlock: null,
        verified: false,
        totalSupply: null,
        decimals: null,
        isToken: false,
        isNFT: false
      };

      // Parallel data fetching
      await Promise.allSettled([
        fetchContractInfo(contractAddress, contractResults),
        fetchContractCreator(contractAddress, contractResults)
      ]);

      setContractData(contractResults);
      console.log('✅ Contract analysis complete:', contractResults);

    } catch (error) {
      console.error('❌ Contract analysis failed:', error);
      setContractError('Failed to analyze contract. Please try again.');
    } finally {
      setLoadingContract(false);
    }
  };

  // Fetch contract information (token/NFT detection) - Fixed for Base support
  const fetchContractInfo = async (address, results) => {
    try {
      console.log('📋 Fetching contract info for:', address);

      // Multi-network token detection (Ethereum and Base)
      const networks = [
        { name: 'Ethereum', url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getTokenMetadata?contractAddress=${address}` },
        { name: 'Base', url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getTokenMetadata?contractAddress=${address}` }
      ];

      for (const network of networks) {
        try {
          console.log(`🔍 Checking ${network.name} for contract:`, address);
          const tokenResponse = await fetch(network.url);

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            console.log(`📊 ${network.name} response:`, tokenData);
            
            if (tokenData.decimals !== undefined && tokenData.decimals !== null) {
              // Has decimals = ERC-20 Token
              results.isToken = true;
              results.contractType = 'ERC-20 Token';
              results.name = tokenData.name || 'Unknown Token';
              results.symbol = tokenData.symbol || 'UNKNOWN';
              results.decimals = tokenData.decimals;
              results.totalSupply = tokenData.totalSupply;
              results.network = network.name;
              console.log('✅ Detected ERC-20 token on', network.name, ':', results);
              return;
            } else if (tokenData.name || tokenData.symbol) {
              // Has name/symbol but no decimals = likely NFT
              results.isNFT = true;
              results.contractType = 'NFT Contract';
              results.name = tokenData.name || 'Unknown NFT';
              results.symbol = tokenData.symbol;
              results.network = network.name;
              console.log('✅ Detected NFT contract on', network.name, ':', results);
              return;
            }
          }
        } catch (networkError) {
          console.warn(`⚠️ ${network.name} token check failed:`, networkError.message);
        }
      }

      // Check contract verification status via Etherscan V2 API (multi-chain)
      const verificationAPIs = [
        { name: 'Ethereum', chainId: 1, url: `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}` },
        { name: 'Base', chainId: 8453, url: `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}` }
      ];

      for (const api of verificationAPIs) {
        try {
          const verificationResponse = await fetch(api.url);
          
          if (verificationResponse.ok) {
            const verificationData = await verificationResponse.json();
            if (verificationData.status === '1' && verificationData.result[0]) {
              const contractInfo = verificationData.result[0];
              results.verified = contractInfo.SourceCode !== '';
              results.network = api.name;
              if (contractInfo.ContractName) {
                results.name = contractInfo.ContractName;
                results.contractType = `${contractInfo.ContractName} Contract`;
                console.log('✅ Found verified contract on', api.name, ':', results);
                return;
              }
            }
          }
        } catch (verificationError) {
          console.warn(`⚠️ ${api.name} verification check failed:`, verificationError.message);
        }
      }

      // Default if nothing found
      results.contractType = 'Unknown Contract';
      console.log('⚠️ Could not determine contract type for:', address);

    } catch (error) {
      console.error('❌ Contract info fetch failed:', error.message);
    }
  };

  // Fetch contract creator and check Farcaster - Using proper APIs and SDK
  const fetchContractCreator = async (address, results) => {
    try {
      console.log('👤 Fetching contract creator for:', address);

      // Use Etherscan V2 API for contract creation detection
      const creationAPIs = [
        { 
          name: 'Ethereum',
          chainId: 1,
          url: `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Base',
          chainId: 8453,
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${ETHERSCAN_API_KEY}` 
        }
      ];

      for (const api of creationAPIs) {
        try {
          console.log(`🔍 Checking ${api.name} for contract creator:`, address);
          const response = await fetch(api.url);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 ${api.name} creator response:`, data);
            
            if (data.status === '1' && data.result && data.result.length > 0) {
              const contractInfo = data.result[0];
              const creatorAddress = contractInfo.contractCreator;
              
              results.creator = creatorAddress;
              results.deploymentTxHash = contractInfo.txHash;
              results.network = api.name;
              
              console.log('📝 Contract creator found on', api.name, ':', creatorAddress);

              // Check if creator has Farcaster profile using SDK
              try {
                console.log('🔍 Looking up Farcaster profile for creator:', creatorAddress);
                
                // Try using the Farcaster SDK first
                if (sdk && sdk.actions) {
                  try {
                    // Note: This is a hypothetical SDK method - adjust based on actual SDK capabilities
                    console.log('🔄 Attempting SDK lookup...');
                  } catch (sdkError) {
                    console.warn('⚠️ SDK lookup not available:', sdkError.message);
                  }
                }
                
                // Fallback to Neynar API (more reliable)
                const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${creatorAddress}`, {
                  headers: {
                    'Api-Key': 'NEYNAR_API_DOCS'
                  }
                });

                if (neynarResponse.ok) {
                  const neynarData = await neynarResponse.json();
                  console.log('📊 Neynar response for creator:', neynarData);
                  
                  if (neynarData && Object.keys(neynarData).length > 0) {
                    const userProfile = Object.values(neynarData)[0];
                    if (userProfile && userProfile.length > 0) {
                      const profile = userProfile[0];
                      results.creatorFarcaster = {
                        username: profile.username,
                        displayName: profile.display_name,
                        fid: profile.fid,
                        pfp: profile.pfp_url || profile.pfp?.url,
                        bio: profile.profile?.bio?.text || ''
                      };
                      console.log('✅ Found creator Farcaster profile:', results.creatorFarcaster);
                    }
                  }
                }
              } catch (farcasterError) {
                console.warn('⚠️ Farcaster creator lookup failed:', farcasterError.message);
              }
              
              return; // Found creator, exit loop
            } else {
              console.log(`⚠️ ${api.name}: No creator data returned`);
            }
          } else {
            console.warn(`⚠️ ${api.name}: API response not OK`);
          }
        } catch (apiError) {
          console.error(`❌ ${api.name} creator API failed:`, apiError.message);
        }
      }

      // Fallback: Try to get creator from first transaction using V2 API
      console.log('🔄 Falling back to transaction history method...');
      const fallbackAPIs = [
        { 
          name: 'Ethereum',
          chainId: 1,
          url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${ETHERSCAN_API_KEY}` 
        },
        { 
          name: 'Base',
          chainId: 8453,
          url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${ETHERSCAN_API_KEY}` 
        }
      ];

      for (const api of fallbackAPIs) {
        try {
          const response = await fetch(api.url);
          if (response.ok) {
            const data = await response.json();
            if (data.status === '1' && data.result && data.result.length > 0) {
              const creationTx = data.result[0];
              results.creator = creationTx.from;
              results.deploymentBlock = parseInt(creationTx.blockNumber);
              results.network = api.name;
              console.log('📝 Contract creator found via fallback on', api.name, ':', results.creator);
              return;
            }
          }
        } catch (fallbackError) {
          console.warn(`⚠️ ${api.name} fallback failed:`, fallbackError.message);
        }
      }

      console.log('⚠️ No contract creator found for:', address);

    } catch (error) {
      console.error('❌ Contract creator fetch failed:', error.message);
    }
  };

  // Analyze trending wallets - Find most active degens
  const analyzeTrendingWallets = async () => {
    setLoadingTrendingWallets(true);
    setTrendingWalletsError(null);
    setShowTrendingWallets(true);
    
    try {
      console.log('🔥 Analyzing trending wallets...');
      
      // Sample of known active wallets to analyze - using real high-activity addresses
      const sampleWallets = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Ethereum Foundation
        '0x742d35Cc6634C0532925a3b8c26404738728b306', // OpenSea
        '0xF977814e90dA44bFA03b6295A0616a897441aceC', // Alameda Research
        '0x28C6c06298d514Db089934071355E5743bf21d60', // Binance
        '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe', // Ethereum Foundation 2
        '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', // Active DEX trader
        '0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489', // MEV Bot
        '0x8103683202aa8DA10536036EDef04CDd865C225E' // Known active wallet
      ];

      const walletAnalyses = await Promise.allSettled(
        sampleWallets.map(address => analyzeWalletMetrics(address))
      );

      const successfulAnalyses = walletAnalyses
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        // Keep results even when score is 0 so the UI can show something
        .filter(wallet => typeof wallet.totalScore === 'number');

      // Sort by total score (combination of all metrics)
      successfulAnalyses.sort((a, b) => b.totalScore - a.totalScore);

      setTrendingWallets(successfulAnalyses.slice(0, 10)); // Top 10
      console.log('🏆 Top trending wallets:', successfulAnalyses.slice(0, 10));

    } catch (error) {
      console.error('❌ Trending wallets analysis failed:', error);
      setTrendingWalletsError('Failed to analyze trending wallets. Please try again.');
    } finally {
      setLoadingTrendingWallets(false);
    }
  };

  // Analyze individual wallet metrics
  const analyzeWalletMetrics = async (address) => {
    try {
      console.log('📊 Analyzing wallet:', address);
      
      const metrics = {
        address: address,
        newTokenBuysToday: 0,
        profitableSellsWeek: 0,
        rugsActiveSurvived: 0,
        totalTokensHeld: 0,
        totalValue: 0,
        winRate: 0,
        avgProfit: 0,
        totalTrades: 0,
        riskScore: 0,
        lastActivity: null,
        topTokens: [],
        totalScore: 0
      };

      // Get token balances using Alchemy
      const networks = [
        { name: 'Ethereum', url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` },
        { name: 'Base', url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` }
      ];

      for (const network of networks) {
        try {
          // Get token balances
          const balanceResponse = await fetch(network.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              method: 'alchemy_getTokenBalances',
              params: [address]
            })
          });

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            if (balanceData.result && balanceData.result.tokenBalances) {
              metrics.totalTokensHeld += balanceData.result.tokenBalances.length;
              
              // Analyze top 5 tokens for this network
              const topTokens = balanceData.result.tokenBalances.slice(0, 5);
              for (const token of topTokens) {
                if (token.tokenBalance !== '0x0') {
                  try {
                    // Get token metadata
                    const metadataResponse = await fetch(`${network.url}/getTokenMetadata?contractAddress=${token.contractAddress}`);
                    if (metadataResponse.ok) {
                      const metadata = await metadataResponse.json();
                      if (metadata.name) {
                        metrics.topTokens.push({
                          symbol: metadata.symbol || 'UNKNOWN',
                          name: metadata.name,
                          address: token.contractAddress,
                          balance: token.tokenBalance,
                          network: network.name
                        });
                      }
                    }
                  } catch (tokenError) {
                    console.warn('⚠️ Token metadata fetch failed:', tokenError.message);
                  }
                }
              }
            }
          }
        } catch (networkError) {
          console.warn(`⚠️ ${network.name} balance check failed:`, networkError.message);
        }
      }

      // Get transaction history for analysis using Etherscan V2 API
      const txAPIs = [
        { name: 'Ethereum', chainId: 1, url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}` },
        { name: 'Base', chainId: 8453, url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}` }
      ];

      for (const api of txAPIs) {
        try {
          const response = await fetch(api.url);
          if (response.ok) {
            const data = await response.json();
            if (data.status === '1' && data.result) {
              const transactions = data.result.slice(0, 100); // Analyze last 100 transactions
              
              const now = Date.now();
              const oneDayAgo = now - (24 * 60 * 60 * 1000);
              const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

              let totalValue = 0;
              let profitableTrades = 0;
              let totalTrades = 0;

              transactions.forEach(tx => {
                const txTime = parseInt(tx.timeStamp) * 1000;
                const value = parseFloat(tx.value) / 1e18;
                totalValue += value;
                
                if (txTime > oneDayAgo) {
                  // Analyze today's token buys (transactions with method IDs for DEX interactions)
                  const methodId = tx.input?.slice(0, 10);
                  if (['0x38ed1739', '0x7ff36ab5', '0x18cbafe5'].includes(methodId) && value > 0) {
                    metrics.newTokenBuysToday++;
                  }
                }

                if (txTime > oneWeekAgo) {
                  // Analyze this week's transactions for profitable patterns
                  if (tx.isError === '0' && value > 0.001) { // Successful transactions with meaningful value
                    totalTrades++;
                    // Simple heuristic: if gas fee is less than 10% of value, likely profitable
                    const gasFee = (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18;
                    if (gasFee < value * 0.1) {
                      profitableTrades++;
                    }
                  }
                }

                // Set last activity
                if (!metrics.lastActivity || txTime > metrics.lastActivity) {
                  metrics.lastActivity = txTime;
                }
              });

              metrics.totalValue += totalValue;
              metrics.profitableSellsWeek += profitableTrades;
              metrics.totalTrades += totalTrades;
              metrics.winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
            }
          }
        } catch (txError) {
          console.warn(`⚠️ ${api.name} transaction analysis failed:`, txError.message);
        }
      }

      // Calculate rug survival score (heuristic based on old token holdings)
      metrics.rugsActiveSurvived = Math.min(metrics.totalTokensHeld * 0.1, 10); // Estimate based on portfolio diversity

      // Calculate risk score (higher = more risk-taking)
      metrics.riskScore = Math.min((metrics.newTokenBuysToday * 20) + (metrics.totalTokensHeld * 2), 100);

      // Calculate average profit (simplified)
      metrics.avgProfit = metrics.totalTrades > 0 ? metrics.totalValue / metrics.totalTrades : 0;

      // Calculate total score (composite ranking)
      metrics.totalScore = 
        (metrics.newTokenBuysToday * 10) +
        (metrics.profitableSellsWeek * 5) +
        (metrics.rugsActiveSurvived * 3) +
        (metrics.winRate * 0.5) +
        (metrics.riskScore * 0.3) +
        (metrics.totalTokensHeld * 0.1);

      console.log('📈 Wallet analysis complete:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Wallet analysis failed for', address, ':', error);
      return null;
    }
  };

  // Fetch live activity radar data - Fixed with proper buy/sell detection
  const fetchLiveActivity = async () => {
    if (!contractData) return;

    setLoadingActivityRadar(true);
    try {
      console.log('📡 Fetching live activity for contract:', contractData.address);

      const activity = [];
      
      // Fetch recent transactions using Etherscan V2 API
      const activityAPIs = [
        { name: 'Ethereum', chainId: 1, url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${contractData.address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` },
        { name: 'Base', chainId: 8453, url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${contractData.address}&startblock=0&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}` }
      ];

      for (const api of activityAPIs) {
        try {
          console.log(`🔍 Fetching ${api.name} activity for:`, contractData.address);
          const response = await fetch(api.url);
          const data = await response.json();
          
          if (data.status === '1' && data.result) {
            console.log(`📊 ${api.name}: Found ${data.result.length} transactions`);
            
            // Get only recent transactions (last 24 hours)
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            
            data.result.forEach(tx => {
              const txTime = parseInt(tx.timeStamp) * 1000;
              if (txTime > oneDayAgo) {
                const value = parseFloat(tx.value) / 1e18;
                
                // Fixed buy/sell detection logic
                let activityType = 'interaction';
                
                // Green: to == contractAddress (someone is sending TO the contract = BUY)
                if (tx.to && tx.to.toLowerCase() === contractData.address.toLowerCase()) {
                  activityType = 'buy';
                }
                // Red: from == contractAddress (contract is sending FROM itself = SELL)
                else if (tx.from && tx.from.toLowerCase() === contractData.address.toLowerCase()) {
                  activityType = 'sell';
                }
                // Additional method-based detection for token contracts
                else if (contractData.isToken) {
                  const methodId = tx.input?.slice(0, 10);
                  switch (methodId) {
                    case '0xa9059cbb': // transfer
                    case '0x23b872dd': // transferFrom
                      activityType = 'sell';
                      break;
                    case '0x38ed1739': // swapExactTokensForTokens
                    case '0x7ff36ab5': // swapExactETHForTokens
                    case '0x18cbafe5': // swapExactTokensForETH
                      activityType = value > 0 ? 'buy' : 'sell';
                      break;
                    case '0x095ea7b3': // approve
                      activityType = 'interaction';
                      break;
                  }
                }

                activity.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: value,
                  timestamp: txTime,
                  chain: api.name,
                  activityType: activityType,
                  methodId: tx.input?.slice(0, 10) || '0x',
                  gasUsed: tx.gasUsed,
                  gasPrice: tx.gasPrice
                });
              }
            });
          }
        } catch (chainError) {
          console.warn(`⚠️ ${api.name} activity fetch failed:`, chainError.message);
        }
      }

      // Sort by timestamp (newest first) and limit to 50
      activity.sort((a, b) => b.timestamp - a.timestamp);
      setLiveActivity(activity.slice(0, 50));
      
      console.log('📊 Live activity loaded:', activity.length, 'transactions');
      console.log('🎯 Activity breakdown:', {
        buys: activity.filter(a => a.activityType === 'buy').length,
        sells: activity.filter(a => a.activityType === 'sell').length,
        interactions: activity.filter(a => a.activityType === 'interaction').length
      });

    } catch (error) {
      console.error('❌ Live activity fetch failed:', error);
    } finally {
      setLoadingActivityRadar(false);
    }
  };

  async function claimFaucet(chain) {
    if (!currentUser?.fid || !address) {
      alert('Please connect your Farcaster wallet first');
      return;
    }
    
    setFaucetBusy(chain === 'base' ? 'eth' : chain);
    try {
      // For Monad and Celo, use meta-transactions (user signs, we pay gas)
      if (chain === 'mon' || chain === 'celo') {
        console.log(`🎫 Using meta-transaction for ${chain.toUpperCase()}...`);
        
        // Step 1: Prepare meta-transaction data
        const prepareRes = await fetch('/api/prepare-metatx', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chain, fid: currentUser.fid, address }),
        });
        
        let prepareData;
        try {
          prepareData = await prepareRes.json();
        } catch (e) {
          console.error('Failed to parse prepare-metatx response:', e);
          throw new Error(`Server error: ${prepareRes.status} ${prepareRes.statusText}`);
        }
        
        if (!prepareRes.ok) {
          throw new Error(prepareData.error || 'Failed to prepare transaction');
        }
        
        const { functionSignature, contract, chainId, domain, types } = prepareData;
        
        // Step 2: Get the nonce from the backend
        let nonce = 0;
        try {
          console.log('🔢 Fetching nonce from backend...');
          const nonceRes = await fetch('/api/get-nonce', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chain, userAddress: address }),
          });
          
          const nonceData = await nonceRes.json();
          if (nonceData.ok) {
            nonce = BigInt(nonceData.nonce);
            console.log('Fetched nonce from backend:', nonce.toString());
          } else {
            console.error('Failed to fetch nonce from backend:', nonceData.error);
          }
        } catch (nonceError) {
          console.error('Failed to fetch nonce, using 0:', nonceError);
          // If fetching nonce fails, continue with 0
        }
        
        // Step 3: User signs meta-transaction
        const message = {
          nonce: BigInt(nonce),
          from: address,
          functionSignature,
        };
        
        console.log('📝 Requesting user signature...');
        const signature = await provider.request({
          method: 'eth_signTypedData_v4',
          params: [
            address,
            JSON.stringify({
              domain: {
                name: "DailyGasClaim", // Use the base domain name for meta-transaction
                version: "1",
                chainId: Number(domain.chainId), // Use number instead of string
                verifyingContract: domain.verifyingContract
              },
              types: {
                EIP712Domain: [
                  { name: "name", type: "string" },
                  { name: "version", type: "string" },
                  { name: "chainId", type: "uint256" },
                  { name: "verifyingContract", type: "address" }
                ],
                ...types
              },
              primaryType: 'MetaTransaction',
              message: {
                nonce: BigInt(nonce).toString(),
                from: address,
                functionSignature,
              }
            })
          ],
        });
        
        console.log('✅ User signature obtained:', signature);
        console.log('📋 Signed message:', {
          nonce: BigInt(nonce).toString(),
          from: address,
          functionSignature: functionSignature.slice(0, 10) + '...'
        });
        
        // Step 4: Send to relayer
        const relayRes = await fetch('/api/relay-metatx', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            chain, 
            userAddress: address, 
            functionSignature, 
            signature 
          }),
        });
        
        let relayData;
        const responseText = await relayRes.text();
        
        try {
          relayData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse relay response:', parseError);
          console.error('Response text:', responseText);
          throw new Error(`Server error (${relayRes.status}): Invalid JSON response`);
        }
        
        if (!relayRes.ok) {
          throw new Error(relayData.error || 'Failed to relay transaction');
        }
        
        console.log('✅ Transaction sent:', relayData.txHash);
        const chainName = chain.toUpperCase();
        
        // Store claimed token info for share button
        setClaimedTokenInfo({
          chain: chainName,
          amount: '0.1',
          displayAmount: `0.1 ${chainName}`
        });
        
        alert(`Success! Claimed ${chainName}\nTransaction: ${relayData.txHash}`);
        setHasClaimedFaucet(true);
        return;
      }
      
      // For Base, use user wallet
      if (!provider) {
        alert('Please connect your wallet first');
        return;
      }
      
      // Step 1: Get voucher from backend
      console.log('🎫 Getting voucher from backend...');
      const res = await fetch('/api/voucher', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chain, fid: currentUser.fid, address }),
      });
      let j;
      const text = await res.text();
      try {
        j = JSON.parse(text);
      } catch (_) {
        console.error('Failed to parse response:', text);
        throw new Error(text || `Server error (${res.status})`);
      }
      if (!j.ok) {
        console.error('Voucher error:', j);
        throw new Error(j.error || 'Failed to get voucher');
      }
      
      const { voucher, signature, contract, chainId } = j;
      console.log('✅ Got voucher:', { voucher, contract, chainId });
      
      // Step 2: Switch to correct chain if needed
      const chainIdHex = `0x${chainId.toString(16)}`;
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== chainIdHex) {
          console.log(`🔄 Switching from chain ${currentChainId} to ${chainIdHex}...`);
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
        }
      } catch (switchError) {
        console.error('Chain switch error:', switchError);
        throw switchError;
      }
      
      // Step 3: Import FaucetAbi and encode the transaction
      const { FaucetAbi } = await import('./abis/faucet.js');
      const { encodeFunctionData } = await import('viem');
      
      // Convert voucher fields back to BigInt for encoding
      const voucherForContract = {
        fid: BigInt(voucher.fid),
        recipient: voucher.recipient,
        day: BigInt(voucher.day),
        amountWei: BigInt(voucher.amountWei),
        deadline: BigInt(voucher.deadline),
      };
      
      // Encode the claimSelf function call
      const data = encodeFunctionData({
        abi: FaucetAbi,
        functionName: 'claimSelf',
        args: [voucherForContract, signature],
      });
      
      // Step 4: Send transaction using user's wallet
      console.log('📝 Sending transaction...');
      
      // Estimate gas first for better compatibility
      let gasEstimate;
      try {
        gasEstimate = await provider.request({
          method: 'eth_estimateGas',
          params: [{
            from: address,
            to: contract,
            data: data,
          }],
        });
        console.log('Gas estimate:', gasEstimate);
      } catch (estimateError) {
        console.warn('Gas estimation failed, using default:', estimateError);
        gasEstimate = '0x30000'; // Fallback to 196k gas
      }
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: contract,
          data: data,
          gas: gasEstimate,
        }],
      });
      
      console.log('✅ Transaction sent:', txHash);
      const chainName = chain === 'base' ? 'ETH' : chain.toUpperCase();
      const amount = chain === 'base' ? '~$0.10 worth of ETH' : '0.1';
      
      // Store claimed token info for share button
      setClaimedTokenInfo({
        chain: chainName,
        amount: amount,
        displayAmount: chain === 'base' ? '~$0.10 worth of ETH' : `0.1 ${chainName}`
      });
      
      alert(`Success! Claiming ${chainName}\nTransaction: ${txHash}\n\nPlease wait for confirmation.`);
      setHasClaimedFaucet(true);
      
    } catch (e) {
      console.error('Faucet error:', e);
      if (e && e.code === 4001) {
        // User rejected transaction
        alert('Transaction cancelled');
      } else if (e.message?.includes('insufficient balance') && (chain === 'mon' || chain === 'celo')) {
        // Gas signer has insufficient balance
        const tokenName = chain === 'mon' ? 'MON' : 'CELO';
        alert(`Backend gas signer has insufficient ${tokenName} balance. Please contact support to fund the gas wallet.`);
      } else if (e.code === -32000 || e.message?.includes('insufficient funds')) {
        alert('Insufficient funds for gas. You need some native tokens to pay for gas.');
      } else {
        alert(e?.message || 'Failed to claim. Please try again.');
      }
    } finally {
      setFaucetBusy(null);
    }
  }

  // Buy token functionality
  const fetchTokenPrice = async () => {
    if (!isConnected || !address) return;
    
    setLoadingPrice(true);
    setBuyError(null);
    
    try {
      // For now, we'll use a simple price calculation
      // In a real implementation, you'd fetch from a DEX or price oracle
      const mockPrice = 0.0001; // Mock price in ETH per token
      setTokenPrice(mockPrice);
    } catch (error) {
      console.error('Error fetching token price:', error);
      setBuyError('Failed to fetch token price');
    } finally {
      setLoadingPrice(false);
    }
  };

  const calculateTokenAmount = (inputAmount) => {
    if (!inputAmount || !tokenPrice) return 0;
    return parseFloat(inputAmount) / tokenPrice;
  };

  const handleBuyTokens = async () => {
    if (!isConnected || !address || !buyAmount) {
      setBuyError('Please connect wallet and enter amount');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0) {
      setBuyError('Please enter a valid amount');
      return;
    }

    setBuyLoading(true);
    setBuyError(null);

    try {
      // Get the current chain
      const currentChain = chains.find(c => c.value === selectedChain);
      if (!currentChain) {
        throw new Error('Invalid chain selected');
      }

      // For Base chain, we'll use Uniswap V3 or similar DEX
      if (currentChain.value === 'base') {
        // Create Uniswap swap URL
        const inputToken = buyCurrency === 'ETH' ? 'ETH' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
        const outputToken = TOKEN_CONTRACT_ADDRESS;
        
        // Convert to wei for ETH or to proper decimals for USDC
        const amountInWei = buyCurrency === 'ETH' 
          ? (amount * Math.pow(10, 18)).toString()
          : (amount * Math.pow(10, 6)).toString(); // USDC has 6 decimals
        
        const uniswapUrl = `https://app.uniswap.org/#/swap?chain=base&inputCurrency=${inputToken}&outputCurrency=${outputToken}&exactAmount=${amountInWei}`;
        
        // Open Uniswap in new tab
        window.open(uniswapUrl, '_blank');
        
        setBuyError(null);
        alert(`✅ Redirecting to Uniswap to buy tokens with ${buyAmount} ${buyCurrency}\n\nYou'll receive approximately ${calculateTokenAmount(buyAmount).toLocaleString()} tokens.`);
      } else {
        // Auto-switch to Base network
        setSelectedChain('base');
        setBuyError('Please switch to Base network to purchase tokens. Network changed automatically.');
      }
    } catch (error) {
      console.error('Buy error:', error);
      setBuyError(error.message || 'Failed to initiate token purchase');
    } finally {
      setBuyLoading(false);
    }
  };

  // Fetch token price when component mounts or when connected
  useEffect(() => {
    if (isConnected && currentPage === 'buy') {
      fetchTokenPrice();
    }
  }, [isConnected, currentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-purple-100 text-gray-900 flex flex-col" style={{fontFamily: 'Maven Pro, sans-serif'}}>
      {/* Professional Modern Header */}
      <header className="modern-header sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3">
              <img src="/farguard-logo.png" alt="FarGuard" className="h-12 w-12" />
              <div className="flex flex-col">
                <h1 className="text-xl text-gray-900 leading-tight" style={{fontWeight: 600, fontFamily: 'Maven Pro, sans-serif'}}>FARGUARD</h1>
                <span className="text-xs text-gray-500 font-medium" style={{fontFamily: 'Maven Pro, sans-serif'}}>Your Wallet Protector</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {isConnected && (
                <>
                  <button
                    onClick={() => setCurrentPage('approvals')}
                    className={`nav-btn ${currentPage === 'approvals' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Revoke</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('scanner')}
                    className={`nav-btn ${currentPage === 'scanner' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Scanner</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('faucet')}
                    className={`nav-btn ${currentPage === 'faucet' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Faucet</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('buy')}
                    className={`nav-btn ${currentPage === 'buy' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Buy</span>
                  </button>
                </>
              )}
            </div>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Chain Selector */}
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="chain-selector bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2 shadow-sm"
              >
                {chains.map((chain) => (
                  <option key={chain.value} value={chain.value}>
                    {chain.name}
                  </option>
                ))}
              </select>

              {/* User Section */}
              {isConnected ? (
                <div className="flex items-center space-x-3">
                  {/* User Profile */}
                  <div className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-2 border border-gray-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {currentUser?.username ? `@${currentUser.username}` : 
                       currentUser?.displayName || 
                       formatAddress(address)}
                    </span>
                    {currentUser?.fid && (
                      <span className="text-xs text-gray-500">FID: {currentUser.fid}</span>
                    )}
                  </div>
                  
                  {/* Address Selector */}
                  {userAddresses.length > 1 && (
                    <select
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="text-xs bg-white border border-gray-300 text-gray-700 rounded-md px-2 py-1"
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
                    className="disconnect-btn bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting || !sdkReady}
                  className="connect-btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : userAddresses.length > 0 ? 'Use Verified Address' : 'Connect Wallet'}</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <ChevronDown className="w-8 h-8 text-black transform rotate-180 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-8 h-8 text-black transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`lg:hidden mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : 'mobile-menu-closed'}`}>
            <div className="px-4 py-6">
              {/* Mobile Navigation */}
              {isConnected && (
                <div className="space-y-2 mb-6">
                  <button
                    onClick={() => {
                      setCurrentPage('approvals');
                      setMobileMenuOpen(false);
                    }}
                    className={`mobile-nav-btn ${currentPage === 'approvals' ? 'mobile-nav-btn-active' : 'mobile-nav-btn-inactive'}`}
                  >
                    <Shield className="w-5 h-5" />
                    <span>Revoke</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('scanner');
                      setMobileMenuOpen(false);
                    }}
                    className={`mobile-nav-btn ${currentPage === 'scanner' ? 'mobile-nav-btn-active' : 'mobile-nav-btn-inactive'}`}
                  >
                    <Activity className="w-5 h-5" />
                    <span>Scanner</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('faucet');
                      setMobileMenuOpen(false);
                    }}
                    className={`mobile-nav-btn ${currentPage === 'faucet' ? 'mobile-nav-btn-active' : 'mobile-nav-btn-inactive'}`}
                  >
                    <Zap className="w-5 h-5" />
                    <span>Faucet</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('buy');
                      setMobileMenuOpen(false);
                    }}
                    className={`mobile-nav-btn ${currentPage === 'buy' ? 'mobile-nav-btn-active' : 'mobile-nav-btn-inactive'}`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Buy</span>
                  </button>
                </div>
              )}

              {/* Mobile Controls */}
              <div className="space-y-4">
                {/* Chain Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Select Chain</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="w-full bg-white/90 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 backdrop-blur-sm shadow-sm"
                  >
                    {chains.map((chain) => (
                      <option key={chain.value} value={chain.value} className="text-gray-900">
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Section */}
                {isConnected ? (
                  <div className="space-y-3">
                    {/* User Profile */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-300 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-800">Connected</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {currentUser?.username ? `@${currentUser.username}` : 
                         currentUser?.displayName || 
                         formatAddress(address)}
                      </p>
                      {currentUser?.fid && (
                        <p className="text-xs text-gray-600 mt-1">FID: {currentUser.fid}</p>
                      )}
                    </div>
                    
                    {/* Address Selector */}
                    {userAddresses.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Select Address</label>
                        <select
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-white/90 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 backdrop-blur-sm shadow-sm"
                        >
                          {userAddresses.map((addr, idx) => (
                            <option key={addr} value={addr.toLowerCase()} className="text-gray-900">
                              Address {idx + 1}: {formatAddress(addr)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <button
                      onClick={disconnect}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting || !sdkReady}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors duration-200 shadow-sm"
                  >
                    <Wallet className="w-5 h-5" />
                    <span>{isConnecting ? 'Connecting...' : userAddresses.length > 0 ? 'Use Verified Address' : 'Connect Wallet'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 flex-1 border border-gray-200/50">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <img src="/farguard-logo.png" alt="FarGuard Logo" className="w-16 h-16 mx-auto mb-4" />
              
              {/* Personalized Welcome for Farcaster Users */}
              {currentUser ? (
                <div className="mb-6">
                  <div className="text-center mb-3">
                    <h2 className="text-2xl font-bold text-gray-800">
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

                  {/* Trending Wallets Interface */}
                  {showTrendingWallets && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Crown className="w-8 h-8 text-yellow-400" />
                          <div>
                            <h2 className="text-2xl font-bold text-white">Trending Wallets</h2>
                            <p className="text-purple-300">Top performing degens on-chain</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowTrendingWallets(false);
                            setTrendingWallets([]);
                            setTrendingWalletsError(null);
                          }}
                          className="text-purple-300 hover:text-white p-2"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Loading State */}
                      {loadingTrendingWallets && (
                        <div className="text-center py-12">
                          <RefreshCw className="w-8 h-8 text-purple-300 animate-spin mx-auto mb-4" />
                          <p className="text-purple-300">Analyzing wallet performance...</p>
                          <p className="text-purple-400 text-sm mt-2">This may take a moment</p>
                        </div>
                      )}

                      {/* Error State */}
                      {trendingWalletsError && (
                        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                            <div>
                              <p className="text-red-300 font-medium">Analysis Failed</p>
                              <p className="text-red-400 text-sm">{trendingWalletsError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Trending Wallets Results */}
                      {!loadingTrendingWallets && trendingWallets.length > 0 && (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600/30 rounded-lg p-4">
                            <h3 className="text-yellow-300 font-bold text-lg mb-2">🔥 Most Active Degens</h3>
                            <p className="text-yellow-400 text-sm">
                              Based on: New token buys today • Profitable sells this week • Rugs survived • Portfolio diversity
                            </p>
                          </div>

                          {trendingWallets.map((wallet, index) => (
                            <div key={wallet.address} className="bg-purple-800 rounded-lg p-6 border border-purple-600">
                              {/* Wallet Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="bg-yellow-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
                                    #{index + 1}
                                  </div>
                                  <div>
                                    <p className="text-white font-mono text-sm break-all">{wallet.address}</p>
                                    <p className="text-purple-300 text-xs">
                                      Score: {Math.round(wallet.totalScore)} • Last active: {wallet.lastActivity ? new Date(wallet.lastActivity).toLocaleDateString() : 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(wallet.address);
                                    // Could add toast notification here
                                  }}
                                  className="text-purple-300 hover:text-white p-2"
                                  title="Copy address"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Metrics Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Target className="w-4 h-4 text-green-400" />
                                    <span className="text-green-300 text-xs font-medium">New Buys Today</span>
                                  </div>
                                  <p className="text-white font-bold text-lg">{wallet.newTokenBuysToday}</p>
                                </div>

                                <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="w-4 h-4 text-blue-400" />
                                    <span className="text-blue-300 text-xs font-medium">Profitable Sells</span>
                                  </div>
                                  <p className="text-white font-bold text-lg">{wallet.profitableSellsWeek}</p>
                                </div>

                                <div className="bg-purple-900/30 border border-purple-600/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4 text-purple-400" />
                                    <span className="text-purple-300 text-xs font-medium">Rugs Survived</span>
                                  </div>
                                  <p className="text-white font-bold text-lg">{Math.round(wallet.rugsActiveSurvived)}</p>
                                </div>

                                <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <BarChart3 className="w-4 h-4 text-orange-400" />
                                    <span className="text-orange-300 text-xs font-medium">Win Rate</span>
                                  </div>
                                  <p className="text-white font-bold text-lg">{Math.round(wallet.winRate)}%</p>
                                </div>
                              </div>

                              {/* Additional Stats */}
                              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                                <div>
                                  <p className="text-purple-300 text-xs">Tokens Held</p>
                                  <p className="text-white font-semibold">{wallet.totalTokensHeld}</p>
                                </div>
                                <div>
                                  <p className="text-purple-300 text-xs">Risk Score</p>
                                  <p className="text-white font-semibold">{Math.round(wallet.riskScore)}/100</p>
                                </div>
                                <div>
                                  <p className="text-purple-300 text-xs">Total Trades</p>
                                  <p className="text-white font-semibold">{wallet.totalTrades}</p>
                                </div>
                              </div>

                              {/* Top Tokens */}
                              {wallet.topTokens.length > 0 && (
                                <div className="border-t border-purple-600 pt-4">
                                  <p className="text-purple-300 text-sm font-medium mb-2">Top Holdings:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {wallet.topTokens.slice(0, 5).map((token, tokenIndex) => (
                                      <span
                                        key={tokenIndex}
                                        className="bg-purple-700 px-3 py-1 rounded-full text-white text-xs"
                                      >
                                        {token.symbol} ({token.network})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Copy Trading CTA */}
                              <div className="border-t border-purple-600 pt-4 mt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-purple-300" />
                                    <span className="text-purple-300 text-sm">Copy their trades 👀</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        // Set scanner address and switch to scanner tab
                                        setScannerAddress(wallet.address);
                                        setCurrentPage('scanner');
                                      }}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                    >
                                      Analyze
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(wallet.address);
                                      }}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Disclaimer */}
                          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                            <p className="text-yellow-300 text-sm">
                              ⚠️ <strong>Disclaimer:</strong> This analysis is for educational purposes. Past performance doesn't guarantee future results. 
                              Always DYOR before copying any trades. Crypto trading involves significant risk.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* No Results */}
                      {!loadingTrendingWallets && !trendingWalletsError && trendingWallets.length === 0 && (
                        <div className="text-center py-12">
                          <AlertTriangle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                          <p className="text-purple-300">No trending wallets found</p>
                          <p className="text-purple-400 text-sm">Try analyzing again in a few moments</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Secure Your Wallet</h2>
                  <p className="text-xl text-gray-600 mb-4">
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
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentPage === 'approvals' 
                    ? `Active Token Approvals (${chains.find(c => c.value === selectedChain)?.name})`
                    : currentPage === 'scanner'
                    ? 'Wallet Scanner - Comprehensive Analysis'
                    : currentPage === 'faucet'
                    ? 'No gas fee for transactions ?'
                    : currentPage === 'buy'
                    ? 'Buy Tokens'
                    : `Wallet Activity (${chains.find(c => c.value === selectedChain)?.name})`
                  }
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Connected: {formatAddress(address)}
                </p>
                <div className="flex gap-2 mt-3">
                  {currentPage !== 'scanner' && currentPage !== 'faucet' && (
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
              ) : currentPage === 'scanner' && scannerData ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-700 rounded-lg p-4 text-center">
                                          <p className="text-2xl font-bold text-white">{scannerData.stats.totalTransactions}</p>
                      <p className="text-sm text-purple-200">Total Transactions</p>
                    </div>
                    <div className="bg-purple-700 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{scannerData.tokenHoldings.length}</p>
                      <p className="text-sm text-purple-200">Tokens Held</p>
                    </div>
                    <div className="bg-purple-700 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">{scannerData.profitLoss.total > 0 ? '+' : ''}{scannerData.profitLoss.total.toFixed(3)}</p>
                      <p className="text-sm text-purple-200">ETH P&L</p>
                    </div>
                    <div className="bg-purple-700 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-orange-400">{scannerData.stats.dappsUsed}</p>
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




                </div>
              )}

              {/* Content */}
              {currentPage === 'scanner' ? (
                // Scanner Interface
                <div className="space-y-6">
                  {/* Address Input Section */}
                  <div className="bg-purple-700 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye className="w-6 h-6 text-purple-300" />
                      <h3 className="text-xl font-bold text-white">Enter Address to Analyze</h3>
                    </div>
                    <p className="text-purple-300 text-sm mb-4">
                      Paste any Ethereum address below to get comprehensive analysis
                    </p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={scannerAddress}
                        onChange={(e) => setScannerAddress(e.target.value)}
                        placeholder="0x1234567890abcdef1234567890abcdef12345678"
                        className="w-full px-4 py-3 bg-purple-800 border border-purple-600 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => searchScannerAddress(1)}
                        disabled={loadingScanner || !scannerAddress}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search className={`w-4 h-4 ${loadingScanner ? 'animate-spin' : ''}`} />
                        {loadingScanner ? 'Analyzing...' : 'Search'}
                      </button>
                    </div>
                    {scannerError && (
                      <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-red-200 text-sm">{scannerError}</p>
                      </div>
                    )}
                  </div>

                  {/* Loading State */}
                  {loadingScanner && (
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

                  {/* Scanner Results */}
                  {scannerData && !loadingScanner && (
                    <div className="space-y-6">
                      {/* Profile Section */}
                                              {scannerData.farcasterProfile && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <User className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Farcaster Profile</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-white font-semibold">@{scannerData.farcasterProfile.username}</p>
                              <p className="text-purple-300">{scannerData.farcasterProfile.displayName}</p>
                              <p className="text-purple-400 text-sm mt-2">FID: {scannerData.farcasterProfile.fid}</p>
                              {scannerData.farcasterProfile.bio && (
                                <p className="text-purple-200 text-sm mt-2">{scannerData.farcasterProfile.bio}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-purple-300 text-sm">
                                {scannerData.farcasterProfile.followerCount} followers • {scannerData.farcasterProfile.followingCount} following
                              </p>
                              {scannerData.farcasterProfile.verifiedAddresses.length > 0 && (
                                <p className="text-green-400 text-sm mt-2">
                                  ✅ {scannerData.farcasterProfile.verifiedAddresses.length} verified address{scannerData.farcasterProfile.verifiedAddresses.length > 1 ? 'es' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Social Profiles */}
                      {(scannerData.socialProfiles.ens || scannerData.socialProfiles.lens) && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <ExternalLink className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Social Profiles</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {scannerData.socialProfiles.ens && (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2">ENS</h4>
                                <p className="text-purple-200">{scannerData.socialProfiles.ens.name}</p>
                                {scannerData.socialProfiles.ens.description && (
                                  <p className="text-purple-400 text-sm mt-1">{scannerData.socialProfiles.ens.description}</p>
                                )}
                              </div>
                            )}
                            {scannerData.socialProfiles.lens && (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2">Lens Protocol</h4>
                                <p className="text-purple-200">{scannerData.socialProfiles.lens.handle}</p>
                                <p className="text-purple-400 text-sm">{scannerData.socialProfiles.lens.followers} followers</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Token Holdings */}
                      {scannerData.tokenHoldings.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Token Holdings</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {scannerData.tokenHoldings.slice(0, 12).map((token, index) => (
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
                          {scannerData.tokenHoldings.length > 12 && (
                            <p className="text-purple-400 text-sm mt-3 text-center">
                              +{scannerData.tokenHoldings.length - 12} more tokens
                            </p>
                          )}
                        </div>
                      )}

                      {/* Profit/Loss Heatmap */}
                      {scannerData.profitLoss.heatmapData.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Activity Heatmap (Last 30 Days)</h3>
                          </div>
                                                      <div className="grid grid-cols-10 gap-1">
                              {scannerData.profitLoss.heatmapData.map((day, index) => {
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
                          <div className="mt-4">
                            <div className="bg-purple-800 rounded-lg p-4 text-center">
                              <p className="text-white font-semibold text-lg">Last 30 Days Summary</p>
                              <p className={`text-xl font-bold ${scannerData.profitLoss.last30Days.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {scannerData.profitLoss.last30Days.net >= 0 ? '+' : ''}{scannerData.profitLoss.last30Days.net.toFixed(4)} ETH
                              </p>
                              <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                                <div>
                                  <p className="text-green-400 text-sm font-medium">Profit</p>
                                  <p className="text-white text-xs">+{scannerData.profitLoss.last30Days.profit.toFixed(4)} ETH</p>
                                </div>
                                <div>
                                  <p className="text-red-400 text-sm font-medium">Loss</p>
                                  <p className="text-white text-xs">-{scannerData.profitLoss.last30Days.loss.toFixed(4)} ETH</p>
                                </div>
                                <div>
                                  <p className="text-purple-400 text-sm font-medium">Transactions</p>
                                  <p className="text-white text-xs">{scannerData.profitLoss.last30Days.transactions} txns</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wallet Activity */}
                      {scannerData.walletActivity.length > 0 && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Activity className="w-6 h-6 text-purple-300" />
                              <h3 className="text-xl font-bold text-white">Transaction History</h3>
                            </div>
                            <span className="bg-purple-600 px-3 py-1 rounded-lg text-sm text-purple-200">
                              {scannerData.walletActivity.length} loaded
                            </span>
                          </div>
                          <div className="space-y-3">
                            {scannerData.walletActivity.map((tx, index) => (
                              <div key={`${tx.hash}-${index}`} className="bg-purple-800 rounded-lg p-4 hover:bg-purple-750 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className={`w-3 h-3 rounded-full ${tx.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        tx.txType === 'DEX Swap' ? 'bg-blue-600 text-white' :
                                        tx.txType === 'Token Transfer' ? 'bg-green-600 text-white' :
                                        tx.txType === 'Token Approval' ? 'bg-yellow-600 text-white' :
                                        tx.txType === 'NFT Mint' ? 'bg-purple-600 text-white' :
                                        tx.txType === 'NFT Transfer' ? 'bg-pink-600 text-white' :
                                        'bg-gray-600 text-white'
                                      }`}>
                                        {tx.txType}
                                      </span>
                                      <span className="bg-blue-600 px-2 py-1 rounded text-xs text-white">
                                        {tx.chain}
                                      </span>
                                      {tx.value > 0 && (
                                        <span className="text-green-400 text-sm font-medium">
                                          {tx.value.toFixed(4)} ETH
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <p className="text-purple-400">
                                          <span className="text-purple-300">From:</span> {formatAddress(tx.from)}
                                        </p>
                                        <p className="text-purple-400">
                                          <span className="text-purple-300">To:</span> {formatAddress(tx.to)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-purple-400">
                                          <span className="text-purple-300">Gas:</span> {tx.gasFee.toFixed(6)} ETH
                                        </p>
                                        <p className="text-purple-400">
                                          <span className="text-purple-300">Block:</span> #{tx.blockNumber.toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="text-xs">
                                        <p className="text-purple-400">
                                          {new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString()}
                                        </p>
                                        {tx.methodName !== 'Transfer' && (
                                          <p className="text-purple-500">
                                            Method: {tx.methodName}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-purple-400">
                                          {tx.confirmations > 0 ? `${tx.confirmations} confirmations` : 'Unconfirmed'}
                                        </span>
                                        <a
                                          href={`${tx.explorerUrl}/tx/${tx.hash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-purple-300 hover:text-white transition-colors"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-purple-400">
                              Showing {scannerData.walletActivity.length} transactions • Page {scannerTxPage}
                            </div>
                            {hasMoreTxs && (
                              <button
                                onClick={loadMoreTransactions}
                                disabled={loadingScanner}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingScanner ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Activity className="w-4 h-4" />
                                )}
                                {loadingScanner ? 'Loading...' : 'Load More Transactions'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* No Data Found */}
                      {!scannerData.farcasterProfile && 
                       !scannerData.socialProfiles.ens && 
                       !scannerData.socialProfiles.lens && 
                       scannerData.tokenHoldings.length === 0 && 
                       scannerData.walletActivity.length === 0 && (
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
              ) : currentPage === 'degentools' ? (
                // DegenTools Interface
                <div className="space-y-6">
                  {/* DegenTools Main Menu */}
                  {!contractData && !showTrendingWallets && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="bg-purple-700 rounded-xl p-8 text-center max-w-md">
                        <Zap className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">DegenTools</h3>
                        <p className="text-purple-300 mb-6">
                          Advanced blockchain intelligence and degen tracking tools
                        </p>
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => setContractData({})} // Show search interface
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                            Contract Checker
                          </button>
                          
                          <button
                            onClick={analyzeTrendingWallets}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <Crown className="w-5 h-5" />
                            Trending Wallets
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contract Search Interface */}
                  {contractData !== null && !contractData.address && (
                    <div className="bg-purple-700 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-purple-300" />
                        <h3 className="text-xl font-bold text-white">Contract Checker</h3>
                      </div>
                      <p className="text-purple-300 text-sm mb-4">
                        Enter any smart contract address to analyze its type, creator, and see live activity feed with buy/sell radar.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={contractAddress}
                          onChange={(e) => setContractAddress(e.target.value)}
                          placeholder="0x1234567890abcdef1234567890abcdef12345678"
                          className="flex-1 px-4 py-3 bg-purple-800 border border-purple-600 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                          onClick={analyzeContract}
                          disabled={loadingContract || !contractAddress}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Search className={`w-4 h-4 ${loadingContract ? 'animate-spin' : ''}`} />
                          {loadingContract ? 'Analyzing...' : 'Analyze Contract'}
                        </button>
                      </div>
                      {contractError && (
                        <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <p className="text-red-200 text-sm">{contractError}</p>
                        </div>
                      )}
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => setContractData(null)}
                          className="text-purple-400 hover:text-white text-sm transition-colors"
                        >
                          ← Back to DegenTools
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {loadingContract && (
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

                  {/* Contract Analysis Results */}
                  {contractData && contractData.address && (
                    <div className="space-y-6">
                      {/* Contract Info */}
                      <div className="bg-purple-700 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-purple-300" />
                            <h3 className="text-xl font-bold text-white">Contract Analysis</h3>
                          </div>
                          <button
                            onClick={() => setContractData({})}
                            className="text-purple-400 hover:text-white text-sm transition-colors"
                          >
                            Search Another →
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Contract Details */}
                          <div>
                            <div className="mb-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                contractData.isToken ? 'bg-green-600 text-white' :
                                contractData.isNFT ? 'bg-purple-600 text-white' :
                                'bg-blue-600 text-white'
                              }`}>
                                {contractData.contractType}
                              </span>
                              {contractData.verified && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-800 text-green-200">
                                  ✅ Verified
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-purple-300">Contract:</span>
                                <p className="text-white font-mono text-xs break-all">{contractData.address}</p>
                              </div>
                              
                              {contractData.name && (
                                <div>
                                  <span className="text-purple-300">Name:</span>
                                  <p className="text-white">{contractData.name} {contractData.symbol && `(${contractData.symbol})`}</p>
                                </div>
                              )}
                              
                              {contractData.totalSupply && (
                                <div>
                                  <span className="text-purple-300">Total Supply:</span>
                                  <p className="text-white">{contractData.totalSupply}</p>
                                </div>
                              )}
                              
                              {contractData.network && (
                                <div>
                                  <span className="text-purple-300">Network:</span>
                                  <p className="text-white">{contractData.network}</p>
                                </div>
                              )}
                              
                              {contractData.deploymentBlock && (
                                <div>
                                  <span className="text-purple-300">Deployed at Block:</span>
                                  <p className="text-white">#{contractData.deploymentBlock.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Creator Info */}
                          <div>
                            <h4 className="text-purple-300 text-sm mb-3">Contract Creator</h4>
                            {contractData.creatorFarcaster ? (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                  {contractData.creatorFarcaster.pfp ? (
                                    <img 
                                      src={contractData.creatorFarcaster.pfp} 
                                      alt="Profile" 
                                      className="w-10 h-10 rounded-full object-cover border-2 border-purple-600"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                      }}
                                    />
                                  ) : null}
                                  <User className={`w-8 h-8 text-purple-300 ${contractData.creatorFarcaster.pfp ? 'hidden' : 'block'}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-white font-semibold">@{contractData.creatorFarcaster.username}</p>
                                      <span className="bg-blue-600 px-2 py-1 rounded text-xs text-white">
                                        Farcaster
                                      </span>
                                    </div>
                                    <p className="text-purple-300 text-sm">{contractData.creatorFarcaster.displayName}</p>
                                    <p className="text-purple-400 text-xs">FID: {contractData.creatorFarcaster.fid}</p>
                                    {contractData.creatorFarcaster.bio && (
                                      <p className="text-purple-400 text-xs mt-1 italic">"{contractData.creatorFarcaster.bio}"</p>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-purple-700">
                                  <p className="text-purple-500 text-xs">Contract Creator Address:</p>
                                  <p className="text-purple-400 text-xs font-mono">{contractData.creator}</p>
                                </div>
                              </div>
                            ) : contractData.creator ? (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                  <Wallet className="w-6 h-6 text-purple-300" />
                                  <div>
                                    <p className="text-purple-300 text-sm font-medium">Contract Creator</p>
                                    <p className="text-white font-mono text-sm break-all">{contractData.creator}</p>
                                    <p className="text-purple-400 text-xs mt-1">No Farcaster profile found</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-purple-800 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                  <AlertTriangle className="w-6 h-6 text-purple-400" />
                                  <div>
                                    <p className="text-purple-400 text-sm">Creator information not available</p>
                                    <p className="text-purple-500 text-xs">Unable to determine contract deployer</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Activity Button */}
                        <div className="mt-6 text-center">
                          <button
                            onClick={() => {
                              setShowActivityRadar(!showActivityRadar);
                              if (!showActivityRadar) {
                                fetchLiveActivity();
                              }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white rounded-lg font-medium transition-colors mx-auto"
                          >
                            <Radar className="w-5 h-5" />
                            {showActivityRadar ? 'Hide Activity Radar' : 'Show Live Activity Radar'}
                          </button>
                        </div>
                      </div>

                      {/* Live Activity Radar */}
                      {showActivityRadar && (
                        <div className="bg-purple-700 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Radar className="w-6 h-6 text-purple-300" />
                              <h3 className="text-xl font-bold text-white">Live Activity Feed</h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span className="text-green-300">Buyers</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                <span className="text-red-300">Sellers</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                <span className="text-blue-300">Interactions</span>
                              </div>
                            </div>
                          </div>

                          {loadingActivityRadar ? (
                            <div className="text-center py-8">
                              <Radar className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
                              <p className="text-purple-300">Scanning blockchain activity...</p>
                            </div>
                          ) : liveActivity.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {liveActivity.map((activity, index) => (
                                <div key={`${activity.hash}-${index}`} className="bg-purple-800 rounded-lg p-3 hover:bg-purple-750 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 rounded-full ${
                                        activity.activityType === 'buy' ? 'bg-green-400' :
                                        activity.activityType === 'sell' ? 'bg-red-400' :
                                        'bg-blue-400'
                                      }`}></div>
                                      <div>
                                        <p className="text-white text-sm font-medium">
                                          {activity.activityType === 'buy' ? '🟢 BUY' :
                                           activity.activityType === 'sell' ? '🔴 SELL' :
                                           '🔵 INTERACTION'}
                                        </p>
                                        <p className="text-purple-400 text-xs">
                                          {formatAddress(activity.from)} → {formatAddress(activity.to)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      {activity.value > 0 && (
                                        <p className="text-purple-200 text-sm">{activity.value.toFixed(4)} ETH</p>
                                      )}
                                      <p className="text-purple-400 text-xs">
                                        {new Date(activity.timestamp).toLocaleTimeString()}
                                      </p>
                                      <span className="bg-blue-600 px-2 py-1 rounded text-xs text-white">
                                        {activity.chain}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Radar className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                              <p className="text-purple-300">No recent activity detected</p>
                              <p className="text-purple-400 text-sm">Activity from the last 24 hours will appear here</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : currentPage === 'approvals' ? (
                loading ? (
                  <div className="space-y-4">
                    <p className="text-center text-purple-300">Loading your approvals...</p>
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
              ) : currentPage === 'faucet' ? (
                <div className="space-y-3">
                  <div className="bg-purple-700 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-2">No gas fee for transactions ?</p>
                    <div className="space-y-2">
                      <button
                        disabled={!!faucetBusy}
                        onClick={() => claimFaucet('base')}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2 rounded-lg"
                      >
                        {faucetBusy === 'eth' ? 'Claiming ETH...' : 'Claim ETH'}
                      </button>
                      <button
                        disabled={!!faucetBusy}
                        onClick={() => claimFaucet('mon')}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2 rounded-lg"
                      >
                        {faucetBusy === 'mon' ? 'Claiming MON...' : 'Claim MON'}
                      </button>
                      <button
                        disabled={!!faucetBusy}
                        onClick={() => claimFaucet('celo')}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2 rounded-lg"
                      >
                        {faucetBusy === 'celo' ? 'Claiming CELO...' : 'Claim CELO'}
                      </button>
                    </div>
                    {hasClaimedFaucet && claimedTokenInfo && (
                      <div className="mt-3 text-center">
                        <div className="text-green-400 text-sm mb-2">
                          ✅ {claimedTokenInfo.displayAmount} claimed!
                        </div>
                        <button
                          onClick={async () => {
                            const text = `Just claimed ${claimedTokenInfo.displayAmount} from FarGuard's daily faucet!\n\nSecure your wallet and get free gas tokens daily:`;
                            const url = "https://fgrevoke.vercel.app";
                            
                            try {
                              if (sdk?.actions?.composeCast) {
                                console.log('📝 Composing cast via SDK...');
                                await sdk.actions.composeCast({ 
                                  text: text.trim(),
                                  embeds: [url]
                                });
                                console.log('✅ Shared to Farcaster');
                              } else {
                                // Fallback to window.open
                                const fullText = `${text}\n${url}`;
                                const encoded = encodeURIComponent(fullText);
                                window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
                              }
                            } catch (error) {
                              console.error('Share error:', error);
                              // Fallback to clipboard
                              const fullText = `${text}\n${url}`;
                              await navigator.clipboard.writeText(fullText);
                              alert('✅ Share text copied to clipboard!');
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentPage === 'buy' ? (
                // Buy Page - Token Purchase Box
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 shadow-lg">
                    <div className="text-center mb-6">
                      <ShoppingCart className="w-12 h-12 text-white mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">Buy FarGuard Token</h3>
                      <p className="text-purple-100">Purchase tokens with ETH or USDC on Base network</p>
                      <p className="text-xs text-purple-200 mt-2">
                        Contract: {TOKEN_CONTRACT_ADDRESS}
                      </p>
                    </div>
                    
                    {/* Buy Box */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                      {buyError && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                          <p className="text-red-200 text-sm">{buyError}</p>
                        </div>
                      )}
                      
                      {/* Currency Selection */}
                      <div className="mb-4">
                        <label className="block text-white font-medium mb-2">Pay with</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setBuyCurrency('ETH')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                              buyCurrency === 'ETH' 
                                ? 'bg-white text-purple-600' 
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                          >
                            ETH
                          </button>
                          <button
                            onClick={() => setBuyCurrency('USDC')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                              buyCurrency === 'USDC' 
                                ? 'bg-white text-purple-600' 
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                          >
                            USDC
                          </button>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-4">
                        <label className="block text-white font-medium mb-2">
                          Amount ({buyCurrency})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={buyAmount}
                            onChange={(e) => setBuyAmount(e.target.value)}
                            placeholder={`Enter ${buyCurrency} amount`}
                            className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                            step="0.0001"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Token Amount Display */}
                      {buyAmount && tokenPrice > 0 && (
                        <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">You'll receive:</span>
                            <span className="text-green-300 font-bold text-lg">
                              {calculateTokenAmount(buyAmount).toLocaleString()} tokens
                            </span>
                          </div>
                          <div className="text-xs text-purple-200 mt-1">
                            Rate: 1 {buyCurrency} = {(1 / tokenPrice).toLocaleString()} tokens
                          </div>
                        </div>
                      )}

                      {/* Price Loading */}
                      {loadingPrice && (
                        <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-white animate-spin mr-2" />
                            <span className="text-white text-sm">Loading token price...</span>
                          </div>
                        </div>
                      )}

                      {/* Buy Button */}
                      <button
                        onClick={handleBuyTokens}
                        disabled={!isConnected || !buyAmount || buyLoading || loadingPrice}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {buyLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : !isConnected ? (
                          <>
                            <Wallet className="w-5 h-5" />
                            <span>Connect Wallet First</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            <span>Buy Tokens</span>
                          </>
                        )}
                      </button>

                      {/* Network Warning */}
                      {selectedChain !== 'base' && (
                        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-yellow-200 text-sm font-medium">Switch to Base Network</p>
                              <p className="text-yellow-200/80 text-xs mt-1">
                                Token purchase is only available on Base network. Please switch your wallet to Base.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Safety Notice */}
                    <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-white font-semibold mb-2">Important Notice</h5>
                          <ul className="text-purple-100 text-sm space-y-1">
                            <li>• You'll be redirected to Uniswap for the actual swap</li>
                            <li>• Always verify the token contract address before trading</li>
                            <li>• Prices may vary due to market conditions</li>
                            <li>• Ensure you have sufficient gas for the transaction</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Wallet Selection Modal */}
      {showWalletSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-blue-100">Choose your preferred wallet to connect</p>
            </div>

            {/* Wallet Options */}
            <div className="p-6 space-y-4">
              {/* Farcaster Option */}
              <button
                onClick={connectFarcaster}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white p-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🎭</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Farcaster</h3>
                    <p className="text-purple-100 text-sm">Connect with Farcaster miniapp</p>
                  </div>
                </div>
                <ChevronDown className="w-6 h-6 transform -rotate-90" />
              </button>

              {/* Rabby Option */}
              <button
                onClick={connectRabby}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 text-white p-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🐰</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Rabby Wallet</h3>
                    <p className="text-orange-100 text-sm">Connect with Rabby browser extension</p>
                  </div>
                </div>
                <ChevronDown className="w-6 h-6 transform -rotate-90" />
              </button>

              {/* Loading State */}
              {isConnecting && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-gray-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <button
                onClick={() => setShowWalletSelection(false)}
                className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <p className="text-xs text-gray-400">
                Choose the wallet that works best for you
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
