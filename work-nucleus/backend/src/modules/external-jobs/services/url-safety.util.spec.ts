import {
  isPrivateOrReservedIp,
  isSafePublicUrl,
  isSafePublicUrlAsync,
  parseIPv6Words,
} from './url-safety.util';

describe('URL Safety & SSRF Prevention Utility', () => {
  describe('parseIPv6Words', () => {
    it('correctly expands IPv4-mapped IPv6 in hex (::ffff:7f00:1)', () => {
      const words = parseIPv6Words('::ffff:7f00:1');
      expect(words).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 0x0001]);
    });

    it('correctly expands IPv4-mapped IPv6 in dotted decimal (::ffff:127.0.0.1)', () => {
      const words = parseIPv6Words('::ffff:127.0.0.1');
      expect(words).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 0x0001]);
    });
  });

  describe('isPrivateOrReservedIp', () => {
    it('detects IPv4 loopback (127.0.0.1)', () => {
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('127.255.0.1')).toBe(true);
    });

    it('detects AWS/cloud metadata IP (169.254.169.254)', () => {
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);
    });

    it('detects RFC 1918 private subnets', () => {
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('10.254.254.254')).toBe(true);
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.0.254')).toBe(true);
    });

    it('detects 0.0.0.0 and broadcast', () => {
      expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
      expect(isPrivateOrReservedIp('255.255.255.255')).toBe(true);
    });

    it('detects IPv6 loopback and unique-local', () => {
      expect(isPrivateOrReservedIp('::1')).toBe(true);
      expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    });

    it('detects IPv4-mapped IPv6 loopback in hex and dotted decimal', () => {
      expect(isPrivateOrReservedIp('::ffff:7f00:1')).toBe(true);
      expect(isPrivateOrReservedIp('[::ffff:7f00:1]')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('[::ffff:127.0.0.1]')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:a00:1')).toBe(true); // 10.0.0.1 in hex
      expect(isPrivateOrReservedIp('::ffff:c0a8:101')).toBe(true); // 192.168.1.1 in hex
    });

    it('allows public IPs', () => {
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('142.250.190.46')).toBe(false);
      expect(isPrivateOrReservedIp('2607:f8b0:4005:805::200e')).toBe(false);
    });
  });

  describe('isSafePublicUrl', () => {
    it('allows valid public HTTPS and HTTP URLs', () => {
      expect(isSafePublicUrl('https://boards.greenhouse.io/job/123')).toBe(true);
      expect(isSafePublicUrl('https://jobs.lever.co/company/abc')).toBe(true);
      expect(isSafePublicUrl('http://example.com/careers')).toBe(true);
    });

    it('blocks dangerous URL schemes', () => {
      expect(isSafePublicUrl('file:///etc/passwd')).toBe(false);
      expect(isSafePublicUrl('ftp://example.com')).toBe(false);
      expect(isSafePublicUrl('javascript:alert(1)')).toBe(false);
      expect(isSafePublicUrl('data:text/html,<html>')).toBe(false);
    });

    it('blocks loopback and localhost hosts', () => {
      expect(isSafePublicUrl('http://localhost:3000/api')).toBe(false);
      expect(isSafePublicUrl('http://127.0.0.1:8080')).toBe(false);
      expect(isSafePublicUrl('http://127.0.0.2/job')).toBe(false);
      expect(isSafePublicUrl('http://[::1]:80')).toBe(false);
      expect(isSafePublicUrl('http://app.localhost')).toBe(false);
    });

    it('blocks hex IPv4-mapped IPv6 loopback [::ffff:7f00:1]', () => {
      expect(isSafePublicUrl('http://[::ffff:7f00:1]/')).toBe(false);
      expect(isSafePublicUrl('https://[::ffff:7f00:1]:8080/path')).toBe(false);
    });

    it('blocks wildcard DNS services embedding private IPs (nip.io, sslip.io)', () => {
      expect(isSafePublicUrl('http://127.0.0.1.nip.io/')).toBe(false);
      expect(isSafePublicUrl('http://test.127.0.0.1.nip.io/')).toBe(false);
      expect(isSafePublicUrl('http://10.0.0.1.nip.io/')).toBe(false);
      expect(isSafePublicUrl('http://192.168.1.1.nip.io/')).toBe(false);
      expect(isSafePublicUrl('http://127-0-0-1.sslip.io/')).toBe(false);
    });

    it('blocks AWS and cloud metadata addresses', () => {
      expect(isSafePublicUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
      expect(isSafePublicUrl('http://instance-data/latest/meta-data/')).toBe(false);
    });

    it('blocks RFC 1918 private subnets', () => {
      expect(isSafePublicUrl('http://10.0.0.5/api')).toBe(false);
      expect(isSafePublicUrl('http://172.20.0.1/')).toBe(false);
      expect(isSafePublicUrl('http://192.168.1.100:8000')).toBe(false);
    });

    it('blocks obfuscated IP formats', () => {
      expect(isSafePublicUrl('http://2130706433/')).toBe(false); // Decimal for 127.0.0.1
      expect(isSafePublicUrl('http://0x7f000001/')).toBe(false); // Hex for 127.0.0.1
    });

    it('handles malformed or empty URLs safely', () => {
      expect(isSafePublicUrl('')).toBe(false);
      expect(isSafePublicUrl('not-a-url')).toBe(false);
      expect(isSafePublicUrl(null as any)).toBe(false);
      expect(isSafePublicUrl(undefined as any)).toBe(false);
    });
  });

  describe('isSafePublicUrlAsync (DNS lookup verification)', () => {
    it('rejects domains that resolve to loopback (127.0.0.1.nip.io)', async () => {
      const isSafe = await isSafePublicUrlAsync('http://127.0.0.1.nip.io/');
      expect(isSafe).toBe(false);
    });

    it('rejects hex IPv4-mapped loopback', async () => {
      const isSafe = await isSafePublicUrlAsync('http://[::ffff:7f00:1]/');
      expect(isSafe).toBe(false);
    });
  });
});
