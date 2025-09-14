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
  "function claimWithAttestation(uint256 fid,uint256 nonce,uint256 deadline,address token,address spender,bytes signature) external",
  "function fidRewardCount(uint256 fid) view returns (uint8)",
];

export const REVOKE_HELPER_ABI = [
  "function hasRevoked(address user,address token,address spender) view returns (bool)",
  "event Revoked(address indexed wallet,address indexed token,address indexed spender)",
];

export const IDREGISTRY_ABI = [
  "function custodyOf(uint256 fid) view returns (address)",
];

// ---- Clients ----
export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
});