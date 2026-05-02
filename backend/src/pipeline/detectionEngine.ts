import { extractUrls } from '../utils/heuristics';
import { enrichWithFeedsAndSandbox } from './enrichment';
import { analyzeWithAI } from '../ai/qwen';
import { persistAndAlert } from './persistence';
import { calculateRiskScore } from '../utils/riskEngine';
import { updateDomainRisk } from '../database';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

export async function detectAndRespond(content: string, contentType: string, userId: string) {
  const urls = extractUrls(content);
  const meta = { content, contentType, urls, userId };

  const enrichment = await enrichWithFeedsAndSandbox(meta);
  const aiResult = await analyzeWithAI(meta, enrichment);
  const riskScore = await calculateRiskScore(aiResult, enrichment, meta);

  const result = {
    id: uuid(),
    ...aiResult,
    riskScore,
    indicators: [...aiResult.indicators, ...enrichment.indicators],
    sandboxResult: enrichment.sandbox,
    redirectChain: enrichment.redirectChain,
  };

  await persistAndAlert(result, meta);

  // Domain risk update (single point)
  if (urls.length > 0) {
    for (const url of urls) {
      try {
        const domain = new URL(url).hostname;
        await updateDomainRisk(domain, riskScore);
      } catch (e) {
        logger.warn(`Failed to update domain risk for ${url}`);
      }
    }
  }

  return result;
}
