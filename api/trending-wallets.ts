import type { VercelRequest, VercelResponse } from '@vercel/node'
// Adjust this import if your trendingWallets file lives elsewhere
import { getTrendingWallets } from '../src/lib/trendingWallets'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const data = await getTrendingWallets()
    res.status(200).json(data)
  } catch (e: any) {
    console.error('trending-wallets error', e)
    res.status(500).json({ error: e?.message || 'failed' })
  }
}