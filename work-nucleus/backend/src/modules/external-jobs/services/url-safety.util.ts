import { URL } from 'url';
import * as net from 'net';

/**
 * Checks if an IP string is in a private, loopback, or link-local range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) {
    return false;
  }

  // IPv4 check
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [p0, p1, p2, p3] = parts;

    // 0.0.0.0/8 (Current network)
    if (p0 === 0) return true;
    // 10.0.0.0/8 (Private)
    if (p0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (p0 === 127) return true;
    // 169.254.0.0/16 (Link-Local, AWS / Cloud metadata 169.254.169.254)
    if (p0 === 169 && p1 === 254) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (p0 === 192 && p1 === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
    // 224.0.0.0/4 (Multicast)
    if (p0 >= 224 && p0 <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (p0 >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // IPv6 check
  const normalized = ip.toLowerCase();
  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified ::
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  // Unique local fc00::/7 (fd00::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local fe80::/10
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:10.0.0.1, etc.)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIp(ipv4Part);
    }
  }

  return false;
}

/**
 * Validates that a URL is a safe, publicly reachable HTTP/HTTPS URL.
 * Blocks SSRF targeting localhost, private subnets, cloud metadata, and non-http schemes.
 */
export function isSafePublicUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  // Only allow http: and https: protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Block empty or loopback hostnames
  if (!hostname || hostname === 'localhost') return false;

  // Block internal / local domain suffixes
  if (
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return false;
  }

  // Strip brackets from IPv6 literal hostnames (e.g. [::1])
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // If hostname is an IP literal, verify it's not private or reserved
  if (net.isIP(cleanHost)) {
    if (isPrivateOrReservedIp(cleanHost)) {
      return false;
    }
  }

  // Block decimal / octal / hex integer IP obfuscation (e.g. http://2130706433 or 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(cleanHost) || /^\d+$/.test(cleanHost)) {
    return false;
  }

  return true;
}
