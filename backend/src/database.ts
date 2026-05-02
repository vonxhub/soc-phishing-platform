import { Pool } from 'pg';
import { logger } from './utils/logger';

export const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

export async function initDatabase() {
  try {
    await pool.connect();
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scans (
        id UUID PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        verdict VARCHAR(50) NOT NULL,
        risk_score INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        attack_type VARCHAR(255),
        summary TEXT,
        indicators JSONB,
        recommendation TEXT,
        technical_details JSONB,
        mitre_tactics JSONB,
        similar_campaigns TEXT,
        sandbox_result JSONB,
        redirect_chain JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        scan_id UUID REFERENCES scans(id),
        message TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_by INTEGER REFERENCES users(id),
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS domain_risk (
        domain VARCHAR(255) PRIMARY KEY,
        total_risk_score INTEGER DEFAULT 0,
        sample_count INTEGER DEFAULT 0,
        average_risk NUMERIC DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('Database initialized successfully');
  } catch (err) {
    logger.error('Error initializing database', err);
    throw err;
  }
}

export async function getScanHistory(userId: string, limit: number) {
  const { rows } = await pool.query(
    `SELECT id, content, verdict, risk_score, created_at FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function updateDomainRisk(domain: string, riskScore: number) {
  await pool.query(
    `INSERT INTO domain_risk (domain, total_risk_score, sample_count, average_risk)
     VALUES ($1, $2, 1, $2)
     ON CONFLICT (domain) DO UPDATE SET
       total_risk_score = domain_risk.total_risk_score + $2,
       sample_count = domain_risk.sample_count + 1,
       average_risk = (domain_risk.total_risk_score + $2) / (domain_risk.sample_count + 1),
       last_updated = CURRENT_TIMESTAMP`,
    [domain, riskScore]
  );
}

export async function getDomainRisk(domain: string) {
  const { rows } = await pool.query(
    `SELECT total_risk_score, sample_count, average_risk FROM domain_risk WHERE domain = $1`,
    [domain]
  );
  return rows[0];
}
