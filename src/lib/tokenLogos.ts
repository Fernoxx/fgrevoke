// lib/tokenLogos.ts
let cgList: any | null = null
let cgFetchedAt = 0

export async function getCoinGeckoList() {
  const CACHE_MS = 6 * 60 * 60 * 1000 // 6h
  if (cgList && Date.now() - cgFetchedAt < CACHE_MS) return cgList
  const res = await fetch('https://tokens.coingecko.com/uniswap/all.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch CoinGecko token list')
  cgList = await res.json()
  cgFetchedAt = Date.now()
  return cgList
}

export async function logoFromCoinGecko(addrOrSymbol: string) {
  const list = await getCoinGeckoList()
  const lower = addrOrSymbol.toLowerCase()
  const match =
    list.tokens.find((t: any) => t.address?.toLowerCase() === lower) ||
    list.tokens.find((t: any) => t.symbol?.toLowerCase() === lower)
  return match?.logoURI || null
}

// fallback for common ERC logos (works for many Base tokens too)
export function trustWalletLogo(address: string) {
  const checksummed = address.startsWith('0x') ? address : `0x${address}`
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksummed}/logo.png`
}