import { Address4, Address6 } from 'ip-address';
import { URL } from 'url';

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // 1. Protocol validation
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    const hostname = urlObj.hostname.toLowerCase();

    // 2. Basic hostname checks
    if (hostname === 'localhost' || hostname === '::1') {
      return false;
    }

    // 3. IP Address validation (including IPv6 and encoded IPs)
    let ip: string = hostname;
    
    // Handle bracketed IPv6
    if (ip.startsWith('[') && ip.endsWith(']')) {
      ip = ip.slice(1, -1);
    }

    try {
      if (ip.includes(':')) {
        const addr6 = new Address6(ip);
        if (isPrivateIPv6(addr6)) return false;
      } else {
        // This also handles some forms of encoded IPs if they can be parsed
        const addr4 = new Address4(ip);
        if (isPrivateIPv4(addr4)) return false;
      }
    } catch {
      // Not an IP address, continue to DNS checks
    }

    // 4. DNS Rebinding protection (basic)
    // In a real app, you'd resolve the DNS and check the resulting IP.
    // Since we can't easily do async DNS resolution here without changing the signature,
    // we'll focus on blocking known internal/private hostnames.
    const privateHostSuffixes = ['.local', '.internal', '.lan', '.home.arpa'];
    if (privateHostSuffixes.some(suffix => hostname.endsWith(suffix))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIPv4(addr: Address4): boolean {
  // Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
  return addr.isInSubnet(new Address4('10.0.0.0/8')) ||
         addr.isInSubnet(new Address4('172.16.0.0/12')) ||
         addr.isInSubnet(new Address4('192.168.0.0/16')) ||
         addr.isInSubnet(new Address4('127.0.0.0/8')) ||
         addr.isInSubnet(new Address4('169.254.0.0/16')) ||
         addr.isInSubnet(new Address4('0.0.0.0/8'));
}

function isPrivateIPv6(addr: Address6): boolean {
  // Private/Local ranges: ::1/128, fc00::/7, fe80::/10
  return addr.isInSubnet(new Address6('::1/128')) ||
         addr.isInSubnet(new Address6('fc00::/7')) ||
         addr.isInSubnet(new Address6('fe80::/10')) ||
         addr.isInSubnet(new Address6('::/128'));
}
