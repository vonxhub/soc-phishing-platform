import { pool } from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function register(username: string, password: string) {
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, password_hash]);
}

export async function login(username: string, password: string) {
  const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE username = $1', [username]);
  if (!rows[0]) throw new Error('User not found');

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new Error('Invalid credentials');

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  return token;
}

export async function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
