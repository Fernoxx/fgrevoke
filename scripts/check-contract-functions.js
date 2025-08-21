const { createPublicClient, http, parseAbi } = require('viem');
const { celo } = require('viem/chains');

async function checkContractFunctions() {
  const MON_CONTRACT = '0x60b430e8083a0c395a7789633fc742d2b3209854';
  
  const monadClient = createPublicClient({
    chain: {
      id: 10143,
      name: 'Monad Testnet',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: { default: { http: ['https://testnet.monad.network'] } },
    },
    transport: http('https://testnet.monad.network'),
  });
  
  console.log('Checking Monad contract functions...\n');
  
  // Common function selectors to check
  const functionSelectors = {
    // Meta transaction functions
    'executeMetaTransaction': '0x0c53c51c',
    'getNonce': '0x2d0335ab',
    
    // ERC20 functions
    'transfer': '0xa9059cbb',
    'balanceOf': '0x70a08231',
    'totalSupply': '0x18160ddd',
    'decimals': '0x313ce567',
    'symbol': '0x95d89b41',
    'name': '0x06fdde03',
    
    // Claim functions
    'claim': '0x4e71d92d',
    'claimWithVoucher': '0x7c8f3f8e',
    'claimedToday': '0x3f15457f',
    
    // Token/ETH balance check
    'tokenBalance': '0x6f307dc3',
  };
  
  try {
    const bytecode = await monadClient.getBytecode({ address: MON_CONTRACT });
    
    if (!bytecode) {
      console.log('❌ No contract found at address:', MON_CONTRACT);
      return;
    }
    
    console.log('Contract found! Checking for function selectors...\n');
    
    // Check for function selectors in bytecode
    for (const [funcName, selector] of Object.entries(functionSelectors)) {
      const selectorWithoutPrefix = selector.slice(2);
      if (bytecode.includes(selectorWithoutPrefix)) {
        console.log(`✅ ${funcName} (${selector}) - FOUND`);
      } else {
        console.log(`❌ ${funcName} (${selector}) - NOT FOUND`);
      }
    }
    
    // Try to call some read functions
    console.log('\n\nTrying to call contract functions...\n');
    
    try {
      // Check if it's using an ERC20 token
      const tokenAbi = parseAbi([
        'function tokenAddress() view returns (address)',
        'function token() view returns (address)',
      ]);
      
      // Try different possible function names for token address
      for (const funcName of ['tokenAddress', 'token']) {
        try {
          const result = await monadClient.readContract({
            address: MON_CONTRACT,
            abi: tokenAbi,
            functionName: funcName,
          });
          console.log(`✅ ${funcName}() returned:`, result);
          console.log('⚠️  This contract uses an ERC20 token, not native MON!');
          break;
        } catch (e) {
          // Function doesn't exist, continue
        }
      }
    } catch (error) {
      console.log('Contract does not appear to use an ERC20 token');
    }
    
  } catch (error) {
    console.error('Error checking contract:', error);
  }
}

checkContractFunctions();