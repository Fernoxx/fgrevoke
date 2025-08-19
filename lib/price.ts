let last = 0;
let cached = 3000; // default ETH/USD

export async function getEthUsd(): Promise<number> {
  const now = Date.now();
  if (now - last < 60_000) return cached;
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
  const j = await res.json();
  const n = Number((j as any)?.ethereum?.usd);
  if (Number.isFinite(n) && n > 0) { cached = n; last = now; }
  return cached;
}

export async function weiForUsd(usd = 0.10): Promise<bigint> {
  const ethUsd = await getEthUsd();       // e.g. 3000
  const eth = usd / ethUsd;               // 0.10 / 3000 = 0.000033...
  return BigInt(Math.floor(eth * 1e18));  // to wei
}

