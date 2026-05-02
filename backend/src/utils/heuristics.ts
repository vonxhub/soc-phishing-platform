import { URL } from 'url';
import * as psl from 'psl';

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
    if (parsed.domain && parsed.domain !== hostname) {
      // This is a very basic check. A real typosquatting detection would involve
      // comparing against known legitimate domains and using various algorithms.
      // For now, we'll just flag if the hostname is not the same as the parsed domain
      // (e.g., a subdomain that looks like a different domain).
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function analyzeDomainAge(url: string): Promise<number> {
  // This is a placeholder. Real domain age analysis would require WHOIS lookups
  // or external APIs, which are outside the scope of this example.
  // For demonstration, we'll return a random age between 1 and 3650 days.
  return Math.floor(Math.random() * 3650) + 1;
}
