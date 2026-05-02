import { pool } from './database';
import { logger } from './utils/logger';

export async function createAlertIfNeeded(scanId: string, message: string, severity: string) {
  await pool.query(
    'INSERT INTO alerts (scan_id, message, severity) VALUES ($1, $2, $3)',
    [scanId, message, severity]
  );
  logger.info(`New alert created for scan ${scanId}: ${message}`);
}

export async function getAlerts() {
  const { rows } = await pool.query(
    'SELECT * FROM alerts WHERE acknowledged = FALSE ORDER BY created_at DESC'
  );
  return rows;
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  await pool.query(
    'UPDATE alerts SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $2',
    [userId, alertId]
  );
  logger.info(`Alert ${alertId} acknowledged by user ${userId}`);
}
