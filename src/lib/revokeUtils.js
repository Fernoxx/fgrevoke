import { readContract, writeContract, signTypedData } from '@wagmi/core';
import { wagmiConfig } from './wagmi';
import { MultiRevokeHubAbi, MULTI_REVOKE_HUB } from '../abis/MultiRevokeHub';

const ERC20_NAME_ABI = [{
  type: 'function',
  name: 'name',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ type: 'string' }]
}];

const ERC20_NONCES_ABI = [{
  type: 'function',
  name: 'nonces',
  stateMutability: 'view',
  inputs: [{ name: 'owner', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}];

const ERC20_APPROVE_ABI = [{
  type: 'function',
  name: 'approve',
  stateMutability: 'nonpayable',
  inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'value' }],
  outputs: [{ type: 'bool' }]
}];

export async function supportsEip2612(token, owner) {
  try {
    await readContract(wagmiConfig, { address: token, abi: ERC20_NONCES_ABI, functionName: 'nonces', args: [owner] });
    return true;
  } catch {
    return false;
  }
}

export async function safeTokenName(token) {
  try {
    return await readContract(wagmiConfig, { address: token, abi: ERC20_NAME_ABI, functionName: 'name' });
  } catch {
    return 'Token';
  }
}

function splitSig(sig) {
  const r = `0x${sig.slice(2, 66)}`;
  const s = `0x${sig.slice(66, 130)}`;
  const v = parseInt(sig.slice(130, 132), 16);
  return { v, r, s };
}

export async function revokeViaEip2612({ owner, token, spender }) {
  const chainId = wagmiConfig.state.chainId || 8453; // default base
  const name = await safeTokenName(token);
  const nonce = await readContract(wagmiConfig, { address: token, abi: ERC20_NONCES_ABI, functionName: 'nonces', args: [owner] });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 900);

  const domain = { name, version: '1', chainId, verifyingContract: token };
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };

  const message = { owner, spender, value: 0n, nonce, deadline };

  const signature = await signTypedData(wagmiConfig, {
    account: owner,
    domain,
    primaryType: 'Permit',
    types,
    message
  });

  const { v, r, s } = splitSig(signature);

  return writeContract(wagmiConfig, {
    address: MULTI_REVOKE_HUB,
    abi: MultiRevokeHubAbi,
    functionName: 'revokeWithPermit2612',
    args: [token, owner, spender, deadline, v, r, s]
  });
}

export async function revokeViaPermit2Approve({ token, spender }) {
  return writeContract(wagmiConfig, {
    address: MULTI_REVOKE_HUB,
    abi: MultiRevokeHubAbi,
    functionName: 'revokeWithPermit2Approve',
    args: [token, spender]
  });
}

export async function revokeFallbackAndProve({ token, spender }) {
  await writeContract(wagmiConfig, {
    address: token,
    abi: ERC20_APPROVE_ABI,
    functionName: 'approve',
    args: [spender, 0n]
  });

  return writeContract(wagmiConfig, {
    address: MULTI_REVOKE_HUB,
    abi: MultiRevokeHubAbi,
    functionName: 'proveRevoked',
    args: [token, spender]
  });
}

export async function revokeAuto({ owner, token, spender, isPermit2Allowance }) {
  if (await supportsEip2612(token, owner)) {
    return revokeViaEip2612({ owner, token, spender });
  }
  if (isPermit2Allowance) {
    return revokeViaPermit2Approve({ token, spender });
  }
  return revokeFallbackAndProve({ token, spender });
}