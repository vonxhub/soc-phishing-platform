import { getThreatIntelligence } from '../threatIntel/feeds';
import { runSandbox } from '../threatIntel/sandbox';
import { isTyposquatting, analyzeDomainAge } from '../utils/heuristics';
import { validateUrl } from '../utils/ssrfGuard';

export async function enrichWithFeedsAndSandbox(meta: any) {
  const { urls } = meta;
  const indicators: any[] = [];
  let feedMaliciousCount = 0;
  let typosquatted = false;
  let domainAgeDays = 365;
  let sandbox = null;
  let redirectChain = null;

  if (urls.length > 0) {
    const feedRes = await getThreatIntelligence(urls);
    indicators.push(...feedRes.indicators);
    feedMaliciousCount = feedRes.maliciousCount;

    for (const url of urls) {
      if (isTyposquatting(url)) { typosquatted = true; indicators.push({ type:'warning', label:'Typosquatting', severity:7 }); }
      domainAgeDays = await analyzeDomainAge(url);
      break;
    }

    const firstUrl = urls[0];
    if (validateUrl(firstUrl)) {
      try {
        sandbox = await runSandbox(firstUrl);
        if (sandbox.indicators) indicators.push(...sandbox.indicators);
        redirectChain = sandbox.redirectChain;
      } catch (e) { /* sandbox failed gracefully */ }
    }
  }

  return { indicators, feedMaliciousCount, typosquatted, domainAgeDays, sandbox, redirectChain };
}
