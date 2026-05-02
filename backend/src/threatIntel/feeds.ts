import axios from 'axios';
import * as psl from 'psl';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

const FEEDS = [
  { name: 'openphish', url: 'https://openphish.com/feed.txt' },
  { name: 'urlhaus', url: 'https://urlhaus.abuse.ch/downloads/text_online/' },
];

let feedState: Map<string, { hash: string; domains: Set<string> }> = new Map();
let lastFetch = 0;

async function fetchFeed(name: string, url: string) {
  const res = await axios.get(url, { timeout: 15000 });
  const hash = createHash('sha256').update(res.data).digest('hex');
  const domains = new Set<string>();
  const lines = res.data.split('\n').filter(Boolean);
  if (name === 'openphish') {
    lines.forEach((u: string) => {
      const domain = extractDomain(u.trim());
      if (domain) domains.add(domain);
    });
  } else { // urlhaus
    lines.forEach((l: string) => {
      if (l.startsWith('#')) return;
      const domain = extractDomain(l.trim());
      if (domain) domains.add(domain);
    });
  }
  return { hash, domains };
}

export async function getThreatIntelligence(urls: string[]) {
  if (Date.now() - lastFetch > 30 * 60 * 1000) {
    const newState = new Map<string, { hash: string; domains: Set<string> }>();
    for (const feed of FEEDS) {
      try {
        const prevSize = feedState.get(feed.name)?.domains.size || 0;
        const data = await fetchFeed(feed.name, feed.url);
        // Integrity check: reject if >50% size change from previous
        if (prevSize > 0 && Math.abs(data.domains.size - prevSize) / prevSize > 0.5) {
          logger.warn(`Feed ${feed.name} changed >50%, rejecting update`);
          newState.set(feed.name, feedState.get(feed.name)!);
          continue;
        }
        newState.set(feed.name, data);
      } catch (e) {
        logger.error(`Feed ${feed.name} fetch failed: ${e}`);
        if (feedState.has(feed.name)) newState.set(feed.name, feedState.get(feed.name)!);
      }
    }
    feedState = newState;
    lastFetch = Date.now();
  }

  const indicators: any[] = [];
  let maliciousCount = 0;

  for (const url of urls) {
    const domain = extractDomain(url);
    if (!domain) continue;

    const flags: string[] = [];
    for (const [feedName, { domains }] of feedState) {
      if (domains.has(domain)) flags.push(feedName);
    }
    if (flags.length >= 2) {
      maliciousCount++;
      indicators.push({
        type: 'critical',
        label: `Malicious domain (${flags.join(', ')})`,
        detail: `${domain} confirmed by multiple threat feeds`,
        severity: 10,
      });
    }
  }
  return { indicators, maliciousCount };
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    const hostname = urlObj.hostname.toLowerCase();
    const parsed = psl.parse(hostname) as any;
    return parsed.domain || hostname;
  } catch {
    return null;
  }
}
