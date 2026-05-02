import { getDomainRisk } from '../database';

export async function calculateRiskScore(aiResult: any, enrichment: any, meta: any) {
  let score = 0;

  // AI base (weight 0.5)
  score += aiResult.riskScore * 0.5;

  // Feeds: each flagged domain +15, max 30
  score += Math.min(enrichment.feedMaliciousCount * 15, 30);

  // Sandbox malicious: +25
  if (enrichment.sandbox?.malicious) score += 25;

  // Redirect depth > 2: +5
  if ((enrichment.redirectChain?.length || 0) > 2) score += 5;

  // Typosquatting: +15
  if (enrichment.typosquatted) score += 15;

  // Domain age < 30 days: +10
  if (enrichment.domainAgeDays < 30) score += 10;

  // Domain historical risk (if available)
  if (meta.urls.length > 0) {
    for (const url of meta.urls) {
      try {
        const domain = new URL(url).hostname;
        const hist = await getDomainRisk(domain);
        if (hist && hist.sample_count > 5) {
          score += Math.min(hist.average_risk * 0.2, 20);
        }
      } catch {}
    }
  }

  return Math.min(Math.round(score), 100);
}
