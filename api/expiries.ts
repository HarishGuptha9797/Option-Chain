import { VercelRequest, VercelResponse } from '@vercel/node';
import { nseClient } from '../src/lib/nse';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = req.query.symbol as string;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
    const expiries = await nseClient.getExpiries(symbol);
    res.json({ expiries });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
