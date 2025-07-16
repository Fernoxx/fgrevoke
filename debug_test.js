// Debug test to verify approval fetching is working
const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth
const ETHERSCAN_API_KEY = 'KBBAH33N5GNCN2C177DVE5K1G3S7MRWIU7';

async function testApprovalFetching() {
  console.log('🔍 Testing approval fetching for:', testAddress);
  
  const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  const paddedAddress = testAddress.slice(2).toLowerCase().padStart(64, '0');
  
  const scanUrl = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=19000000&toBlock=latest&topic0=${approvalTopic}&topic1=0x${paddedAddress}&apikey=${ETHERSCAN_API_KEY}`;
  
  console.log('🔍 API URL:', scanUrl);
  
  try {
    const response = await fetch(scanUrl);
    const data = await response.json();
    
    console.log('📊 API Response Status:', data.status);
    console.log('📊 API Response Message:', data.message);
    console.log('📊 Results Count:', data.result ? data.result.length : 0);
    
    if (data.result && data.result.length > 0) {
      console.log('📊 First 3 results:');
      data.result.slice(0, 3).forEach((result, index) => {
        console.log(`Result ${index + 1}:`, {
          address: result.address,
          topics: result.topics,
          blockNumber: result.blockNumber,
          transactionHash: result.transactionHash
        });
      });
      
      // Test allowance checking for first result
      const firstResult = data.result[0];
      const tokenContract = firstResult.address.toLowerCase();
      const spenderAddress = firstResult.topics[2] ? '0x' + firstResult.topics[2].slice(26) : null;
      
      if (spenderAddress) {
        console.log('🔍 Testing allowance check for first result...');
        await testAllowanceCheck(tokenContract, testAddress, spenderAddress);
      }
    } else {
      console.log('⚠️ No results found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testAllowanceCheck(tokenContract, owner, spender) {
  console.log('🔍 Checking allowance:', { tokenContract, owner, spender });
  
  const ownerPadded = owner.slice(2).padStart(64, '0');
  const spenderPadded = spender.slice(2).padStart(64, '0');
  const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;
  
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_call&to=${tokenContract}&data=${data}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    console.log('📊 Allowance Response:', result);
    
    if (result.status === '1' && result.result && result.result !== '0x') {
      const allowance = BigInt(result.result).toString();
      console.log('✅ Current allowance:', allowance);
      return allowance !== '0';
    } else {
      console.log('⚠️ No allowance or error');
      return false;
    }
  } catch (error) {
    console.error('❌ Allowance check error:', error);
    return false;
  }
}

// Run test
testApprovalFetching();