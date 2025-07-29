export const REVOKE_HELPER_ADDRESS = '0xb0454f4285ab625be91285c02ad528f6d8e4efd5';

export const revokeHelperABI = [
  {
    inputs: [
      { internalType: 'address[]', name: 'tokens', type: 'address[]' },
      { internalType: 'address[]', name: 'spenders', type: 'address[]' }
    ],
    name: 'revokeERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'collections', type: 'address[]' },
      { internalType: 'address[]', name: 'operators', type: 'address[]' }
    ],
    name: 'revokeERC721',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];