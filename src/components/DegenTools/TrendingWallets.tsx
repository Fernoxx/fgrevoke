'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type TopToken = { tokenName: string; symbol: string; logo?: string | null; count: number }
type TopWallet = {
  wallet: string
  tokenCount: number
  profit: string
  username?: string | null
  pfp?: string | null
}

export default function TrendingWallets() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ topTokens: TopToken[]; topWallets: TopWallet[] } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const res = await fetch('/api/trending-wallets')
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    run()
  }, [refreshKey])

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trending Wallets (last 24h)</h2>
        <Button variant="secondary" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
          {loading ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {/* Top 5 tokens row */}
      {data?.topTokens?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {data.topTokens.map((t, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <img
                  src={t.logo || '/token-fallback.png'}
                  className="w-7 h-7 rounded-full object-cover"
                  alt={t.symbol}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{t.tokenName || t.symbol}</div>
                  <div className="text-xs text-white/60">{t.symbol}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/70">Buyers in 24h: <b>{t.count}</b></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/60">{loading ? 'Loading tokens...' : 'No new tokens found in last 24h'}</div>
      )}

      {/* Wallet leaderboard */}
      <div>
        <h3 className="text-base font-semibold mb-3">Top Wallets by 24h PnL</h3>
        <div className="space-y-2">
          {data?.topWallets?.length ? (
            data.topWallets.map((w, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 text-white/70">#{i + 1}</div>
                  <img
                    src={w.pfp || '/default-pfp.png'}
                    className="w-7 h-7 rounded-full"
                    alt={w.username || w.wallet}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {w.username ? (
                        <span className="font-semibold">@{w.username}</span>
                      ) : (
                        <code className="text-xs">{w.wallet}</code>
                      )}
                    </div>
                    <div className="text-xs text-white/60">Tokens touched: {w.tokenCount}</div>
                  </div>
                  <div className="text-sm font-semibold">{Number(w.profit).toLocaleString()} USD</div>
                  <Button size="sm" variant="secondary" onClick={() => alert('Copy-trade coming soon')}>
                    Copy trades
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/60">{loading ? 'Loading wallets...' : 'No wallets ranked yet'}</div>
          )}
        </div>
      </div>
    </div>
  )
}