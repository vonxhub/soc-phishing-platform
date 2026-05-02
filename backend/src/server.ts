import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { initDatabase, pool, getScanHistory } from './database';
import { authMiddleware, login, register } from './auth';
import { detectAndRespond } from './pipeline/detectionEngine';
import { getAlerts, acknowledgeAlert } from './alerts';
import { generatePdfReport } from './reports';
import { logger } from './utils/logger';
import { setupSocketHandlers } from './realtime/socketManager';

// Validate JWT_SECRET on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost' }
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth
app.post('/api/login', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res, next) => {
  try {
    const { username, password } = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
    const token = await login(username, password);
    res.json({ token });
  } catch (err) { next(err); }
});
app.post('/api/register', async (req, res, next) => {
  try {
    const { username, password } = z.object({
      username: z.string().min(3),
      password: z.string().min(12).max(128)
        .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/)
    }).parse(req.body);
    await register(username, password);
    res.status(201).json({ message: 'User created' });
  } catch (err) { next(err); }
});

// Protected APIs
app.use('/api/*', authMiddleware);

const scanSchema = z.object({
  content: z.string().min(1).max(10000),
  contentType: z.enum(['auto','url','email','message']).default('auto')
});

app.post('/api/scan', async (req, res, next) => {
  try {
    const { content, contentType } = scanSchema.parse(req.body);
    const result = await detectAndRespond(content, contentType, req.userId!);
    io.to(`user-${req.userId}`).emit('scan:complete', result);
    io.emit('dashboard:update', await fetchDashboardStats());
    res.json(result);
  } catch (err) { next(err); }
});

app.get('/api/alerts', async (req, res, next) => {
  try {
    res.json(await getAlerts());
  } catch (err) { next(err); }
});
app.post('/api/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    await acknowledgeAlert(req.params.id, req.userId!);
    io.emit('alert:updated', { id: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.get('/api/history', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    res.json(await getScanHistory(req.userId!, limit));
  } catch (err) { next(err); }
});

app.post('/api/report/:scanId', async (req, res, next) => {
  try {
    const buffer = await generatePdfReport(req.params.scanId);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err) { next(err); }
});

app.get('/api/threat-graph/:scanId', async (req, res, next) => {
  try {
    const graph = await buildThreatGraph(req.params.scanId);
    res.json(graph);
  } catch (err) { next(err); }
});
app.get('/api/dashboard-stats', async (req, res, next) => {
  try {
    res.json(await fetchDashboardStats());
  } catch (err) { next(err); }
});

// WebSocket auth with error handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.userId = (payload as any).userId;
    socket.join(`user-${socket.data.userId}`);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
setupSocketHandlers(io);

// Global Zod / generic error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error(err);
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.errors });
  }
  const status = err.status || 500;
  const message = err.status ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

// ─── Startup ───
initDatabase()
  .then(() => {
    httpServer.listen(3001, () => logger.info('SOC API on port 3001'));
  })
  .catch(err => {
    logger.error('Failed to init DB', err);
    process.exit(1);
  });

// ─── Missing functions, defined here once ───
async function fetchDashboardStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS scans,
      COUNT(*) FILTER (WHERE risk_score >= 80)::int AS threats
    FROM scans WHERE created_at > NOW() - INTERVAL '24 hours'
  `);
  return rows[0] || { scans: 0, threats: 0 };
}

async function buildThreatGraph(scanId: string) {
  const scan = await pool.query(`SELECT sandbox_result, redirect_chain FROM scans WHERE id = $1`, [scanId]);
  if (!scan.rows[0]) return { nodes: [], links: [] };
  const sand = scan.rows[0].sandbox_result || {};
  const chain = scan.rows[0].redirect_chain || [];
  const nodes: any[] = [{ id: 'scan', label: 'Scan' }];
  const links: any[] = [];
  chain.forEach((url: string, i: number) => {
    nodes.push({ id: `url-${i}`, label: url });
  });

  // Add sandbox results to graph
  if (sand.finalUrl && sand.finalUrl !== chain[chain.length - 1]) {
    nodes.push({ id: 'final', label: sand.finalUrl });
    links.push({ source: `url-${chain.length - 1}`, target: 'final' });
  }
  if (sand.malicious) {
    nodes.push({ id: 'malicious', label: 'Malicious Content Detected', color: 'red' });
    links.push({ source: 'final', target: 'malicious' });
  }

  return { nodes, links };
}
