import { ethers } from "ethers";
import { PERMIT2, MULTI_REVOKE_HUB, BASE_CHAIN_ID } from "../consts";
import { Permit2Abi } from "../abis/Permit2";
import { MultiRevokeHubAbi } from "../abis/MultiRevokeHub";
import { ERC20NameAbi, ERC20NoncesAbi, ERC20ApproveAbi } from "../abis/Erc20Bits";

const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || "";
const BASE_RPC = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://base-mainnet.public.blastapi.io";
const publicProvider = new ethers.providers.JsonRpcProvider(BASE_RPC);

// simple in-memory caches
export const cache = {
  tokenName: new Map(), // token => name
  nonce: new Map(),     // `${token}:${owner}` => BigNumber
  permit2: new Map(),   // `${owner}:${token}:${spender}` => boolean
};

// preload helper to warm caches; provider optional (defaults to public)
export async function preloadForItem({ owner, token, spender, provider = publicProvider }) {
  try {
    const ercName = new ethers.Contract(token, ERC20NameAbi, provider);
    const ercNonce = new ethers.Contract(token, ERC20NoncesAbi, provider);
    const p2 = new ethers.Contract(PERMIT2, Permit2Abi, provider);

    if (!cache.tokenName.has(token)) {
      ercName.name()
        .then((n) => cache.tokenName.set(token, n))
        .catch(() => cache.tokenName.set(token, "Token"));
    }

    const nonceKey = `${token}:${owner}`;
    if (!cache.nonce.has(nonceKey)) {
      ercNonce.nonces(owner)
        .then((n) => cache.nonce.set(nonceKey, ethers.BigNumber.from(n)))
        .catch(() => cache.nonce.set(nonceKey, ethers.BigNumber.from(0)));
    }

    const p2key = `${owner}:${token}:${spender}`;
    if (!cache.permit2.has(p2key)) {
      p2.allowance(owner, token, spender)
        .then(({ amount, expiration }) => {
          const amt = ethers.BigNumber.from(amount || 0);
          const exp = Number(expiration || 0);
          const ok = amt.gt(0) && (exp === 0 || exp > Math.floor(Date.now() / 1000));
          cache.permit2.set(p2key, ok);
        })
        .catch(() => cache.permit2.set(p2key, false));
    }
  } catch {}
}

// fast single-tx Permit2 path (skips estimation)
export async function fastPermit2Revoke(token, spender) {
  const { eip1193 } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");
  const ownerArr = await requestAccountsSafe(eip1193);
  const owner = ownerArr?.[0];
  const iface = new ethers.utils.Interface(MultiRevokeHubAbi);
  const data = iface.encodeFunctionData("revokeWithPermit2Approve", [token, spender]);
  // conservative gas limit to skip estimate
  return sendRawTx({ eip1193, owner, to: MULTI_REVOKE_HUB, data });
}

// fast EIP-2612 path using cached name/nonce; skips on-click reads
export async function fastEip2612Revoke(token, owner, spender) {
  const { eip1193, provider } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");

  const name = cache.tokenName.get(token) || "Token";
  const nonceBN = cache.nonce.get(`${token}:${owner}`) || ethers.BigNumber.from(0);
  const deadline = Math.floor(Date.now() / 1000) + 900;

  const chainId = (await provider.getNetwork()).chainId;
  const domain = { name, version: "1", chainId, verifyingContract: token };
  const types = { Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ]};
  const message = { owner, spender, value: "0", nonce: nonceBN.toString(), deadline };

  const signature = await signTypedDataResilient({ eip1193, signer: null, owner, domain, types, message });
  const sig = ethers.utils.splitSignature(signature);

  const iface = new ethers.utils.Interface(MultiRevokeHubAbi);
  const data = iface.encodeFunctionData("revokeWithPermit2612", [token, owner, spender, deadline, sig.v, sig.r, sig.s]);
  return sendRawTx({ eip1193, owner, to: MULTI_REVOKE_HUB, data });
}

// direct approve zero with fixed gas to avoid estimate
export async function directApproveZero(token, spender) {
  const { eip1193 } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");
  const ownerArr = await requestAccountsSafe(eip1193);
  const owner = ownerArr?.[0];
  const iface = new ethers.utils.Interface(ERC20ApproveAbi);
  const data = iface.encodeFunctionData("approve", [spender, 0]);
  return sendRawTx({ eip1193, owner, to: token, data });
}

async function requestAccountsSafe(eip1193) {
  try {
    return await eip1193.request?.({ method: "eth_requestAccounts" });
  } catch (e) {
    try {
      return await eip1193.request?.({ method: "eth_accounts" });
    } catch {
      return [];
    }
  }
}

async function ensureBaseChain(eip1193) {
  try {
    const hex = await eip1193.request?.({ method: "eth_chainId" });
    const current = parseInt(hex, 16);
    if (current === BASE_CHAIN_ID) return true;
    try {
      await eip1193.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
      });
      const after = parseInt(await eip1193.request?.({ method: "eth_chainId" }), 16);
      return after === BASE_CHAIN_ID;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

async function resolveProviderAndSigner(requestAcc = true) {
  let eip1193 = null;
  try {
    const { sdk } = await import("@farcaster/miniapp-sdk");
    eip1193 = sdk?.wallet?.ethProvider || null;
  } catch {}
  if (!eip1193 && typeof window !== "undefined") eip1193 = window.ethereum || null;
  if (!eip1193) throw new Error("No EIP-1193 provider available");

  if (requestAcc) await requestAccountsSafe(eip1193);
  const provider = new ethers.providers.Web3Provider(eip1193, "any");
  const signer = provider.getSigner();
  return { eip1193, provider, signer };
}

async function signTypedDataResilient({ eip1193, signer, owner, domain, types, message }) {
  if (signer?._signTypedData) {
    try {
      return await signer._signTypedData(domain, types, message);
    } catch {}
  }
  const typed = JSON.stringify({ types, domain, primaryType: "Permit", message });
  try {
    return await eip1193.request?.({ method: "eth_signTypedData_v4", params: [owner, typed] });
  } catch (e) {
    return await eip1193.request?.({ method: "eth_signTypedData", params: [owner, typed] });
  }
}

async function sendRawTx({ eip1193, owner, to, data }) {
  // Skip gas estimation to speed up wallet popup; use a conservative fixed limit
  const gasLimitHex = ethers.utils.hexlify(300000);
  const tx = { from: owner, to, data, chainId: `0x${BASE_CHAIN_ID.toString(16)}`, gas: gasLimitHex, value: "0x0" };
  return await eip1193.request({ method: "eth_sendTransaction", params: [tx] });
}

export async function isPermit2Allowance(owner, token, spender) {
  try {
    const p2 = new ethers.Contract(PERMIT2, Permit2Abi, publicProvider);
    const res = await p2.allowance(owner, token, spender);
    const amount = res.amount ? ethers.BigNumber.from(res.amount) : ethers.constants.Zero;
    const exp = res.expiration ? Number(res.expiration) : 0;
    const now = Math.floor(Date.now() / 1000);
    return amount.gt(0) && (exp === 0 || exp > now);
  } catch {
    return false;
  }
}

export async function supportsEip2612(token, owner) {
  try {
    const erc = new ethers.Contract(token, ERC20NoncesAbi, publicProvider);
    await erc.nonces(owner);
    return true;
  } catch {
    return false;
  }
}

export async function revokeViaPermit2Approve(token, spender) {
  const { eip1193 } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");
  const ownerArr = await requestAccountsSafe(eip1193);
  const owner = ownerArr?.[0];
  const iface = new ethers.utils.Interface(MultiRevokeHubAbi);
  const data = iface.encodeFunctionData("revokeWithPermit2Approve", [token, spender]);
  return sendRawTx({ eip1193, owner, to: MULTI_REVOKE_HUB, data });
}

export async function revokeViaEip2612(token, owner, spender) {
  const { eip1193, provider } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");

  const chainId = (await provider.getNetwork()).chainId;
  const tokenNameContract = new ethers.Contract(token, ERC20NameAbi, publicProvider);
  let name = "Token";
  try { name = await tokenNameContract.name(); } catch {}

  const nonces = new ethers.Contract(token, ERC20NoncesAbi, publicProvider);
  const nonce = await nonces.nonces(owner);
  const deadline = Math.floor(Date.now() / 1000) + 900;

  const domain = { name, version: "1", chainId, verifyingContract: token };
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const message = { owner, spender, value: "0", nonce: nonce.toString(), deadline };

  const signature = await signTypedDataResilient({ eip1193, signer: null, owner, domain, types, message });
  const sig = ethers.utils.splitSignature(signature);

  const iface = new ethers.utils.Interface(MultiRevokeHubAbi);
  const data = iface.encodeFunctionData("revokeWithPermit2612", [token, owner, spender, deadline, sig.v, sig.r, sig.s]);
  return sendRawTx({ eip1193, owner, to: MULTI_REVOKE_HUB, data });
}

export async function revokeFallback(token, spender) {
  const { eip1193 } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to revoke");
  const ownerArr = await requestAccountsSafe(eip1193);
  const owner = ownerArr?.[0];
  const iface = new ethers.utils.Interface(ERC20ApproveAbi);
  const data = iface.encodeFunctionData("approve", [spender, 0]);
  return sendRawTx({ eip1193, owner, to: token, data });
}

export async function proveRevoked(token, spender) {
  const { eip1193 } = await resolveProviderAndSigner(true);
  const onBase = await ensureBaseChain(eip1193);
  if (!onBase) throw new Error("Please switch to Base network to prove");
  const ownerArr = await requestAccountsSafe(eip1193);
  const owner = ownerArr?.[0];
  const iface = new ethers.utils.Interface(MultiRevokeHubAbi);
  const data = iface.encodeFunctionData("proveRevoked", [token, spender]);
  return sendRawTx({ eip1193, owner, to: MULTI_REVOKE_HUB, data });
}

export async function tryEip2612OrFallback({ owner, token, spender }) {
  try {
    return await revokeViaEip2612(token, owner, spender);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("does not support the requested method") || msg.includes("eth_signTypedData")) {
      return revokeFallback(token, spender).then(() => proveRevoked(token, spender));
    }
    throw e;
  }
}

export async function revokeAuto({ owner, token, spender, isPermit2Hint = false, wantProof = true }) {
  const p2 = isPermit2Hint || await isPermit2Allowance(owner, token, spender);
  if (p2) return revokeViaPermit2Approve(token, spender);

  if (await supportsEip2612(token, owner)) {
    return tryEip2612OrFallback({ owner, token, spender });
  }

  const rc = await revokeFallback(token, spender);
  if (wantProof) await proveRevoked(token, spender);
  return rc;
}