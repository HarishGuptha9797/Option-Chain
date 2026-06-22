import express from 'express';
import { nseClient } from '../src/lib/nse';

const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/expiries', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
    const expiries = await nseClient.getExpiries(symbol);
    res.json({ expiries });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chain', async (req, res) => {
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
});

// Export the express app as a Vercel Serverless Function
export default app;
