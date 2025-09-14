import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// ---- Contract addresses ----
export const CONTRACTS = {
  revokeAndClaim: "0x9fd4b132091e308cd834814680e020f26d1ec470", // Base
  revokeHelper: "0x3acb4672fec377bd62cf4d9a0e6bdf5f10e5caaf",   // Base
  idRegistry: "0x00000000fc6c5f01fc30151999387bb99a9f489b",     // Optimism
};

// ---- ABIs ----
export const REVOKE_AND_CLAIM_ABI = [
  {
    "type": "function",
    "name": "claimWithAttestation",
    "inputs": [
      { "name": "fid", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "token", "type": "address" },
      { "name": "spender", "type": "address" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fidRewardCount",
    "inputs": [
      { "name": "fid", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint8" }
    ],
    "stateMutability": "view"
  }
];

export const REVOKE_HELPER_ABI = [
  {
    "type": "function",
    "name": "hasRevoked",
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Revoked",
    "inputs": [
      { "name": "wallet", "type": "address", "indexed": true },
      { "name": "token", "type": "address", "indexed": true },
      { "name": "spender", "type": "address", "indexed": true }
    ]
  }
];

export const IDREGISTRY_ABI = [
  {
    "type": "function",
    "name": "custodyOf",
    "inputs": [
      { "name": "fid", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view"
  }
];

// ---- Clients ----
export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
});