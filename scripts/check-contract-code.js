const { createPublicClient, http } = require('viem');
const { celo } = require('viem/chains');

async function checkContracts() {
  // Contract addresses
  const CELO_CONTRACT = '0xc7e8d5e1bc250a396f4b845fe54632251be23421';
  const MON_CONTRACT = '0x60b430e8083a0c395a7789633fc742d2b3209854';
  
  // Create clients
  const celoClient = createPublicClient({
    chain: celo,
    transport: http('https://forno.celo.org'),
  });
  
  const monadClient = createPublicClient({
    chain: {
      id: 10143,
      name: 'Monad Testnet',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: { default: { http: ['https://testnet.monad.network'] } },
    },
    transport: http('https://testnet.monad.network'),
  });
  
  console.log('Checking contract bytecode...\n');
  
  try {
    // Get bytecode
    const celoBytecode = await celoClient.getBytecode({ address: CELO_CONTRACT });
    const monBytecode = await monadClient.getBytecode({ address: MON_CONTRACT });
    
    console.log('Celo contract bytecode length:', celoBytecode ? celoBytecode.length : 0);
    console.log('Monad contract bytecode length:', monBytecode ? monBytecode.length : 0);
    
    if (celoBytecode && monBytecode) {
      const areSame = celoBytecode === monBytecode;
      console.log('\nContracts have identical bytecode:', areSame);
      
      if (!areSame) {
        console.log('\n⚠️  CONTRACTS HAVE DIFFERENT IMPLEMENTATIONS!');
        console.log('This means the Monad contract might have different logic than the Celo contract.');
        
        // Check bytecode size difference
        const sizeDiff = Math.abs(celoBytecode.length - monBytecode.length);
        console.log(`\nBytecode size difference: ${sizeDiff} characters`);
        
        // Try to identify common patterns
        if (monBytecode.includes('18160ddd')) {
          console.log('\n✅ Monad contract appears to have totalSupply() function (ERC20 pattern)');
        }
        if (monBytecode.includes('70a08231')) {
          console.log('✅ Monad contract appears to have balanceOf() function (ERC20 pattern)');
        }
        if (monBytecode.includes('a9059cbb')) {
          console.log('✅ Monad contract appears to have transfer() function (ERC20 pattern)');
        }
      }
    }
    
    // Check if contracts exist
    if (!celoBytecode) {
      console.log('\n❌ No contract found at Celo address:', CELO_CONTRACT);
    }
    if (!monBytecode) {
      console.log('\n❌ No contract found at Monad address:', MON_CONTRACT);
    }
    
  } catch (error) {
    console.error('Error checking contracts:', error);
  }
}

checkContracts();