// pages/api/trending-wallets.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTrendingWallets } from '@/lib/trendingWallets' // this is the file in your canvas

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getTrendingWallets()
    res.status(200).json(data)
  } catch (e: any) {
    console.error('trending-wallets error', e)
    res.status(500).json({ error: e?.message || 'failed' })
  }
}