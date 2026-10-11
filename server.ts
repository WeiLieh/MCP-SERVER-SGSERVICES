import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthHandler from './api/health.js';
import busHandler from './api/bus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.all('/api/health', async (req, res) => {
    await healthHandler(req, res);
  });

  app.all('/api/health.js', async (req, res) => {
    await healthHandler(req, res);
  });

  app.all('/api/bus', async (req, res) => {
    await busHandler(req, res);
  });

  app.all('/api/bus.js', async (req, res) => {
    await busHandler(req, res);
  });

  app.all('/api/weather', async (req, res) => {
    await busHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
