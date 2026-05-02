import { URL } from 'url';
import * as psl from 'psl';
import { levenshteinEditDistance } from 'levenshtein-edit-distance';

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

export function isTyposquatting(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parsed = psl.parse(hostname) as any;
    if (!parsed.domain) return false;

    const domain = parsed.sld; // second-level domain
    const popularDomains = ['google', 'microsoft', 'apple', 'amazon', 'facebook', 'netflix', 'paypal', 'github'];

    for (const popular of popularDomains) {
      if (domain === popular) return false;
      const distance = levenshteinEditDistance(domain, popular);
      // If the domain is very similar to a popular one (distance 1 or 2), flag it
      if (distance > 0 && distance <= 2) {
        return true;
      }
    }

    // Check for common typosquatting patterns like 'g00gle' or 'paypa1'
    const substitutions: { [key: string]: string } = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's' };
    let normalizedDomain = domain;
    for (const [char, sub] of Object.entries(substitutions)) {
      normalizedDomain = normalizedDomain.replace(new RegExp(char, 'g'), sub);
    }

    if (normalizedDomain !== domain) {
      for (const popular of popularDomains) {
        if (normalizedDomain === popular) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function analyzeDomainAge(url: string): Promise<number> {
  // This is a placeholder. Real domain age analysis would require WHOIS lookups
  // or external APIs. For now, we return -1 to indicate "unknown".
  return -1;
}
