import { VercelRequest, VercelResponse } from '@vercel/node';
import { nseClient } from '../src/lib/nse';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = req.query.symbol as string;
    const expiry = req.query.expiry as string;
    if (!symbol || !expiry) return res.status(400).json({ error: 'Symbol and expiry are required' });

    const [chainData, vixData] = await Promise.all([
      nseClient.getChain(symbol, expiry),
      nseClient.getVix()
    ]);

    res.json({
      chain: chainData,
      vix: vixData
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
