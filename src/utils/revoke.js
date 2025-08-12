import { ethers } from "ethers";
import { PERMIT2, MULTI_REVOKE_HUB, BASE_CHAIN_ID } from "../consts";
import { Permit2Abi } from "../abis/Permit2";
import { MultiRevokeHubAbi } from "../abis/MultiRevokeHub";
import { ERC20NameAbi, ERC20NoncesAbi, ERC20ApproveAbi } from "../abis/Erc20Bits";

function getProvider() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return provider;
}
function getSigner() {
  return getProvider().getSigner();
}

export async function isPermit2Allowance(owner, token, spender) {
  try {
    const provider = getProvider();
    const p2 = new ethers.Contract(PERMIT2, Permit2Abi, provider);
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
    const provider = getProvider();
    const erc = new ethers.Contract(token, ERC20NoncesAbi, provider);
    await erc.nonces(owner);
    return true;
  } catch {
    return false;
  }
}

export async function revokeViaPermit2Approve(token, spender) {
  const signer = getSigner();
  const hub = new ethers.Contract(MULTI_REVOKE_HUB, MultiRevokeHubAbi, signer);
  const tx = await hub.revokeWithPermit2Approve(token, spender);
  return tx.wait();
}

export async function revokeViaEip2612(token, owner, spender) {
  const provider = getProvider();
  const signer = getSigner();
  const chainId = (await provider.getNetwork()).chainId;
  if (chainId !== BASE_CHAIN_ID) throw new Error("Wrong network");

  const tokenNameContract = new ethers.Contract(token, ERC20NameAbi, provider);
  let name = "Token";
  try { name = await tokenNameContract.name(); } catch {}

  const nonces = new ethers.Contract(token, ERC20NoncesAbi, provider);
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

  const signature = await signer._signTypedData(domain, types, message);
  const sig = ethers.utils.splitSignature(signature);

  const hub = new ethers.Contract(MULTI_REVOKE_HUB, MultiRevokeHubAbi, signer);
  const tx = await hub.revokeWithPermit2612(token, owner, spender, deadline, sig.v, sig.r, sig.s);
  return tx.wait();
}

export async function revokeFallback(token, spender) {
  const signer = getSigner();
  const erc = new ethers.Contract(token, ERC20ApproveAbi, signer);
  const tx = await erc.approve(spender, 0);
  return tx.wait();
}

export async function proveRevoked(token, spender) {
  const signer = getSigner();
  const hub = new ethers.Contract(MULTI_REVOKE_HUB, MultiRevokeHubAbi, signer);
  const tx = await hub.proveRevoked(token, spender);
  return tx.wait();
}

export async function revokeAuto({ owner, token, spender, isPermit2Hint = false, wantProof = true }) {
  const p2 = isPermit2Hint || await isPermit2Allowance(owner, token, spender);
  if (p2) {
    return revokeViaPermit2Approve(token, spender);
  }

  if (await supportsEip2612(token, owner)) {
    return revokeViaEip2612(token, owner, spender);
  }

  const rc = await revokeFallback(token, spender);
  if (wantProof) await proveRevoked(token, spender);
  return rc;
}