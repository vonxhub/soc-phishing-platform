export function validateUrl(url: string): boolean {
  // A very basic SSRF guard. In a real application, this would be much more robust.
  // It prevents access to local network addresses.
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Prevent access to localhost, private IPs, etc.
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname.startsWith('192.168.')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
