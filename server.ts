import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app';

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite Development or Production Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PokéBinder server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start PokéBinder server:', err);
  process.exit(1);
});
