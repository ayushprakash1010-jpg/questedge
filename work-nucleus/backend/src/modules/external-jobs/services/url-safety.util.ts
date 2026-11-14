import { URL } from 'url';
import * as net from 'net';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';

/**
 * Fully expands any IPv6 string into 8 16-bit numeric words.
 * Correctly handles :: expansion, hex words, and trailing dotted-decimal IPv4.
 */
export function parseIPv6Words(ip: string): number[] | null {
  const clean = ip.toLowerCase().replace(/^\[|\]$/g, '').trim();
  if (!clean) return null;

  let norm = clean;
  // Handle dotted-decimal IPv4 representation at the end (e.g. ::ffff:127.0.0.1)
  const lastColon = norm.lastIndexOf(':');
  if (lastColon !== -1) {
    const trailing = norm.substring(lastColon + 1);
    if (trailing.includes('.')) {
      const parts = trailing.split('.').map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        const hex1 = ((parts[0] << 8) | parts[1]).toString(16);
        const hex2 = ((parts[2] << 8) | parts[3]).toString(16);
        norm = norm.substring(0, lastColon) + ':' + hex1 + ':' + hex2;
      } else {
        return null;
      }
    }
  }

  const halves = norm.split('::');
  if (halves.length > 2) return null;

  let words: number[] = [];
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':').map((h) => parseInt(h, 16)) : [];
    const right = halves[1] ? halves[1].split(':').map((h) => parseInt(h, 16)) : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    words = [...left, ...new Array(missing).fill(0), ...right];
  } else {
    words = norm.split(':').map((h) => parseInt(h, 16));
  }

  if (words.length !== 8 || words.some((w) => isNaN(w) || w < 0 || w > 0xffff)) {
    return null;
  }
  return words;
}

/**
 * Checks if an IP string is in a private, loopback, link-local, or cloud metadata range.
 * Supports IPv4, standard IPv6, and all IPv4-mapped/compatible IPv6 formats.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const cleanIp = ip.trim().replace(/^\[|\]$/g, '');

  // ── IPv4 Check ────────────────────────────────────────────────────────────
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
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
    if (cleanIp === '255.255.255.255') return true;

    return false;
  }

  // ── IPv6 Check ────────────────────────────────────────────────────────────
  const words = parseIPv6Words(cleanIp);
  if (words) {
    // 1. Loopback ::1 (words 0..6 === 0 && word 7 === 1)
    if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

    // 2. Unspecified :: (all zeros)
    if (words.every((w) => w === 0)) return true;

    // 3. Unique Local Addresses (fc00::/7 -> top 7 bits are 1111110)
    if ((words[0] & 0xfe00) === 0xfc00) return true;

    // 4. Link-Local Unicast (fe80::/10 -> top 10 bits are 1111111010)
    if ((words[0] & 0xffc0) === 0xfe80) return true;

    // 5. IPv4-mapped IPv6 (::ffff:0:0/96, e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (
      words[0] === 0 &&
      words[1] === 0 &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      words[5] === 0xffff
    ) {
      const p0 = (words[6] >> 8) & 0xff;
      const p1 = words[6] & 0xff;
      const p2 = (words[7] >> 8) & 0xff;
      const p3 = words[7] & 0xff;
      return isPrivateOrReservedIp(`${p0}.${p1}.${p2}.${p3}`);
    }

    // 6. IPv4-compatible IPv6 (::/96, e.g. ::127.0.0.1 or ::7f00:1)
    if (
      words[0] === 0 &&
      words[1] === 0 &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      words[5] === 0
    ) {
      const p0 = (words[6] >> 8) & 0xff;
      const p1 = words[6] & 0xff;
      const p2 = (words[7] >> 8) & 0xff;
      const p3 = words[7] & 0xff;
      return isPrivateOrReservedIp(`${p0}.${p1}.${p2}.${p3}`);
    }

    // 7. NAT64 prefix (64:ff9b::/96)
    if (
      words[0] === 0x0064 &&
      words[1] === 0xff9b &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      words[5] === 0
    ) {
      const p0 = (words[6] >> 8) & 0xff;
      const p1 = words[6] & 0xff;
      const p2 = (words[7] >> 8) & 0xff;
      const p3 = words[7] & 0xff;
      return isPrivateOrReservedIp(`${p0}.${p1}.${p2}.${p3}`);
    }

    // 8. 6to4 prefix (2002::/16)
    if (words[0] === 0x2002) {
      const p0 = (words[1] >> 8) & 0xff;
      const p1 = words[1] & 0xff;
      const p2 = (words[2] >> 8) & 0xff;
      const p3 = words[2] & 0xff;
      return isPrivateOrReservedIp(`${p0}.${p1}.${p2}.${p3}`);
    }
  }

  return false;
}

/**
 * Checks if a hostname text is safe (no internal domains, no embedded private IPs, no loopback).
 */
export function isSafeHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const h = hostname.toLowerCase().trim();

  // Block empty or loopback names
  if (!h || h === 'localhost') return false;

  // Block internal / local domain suffixes
  if (
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.corp') ||
    h.endsWith('.lan') ||
    h === 'metadata.google.internal' ||
    h === 'instance-data'
  ) {
    return false;
  }

  // Strip brackets from IPv6 literal hostnames
  const cleanHost = h.replace(/^\[|\]$/g, '');

  // If hostname is an IP literal (IPv4 or IPv6), verify directly
  if (net.isIP(cleanHost) || cleanHost.includes(':')) {
    if (isPrivateOrReservedIp(cleanHost)) {
      return false;
    }
  }

  // Block decimal / octal / hex integer IP obfuscation (e.g. http://2130706433 or 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(cleanHost) || /^\d+$/.test(cleanHost)) {
    return false;
  }

  // Synchronously detect private IPs embedded in wildcard DNS domains (e.g. 127.0.0.1.nip.io or 10-0-0-1.sslip.io)
  const dottedMatch = h.match(/(?:^|\.)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\.|$)/);
  if (dottedMatch && isPrivateOrReservedIp(dottedMatch[1])) {
    return false;
  }
  const dashedMatch = h.match(/(?:^|\.)(\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3})(?:\.|$)/);
  if (dashedMatch) {
    const reconstructed = dashedMatch[1].replace(/-/g, '.');
    if (isPrivateOrReservedIp(reconstructed)) {
      return false;
    }
  }

  return true;
}

/**
 * Synchronous URL validator: checks scheme, IP literals, IPv6, integer formats, and embedded private IPs.
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

  return isSafeHostname(parsed.hostname);
}

/**
 * Asynchronous URL validator: performs DNS resolution to ensure domain does not resolve to private/loopback IP.
 */
export function isSafePublicUrlAsync(urlStr: string): Promise<boolean> {
  if (!isSafePublicUrl(urlStr)) {
    return Promise.resolve(false);
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return Promise.resolve(false);
  }

  const cleanHost = parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(cleanHost)) {
    return Promise.resolve(!isPrivateOrReservedIp(cleanHost));
  }

  // Allow mock test domains during unit tests without internet DNS access
  if (process.env.NODE_ENV === 'test' && cleanHost.endsWith('.example.com')) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    dns.lookup(cleanHost, { all: true }, (err, addresses) => {
      if (err) {
        // If hostname fails to resolve, let the HTTP client handle the network error
        return resolve(true);
      }
      for (const entry of addresses) {
        if (isPrivateOrReservedIp(entry.address)) {
          return resolve(false);
        }
      }
      resolve(true);
    });
  });
}

/**
 * Creates custom http and https Agents with DNS resolution pinning to prevent SSRF and DNS rebinding at socket level.
 */
export function createSsrfSafeAgent() {
  const safeLookup = (
    hostname: string,
    options: any,
    callback: (err: any, address?: any, family?: any) => void,
  ) => {
    if (!isSafeHostname(hostname)) {
      return callback(
        new Error(`SSRF Prevention: Blocked unsafe hostname ${hostname}`),
        '',
        4,
      );
    }

    dns.lookup(hostname, options as any, (err, address, family) => {
      if (err) return callback(err, address, family);

      if (Array.isArray(address)) {
        for (const item of address) {
          const ip = typeof item === 'string' ? item : item.address;
          if (isPrivateOrReservedIp(ip)) {
            return callback(
              new Error(`SSRF Prevention: DNS resolved to private IP ${ip} for ${hostname}`),
              '',
              family,
            );
          }
        }
        return callback(null, address as any, family);
      }

      if (isPrivateOrReservedIp(address)) {
        return callback(
          new Error(`SSRF Prevention: DNS resolved to private IP ${address} for ${hostname}`),
          '',
          family,
        );
      }

      callback(null, address, family);
    });
  };

  const httpAgent = new http.Agent({ lookup: safeLookup });
  const httpsAgent = new https.Agent({ lookup: safeLookup });

  return { httpAgent, httpsAgent };
}
