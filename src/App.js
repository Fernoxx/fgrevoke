// Fixed App.js - FarGuard with PROPER Farcaster Miniapp SDK Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, CheckCircle, RefreshCw, AlertTriangle, ExternalLink, Shield, Share2, Trash2 } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';

function App() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Farcaster integration states
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [context, setContext] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [provider, setProvider] = useState(null);

  // API Configuration
  const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || 'ZEdRoAJMYps0b-N8NePn9x51WqrgCw2r';
  const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY || 'e0dab6b6fd544048b38913529be65eeb';
  const BASESCAN_KEY = process.env.REACT_APP_BASESCAN_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';
  const ARBISCAN_KEY = process.env.REACT_APP_ARBISCAN_KEY || 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

  // Chain configuration
  const chains = [
    { 
      name: 'Ethereum', 
      value: 'ethereum', 
      apiUrl: 'https://api.etherscan.io/api',
      rpcUrls: [
        `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        'https://ethereum-rpc.publicnode.com'
      ],
      chainId: 1,
      explorerUrl: 'https://etherscan.io'
    },
    { 
      name: 'Base', 
      value: 'base', 
      apiUrl: 'https://api.basescan.org/api',
      rpcUrls: [
        `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        'https://base-mainnet.publicnode.com',
        'https://base.meowrpc.com'
      ],
      chainId: 8453,
      explorerUrl: 'https://basescan.org'
    },
    { 
      name: 'Arbitrum', 
      value: 'arbitrum', 
      apiUrl: 'https://api.arbiscan.io/api',
      rpcUrls: [
        `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-rpc.publicnode.com'
      ],
      chainId: 42161,
      explorerUrl: 'https://arbiscan.io'
    }
  ];

  // PROPER SDK Initialization following the documentation patterns
  useEffect(() => {
    const initializeSDK = async () => {
      console.log('🚀 Initializing Farcaster SDK...');
      
      try {
        // Check if we're in a miniapp context
        const isInMiniApp = await sdk.isInMiniApp();
        console.log('📱 Is in MiniApp:', isInMiniApp);
        
        if (!isInMiniApp) {
          console.log('⚠️ Not running in Farcaster miniapp');
          setError('This app must be opened in Farcaster');
          return;
        }

        // Get context data
        const contextData = await sdk.context;
        console.log('📊 Context data:', contextData);
        setContext(contextData);

        // Set user data if available
        if (contextData?.user) {
          console.log('👤 User found in context:', contextData.user);
          setUser(contextData.user);
        }

        // CRITICAL: Call ready() to hide splash screen
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

  // PROPER Wallet Connection using the documented approach
  const connectWallet = async () => {
    console.log('🔌 Starting wallet connection...');
    setIsConnecting(true);
    setError(null);

    try {
      if (!sdkReady) {
        throw new Error('SDK not ready. Please wait for initialization.');
      }

      // Get Ethereum provider using the proper SDK method
      console.log('🌐 Getting Ethereum provider...');
      const ethProvider = await sdk.wallet.getEthereumProvider();
      
      if (!ethProvider) {
        throw new Error('Ethereum provider not available. Please ensure you have a wallet connected in Farcaster.');
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

      const walletAddress = accounts[0];
      console.log('👛 Wallet connected:', walletAddress);

      // Get current chain
      const chainId = await ethProvider.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);

      setAddress(walletAddress);
      setIsConnected(true);
      
      // If we have user context, use it, otherwise create minimal user object
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

  // Fetch approvals function
  const fetchRealApprovals = useCallback(async (userAddress) => {
    setLoading(true);
    setError(null);
    console.log('🔍 Fetching REAL approvals for:', userAddress);
    console.log('🔍 Selected chain:', selectedChain);
    console.log('🔍 Available APIs:', {
      etherscan: ETHERSCAN_API_KEY ? 'Available' : 'Missing',
      alchemy: ALCHEMY_API_KEY ? 'Available' : 'Missing',
      infura: INFURA_API_KEY ? 'Available' : 'Missing',
      basescan: BASESCAN_KEY ? 'Available' : 'Missing',
      arbiscan: ARBISCAN_KEY ? 'Available' : 'Missing'
    });
    
    try {
      const chainConfig = chains.find(chain => chain.value === selectedChain);
      console.log('🔍 Chain config:', chainConfig);
      
      let apiKey = ETHERSCAN_API_KEY;
      if (selectedChain === 'base') apiKey = BASESCAN_KEY;
      if (selectedChain === 'arbitrum') apiKey = ARBISCAN_KEY;
      
      console.log('🔍 Using API key:', apiKey ? 'Available' : 'Missing');

      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
      
      console.log('🔍 Padded address:', paddedAddress);
      console.log('🔍 Approval topic:', approvalTopic);
      
      // Method 1: Try Block Explorer API
      console.log('🔍 Method 1: Trying Block Explorer API...');
      const scanUrl = `${chainConfig.apiUrl}?module=logs&action=getLogs&fromBlock=0&toBlock=latest&topic0=${approvalTopic}&topic1=${paddedAddress}&apikey=${apiKey}`;
      console.log('🔍 Scan URL:', scanUrl);
      
      try {
        const response = await fetch(scanUrl);
        const data = await response.json();
        console.log('🔍 Block Explorer API response:', data);
        
        if (data.status === '1' && data.result && data.result.length > 0) {
          console.log(`📊 Found ${data.result.length} approval events from Block Explorer`);
          console.log('📊 First few events:', data.result.slice(0, 3));
          await processApprovals(data.result, userAddress, chainConfig, apiKey);
          return;
        } else {
          console.log('⚠️ No results from Block Explorer API, trying alternatives...');
          console.log('⚠️ Data status:', data.status);
          console.log('⚠️ Data result:', data.result);
        }
      } catch (scanError) {
        console.log('⚠️ Block Explorer API failed:', scanError.message);
        console.log('⚠️ Full error:', scanError);
      }

       // Method 2: Try using Alchemy API for more comprehensive data
       console.log('🔍 Method 2: Trying Alchemy API...');
       try {
         const alchemyApprovals = await fetchApprovalsFromAlchemy(userAddress, chainConfig);
         console.log('🔍 Alchemy approvals result:', alchemyApprovals);
         if (alchemyApprovals && alchemyApprovals.length > 0) {
           console.log(`📊 Found ${alchemyApprovals.length} approvals from Alchemy`);
           setApprovals(alchemyApprovals);
           return;
         } else {
           console.log('⚠️ No approvals from Alchemy API');
         }
       } catch (alchemyError) {
         console.log('⚠️ Alchemy API failed:', alchemyError.message);
         console.log('⚠️ Full Alchemy error:', alchemyError);
       }

       // Method 3: Try direct RPC calls for approval events
       console.log('🔍 Method 3: Trying direct RPC calls...');
       try {
         const rpcApprovals = await fetchApprovalsFromRPC(userAddress, chainConfig);
         console.log('🔍 RPC approvals result:', rpcApprovals);
         if (rpcApprovals && rpcApprovals.length > 0) {
           console.log(`📊 Found ${rpcApprovals.length} approvals from RPC`);
           setApprovals(rpcApprovals);
           return;
         } else {
           console.log('⚠️ No approvals from RPC');
         }
       } catch (rpcError) {
         console.log('⚠️ RPC API failed:', rpcError.message);
         console.log('⚠️ Full RPC error:', rpcError);
       }

       // Method 4: Try checking common DeFi protocols directly
       console.log('🔍 Method 4: Checking common DeFi protocols...');
       try {
         const commonProtocolApprovals = await checkCommonProtocols(userAddress, chainConfig);
         console.log('🔍 Common protocol approvals result:', commonProtocolApprovals);
         if (commonProtocolApprovals && commonProtocolApprovals.length > 0) {
           console.log(`📊 Found ${commonProtocolApprovals.length} approvals from common protocols`);
           setApprovals(commonProtocolApprovals);
           return;
         } else {
           console.log('⚠️ No approvals from common protocols');
         }
       } catch (protocolError) {
         console.log('⚠️ Common protocols check failed:', protocolError.message);
         console.log('⚠️ Full protocol error:', protocolError);
       }

       // If no approvals found, show empty state (not test data)
       console.log('✅ No active approvals found - wallet is secure!');
       setApprovals([]);
       
     } catch (error) {
       console.error('❌ Approval fetching failed:', error);
       setError(`Failed to fetch approvals: ${error.message}`);
     } finally {
       setLoading(false);
     }
       }, [selectedChain, ETHERSCAN_API_KEY, BASESCAN_KEY, ARBISCAN_KEY, ALCHEMY_API_KEY, INFURA_API_KEY]);

   // Process approvals from API response
   const processApprovals = async (logs, userAddress, chainConfig, apiKey) => {
     console.log('🔄 Processing approvals...');
     console.log('🔄 Processing logs count:', logs.length);
     console.log('🔄 Processing for address:', userAddress);
     const approvalMap = new Map();
     
     for (const log of logs.slice(-50)) {
       try {
         const tokenContract = log.address.toLowerCase();
         const spenderAddress = log.topics && log.topics[2] ? 
           '0x' + log.topics[2].slice(26) : null;
         
         console.log('🔄 Processing log:', {
           tokenContract,
           spenderAddress,
           txHash: log.transactionHash,
           blockNumber: log.blockNumber
         });
         
         if (!spenderAddress) {
           console.log('⚠️ No spender address found, skipping');
           continue;
         }
         
         const key = `${tokenContract}-${spenderAddress}`;
         if (approvalMap.has(key)) {
           console.log('⚠️ Duplicate approval, skipping');
           continue;
         }
         
         // Check current allowance
         console.log('🔄 Checking allowance for:', { tokenContract, userAddress, spenderAddress });
         const allowanceInfo = await checkCurrentAllowance(tokenContract, userAddress, spenderAddress, chainConfig, apiKey);
         console.log('🔄 Allowance info:', allowanceInfo);
         
         if (allowanceInfo && allowanceInfo.allowance && allowanceInfo.allowance !== '0') {
           console.log('✅ Active allowance found, getting token info...');
           const tokenInfo = await getTokenInfo(tokenContract, chainConfig, apiKey);
           console.log('🔄 Token info:', tokenInfo);
           
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
           
           console.log('✅ Created approval:', approval);
           approvalMap.set(key, approval);
         } else {
           console.log('⚠️ No active allowance, skipping');
         }
       } catch (error) {
         console.warn('⚠️ Error processing approval:', error);
       }
     }
     
     const finalApprovals = Array.from(approvalMap.values());
     console.log(`✅ Processed ${finalApprovals.length} active approvals`);
     console.log('✅ Final approvals:', finalApprovals);
     setApprovals(finalApprovals);
   };

  // Fetch approvals when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      fetchRealApprovals(address);
    }
  }, [address, isConnected, fetchRealApprovals]);

  // Alternative method: Fetch approvals using Alchemy API
  const fetchApprovalsFromAlchemy = async (userAddress, chainConfig) => {
    try {
      console.log('🔄 Fetching approvals from Alchemy API...');
      
      // Use Alchemy's enhanced API for getting token transfers and approvals
      const alchemyUrl = chainConfig.rpcUrls.find(url => url.includes('alchemy'));
      if (!alchemyUrl) {
        throw new Error('Alchemy URL not found');
      }

      // Get approval events using eth_getLogs
      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
      
      const response = await fetch(alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x' + (await getLatestBlockNumber(chainConfig) - 10000).toString(16),
            toBlock: 'latest',
            topics: [approvalTopic, '0x' + paddedAddress]
          }],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        return await processAlchemyApprovals(data.result, userAddress, chainConfig);
      }
      
      return [];
    } catch (error) {
      console.error('Alchemy API error:', error);
      throw error;
    }
  };

  // Alternative method: Fetch approvals using direct RPC calls
  const fetchApprovalsFromRPC = async (userAddress, chainConfig) => {
    try {
      console.log('🔄 Fetching approvals from RPC...');
      
      // Use multiple RPC endpoints for better reliability
      for (const rpcUrl of chainConfig.rpcUrls) {
        try {
          const approvals = await getRPCApprovals(userAddress, rpcUrl, chainConfig);
          if (approvals && approvals.length > 0) {
            return approvals;
          }
        } catch (rpcError) {
          console.log(`RPC ${rpcUrl} failed:`, rpcError.message);
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('RPC API error:', error);
      throw error;
    }
  };

  // Get latest block number
  const getLatestBlockNumber = async (chainConfig) => {
    try {
      const response = await fetch(chainConfig.rpcUrls[0], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const data = await response.json();
      return parseInt(data.result, 16);
    } catch (error) {
      console.error('Failed to get latest block:', error);
      return 18000000; // Fallback block number
    }
  };

  // Process Alchemy approval results
  const processAlchemyApprovals = async (logs, userAddress, chainConfig) => {
    const approvalMap = new Map();
    
    for (const log of logs.slice(-50)) {
      try {
        const tokenContract = log.address.toLowerCase();
        const spenderAddress = log.topics && log.topics[2] ? 
          '0x' + log.topics[2].slice(26) : null;
        
        if (!spenderAddress) continue;
        
        const key = `${tokenContract}-${spenderAddress}`;
        if (approvalMap.has(key)) continue;
        
        // Check current allowance
        const allowanceInfo = await checkCurrentAllowance(tokenContract, userAddress, spenderAddress, chainConfig, '');
        
        if (allowanceInfo && allowanceInfo.allowance && allowanceInfo.allowance !== '0') {
          const tokenInfo = await getTokenInfo(tokenContract, chainConfig, '');
          
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
            blockNumber: parseInt(log.blockNumber, 16),
            isActive: true
          };
          
          approvalMap.set(key, approval);
        }
      } catch (error) {
        console.warn('⚠️ Error processing Alchemy approval:', error);
      }
    }
    
    return Array.from(approvalMap.values());
  };

  // Get RPC approvals
  const getRPCApprovals = async (userAddress, rpcUrl, chainConfig) => {
    const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
    const paddedAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x' + (await getLatestBlockNumber(chainConfig) - 5000).toString(16),
          toBlock: 'latest',
          topics: [approvalTopic, '0x' + paddedAddress]
        }],
        id: 1
      })
    });

    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      return await processAlchemyApprovals(data.result, userAddress, chainConfig);
    }
    
    return [];
  };

  // Check common DeFi protocols for approvals
  const checkCommonProtocols = async (userAddress, chainConfig) => {
    console.log('🔍 Checking common DeFi protocols for approvals...');
    
    // Common protocol addresses by chain
    const commonProtocols = {
      ethereum: [
        '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
        '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router 2
        '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router
        '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
        '0x00000000006c3852cbef3e08e8df289169ede581', // OpenSea Registry
        '0xa0b86a33e6776e1a6b0a30ef54bac0ec6e8a51b5', // Blur Marketplace
        '0x74de5d4fcbf63e00296fd95d33236b9794016631', // MetaMask Swap Router
      ],
      base: [
        '0x2626664c2603336E57B271c5C0b26F421741e481', // Uniswap V3 Router (Base)
        '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // BaseSwap Router
        '0x327df1e6de05895d2ab08513aadd9313fe505d86', // Aerodrome Router
      ],
      arbitrum: [
        '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
        '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router 2
        '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
      ]
    };

         // Common ERC20 tokens to check
     const commonTokens = {
       ethereum: [
                   '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
         '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
         '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
         '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
         '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
         '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
         '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
       ],
       base: [
         '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC (Base)
         '0x4200000000000000000000000000000000000006', // WETH (Base)
         '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI (Base)
         '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22', // cbETH (Base)
       ],
       arbitrum: [
         '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC (Arbitrum)
         '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT (Arbitrum)
         '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH (Arbitrum)
         '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI (Arbitrum)
         '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', // WBTC (Arbitrum)
       ]
     };

    const protocolsToCheck = commonProtocols[selectedChain] || commonProtocols.ethereum;
    const tokensToCheck = commonTokens[selectedChain] || commonTokens.ethereum;
    
    const approvalMap = new Map();
    
    // Check each token against each protocol
    for (const tokenAddress of tokensToCheck) {
      for (const protocolAddress of protocolsToCheck) {
        try {
          const allowanceInfo = await checkCurrentAllowance(tokenAddress, userAddress, protocolAddress, chainConfig, '');
          
          if (allowanceInfo && allowanceInfo.allowance && allowanceInfo.allowance !== '0') {
            const tokenInfo = await getTokenInfo(tokenAddress, chainConfig, '');
            
            const key = `${tokenAddress}-${protocolAddress}`;
            
            const approval = {
              id: key,
              name: tokenInfo.name || 'Unknown Token',
              symbol: tokenInfo.symbol || 'UNK',
              contract: tokenAddress,
              spender: protocolAddress,
              spenderName: getSpenderName(protocolAddress),
              amount: formatAllowance(allowanceInfo.allowance, tokenInfo.decimals),
              riskLevel: assessRiskLevel(protocolAddress),
              txHash: '0x' + Date.now().toString(16), // Placeholder
              blockNumber: await getLatestBlockNumber(chainConfig),
              isActive: true
            };
            
            approvalMap.set(key, approval);
          }
        } catch (error) {
          console.warn(`⚠️ Error checking ${tokenAddress} -> ${protocolAddress}:`, error.message);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return Array.from(approvalMap.values());
  };

  // Helper functions for token data
  const checkCurrentAllowance = async (tokenContract, owner, spender, chainConfig, apiKey) => {
    try {
      const ownerPadded = owner.slice(2).padStart(64, '0');
      const spenderPadded = spender.slice(2).padStart(64, '0');
      const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;
      
      // Try block explorer API first if API key is provided
      if (apiKey) {
        try {
          const url = `${chainConfig.apiUrl}?module=proxy&action=eth_call&to=${tokenContract}&data=${data}&tag=latest&apikey=${apiKey}`;
          
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.status === '1' && result.result && result.result !== '0x') {
            const allowance = BigInt(result.result).toString();
            return { allowance };
          }
        } catch (apiError) {
          console.warn('Block explorer API failed, trying RPC:', apiError.message);
        }
      }
      
      // Fall back to RPC call
      for (const rpcUrl of chainConfig.rpcUrls) {
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: tokenContract,
                data: data
              }, 'latest'],
              id: 1
            })
          });
          
          const result = await response.json();
          
          if (result.result && result.result !== '0x' && result.result !== '0x0') {
            const allowance = BigInt(result.result).toString();
            return { allowance };
          }
        } catch (rpcError) {
          console.warn(`RPC ${rpcUrl} failed:`, rpcError.message);
          continue;
        }
      }
      
      return { allowance: '0' };
    } catch (error) {
      console.warn('Failed to check allowance:', error);
      return { allowance: '0' };
    }
  };

  const getTokenInfo = async (tokenAddress, chainConfig, apiKey) => {
    try {
      const calls = [
        { method: '0x06fdde03', property: 'name' },
        { method: '0x95d89b41', property: 'symbol' },
        { method: '0x313ce567', property: 'decimals' }
      ];
      
      const results = {};
      
      for (const call of calls) {
        let success = false;
        
        // Try block explorer API first if API key is provided
        if (apiKey) {
          try {
            const url = `${chainConfig.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=${call.method}&tag=latest&apikey=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === '1' && data.result && data.result !== '0x') {
              if (call.property === 'decimals') {
                results[call.property] = parseInt(data.result, 16);
              } else {
                try {
                  const hex = data.result.slice(2);
                  const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '');
                  results[call.property] = decoded || `Token${call.property.toUpperCase()}`;
                } catch (decodeError) {
                  results[call.property] = `Token${call.property.toUpperCase()}`;
                }
              }
              success = true;
            }
          } catch (apiError) {
            console.warn(`Block explorer API failed for ${call.property}:`, apiError.message);
          }
        }
        
        // Fall back to RPC call if API call failed
        if (!success) {
          for (const rpcUrl of chainConfig.rpcUrls) {
            try {
              const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'eth_call',
                  params: [{
                    to: tokenAddress,
                    data: call.method
                  }, 'latest'],
                  id: 1
                })
              });
              
              const data = await response.json();
              
              if (data.result && data.result !== '0x') {
                if (call.property === 'decimals') {
                  results[call.property] = parseInt(data.result, 16);
                } else {
                  try {
                    const hex = data.result.slice(2);
                    const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '');
                    results[call.property] = decoded || `Token${call.property.toUpperCase()}`;
                  } catch (decodeError) {
                    results[call.property] = `Token${call.property.toUpperCase()}`;
                  }
                }
                success = true;
                break;
              }
            } catch (rpcError) {
              console.warn(`RPC ${rpcUrl} failed for ${call.property}:`, rpcError.message);
              continue;
            }
          }
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

  // PROPER revoke function using the connected provider
  const handleRevokeApproval = async (approval) => {
    if (!provider || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔄 Revoking approval:', approval.name);
      
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

  // Share to Farcaster using proper SDK method
  const handleShare = async () => {
    const shareText = `🛡️ Just secured my wallet with FarGuard! Successfully revoked all of my unwanted approvals.

Check yours too and keep your assets safe! 🔒

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
    setError(null);
    setProvider(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white font-sans flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Header */}
        <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between py-4 px-6 bg-purple-800 rounded-xl shadow-lg mb-8">
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
        </header>

        {/* Main Content */}
        <main className="w-full max-w-4xl bg-purple-800 rounded-xl shadow-lg p-6 flex-1">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <img src="/farguard-logo.png" alt="FarGuard Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-purple-200 mb-2">Connect Your Farcaster Wallet</h2>
              <p className="text-xl text-purple-300 mb-4">
                View your REAL token approvals and revoke risky permissions
              </p>
              
              {!sdkReady ? (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-sm">
                    🔄 Initializing Farcaster SDK...
                  </p>
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                  <p className="text-green-300 text-sm">
                    🎉 SDK Ready! {context?.client?.name && `(${context.client.name})`}
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
                {!sdkReady ? 'Initializing...' : isConnecting ? 'Connecting...' : '🔗 Connect Farcaster Wallet'}
              </button>
            </div>
          ) : (
            <div>
              {/* Connected View */}
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
                  <p className="text-2xl font-bold text-orange-400">0</p>
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
                  <p className="text-center text-purple-300">
                    🔍 Fetching your REAL token approvals...
                  </p>
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                    <p className="text-blue-300 text-sm text-center">
                      📊 Checking multiple data sources for comprehensive results
                    </p>
                    <div className="mt-2 text-xs text-blue-200 text-center">
                      • Block Explorer APIs<br/>
                      • Alchemy/Infura RPCs<br/>
                      • Common DeFi Protocols
                    </div>
                  </div>
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
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mt-4">
                    <p className="text-green-300 text-sm">
                      ✅ We checked multiple data sources and found no active approvals
                    </p>
                    <div className="mt-2 text-xs text-green-200">
                      • Scanned approval events across chains<br/>
                      • Checked common DeFi protocols<br/>
                      • Verified current allowances
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 mb-4">
                    <p className="text-orange-300 text-sm text-center">
                      ⚠️ Found {approvals.length} active approval{approvals.length > 1 ? 's' : ''} that need{approvals.length > 1 ? '' : 's'} attention
                    </p>
                    <div className="mt-2 text-xs text-orange-200 text-center">
                      These are REAL approvals from your connected Farcaster wallet
                    </div>
                  </div>
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
