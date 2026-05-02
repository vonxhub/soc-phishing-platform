import { pool } from '../database';
import { createAlertIfNeeded } from '../alerts';

export async function persistAndAlert(result: any, meta: any) {
  await pool.query(
    `INSERT INTO scans (id, user_id, content, content_type, verdict, risk_score, confidence, attack_type, summary, indicators, recommendation, technical_details, mitre_tactics, similar_campaigns, sandbox_result, redirect_chain)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      result.id, meta.userId, meta.content, meta.contentType,
      result.verdict, result.riskScore, result.confidence, result.attackType,
      result.summary, JSON.stringify(result.indicators), result.recommendation,
      JSON.stringify(result.technicalDetails), JSON.stringify(result.mitreTactics),
      result.similarCampaigns, JSON.stringify(result.sandboxResult),
      JSON.stringify(result.redirectChain),
    ]
  );
  if (result.riskScore >= 80) {
    await createAlertIfNeeded(result.id, `High risk phishing detected: ${result.verdict}`, 'CRITICAL');
  }
}
