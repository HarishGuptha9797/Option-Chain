import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { nseClient } from './src/lib/nse.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Routes
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

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
