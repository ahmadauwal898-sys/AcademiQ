import express from 'express';
import path from 'node:path';
import apiRouter from './api';
import { initDatabase, flushDatabaseToDisk } from './db';

// Initialize SQLite database and tables synchronously on boot
try {
  initDatabase();
} catch (dbErr) {
  console.error('[DB Boot Error] Could not initialize database:', dbErr);
}

const app = express();

// Global CORS & preflight headers for Vercel and cross-origin previews
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Auto-checkpoint SQLite WAL to disk after mutations
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          flushDatabaseToDisk();
        } catch (_) {}
      }
    });
  }
  next();
});

// Request logger for API calls
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl?.startsWith('/api') || req.url?.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoints (available at /api/health and /health)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    app: 'AcademiQ',
    version: '1.0.0',
    platform: process.env.VERCEL ? 'vercel_serverless' : 'node_server',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Explicit PWA Service Worker endpoint
app.get(['/sw.js', '/service-worker.js'], (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const swPath = path.resolve(process.cwd(), 'public', 'sw.js');
  res.sendFile(swPath);
});

// Explicit PWA Manifest endpoint
app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=UTF-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const manifestPath = path.resolve(process.cwd(), 'public', 'manifest.webmanifest');
  res.sendFile(manifestPath);
});

// Mount API Router at BOTH '/api' AND '/'
// This guarantees that whether Vercel preserves the prefix or rewrites to root, all endpoints succeed!
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global unhandled error handler to prevent 500 crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Unhandled Error]', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || 'Internal Server Error'
    });
  }
});

export default app;
