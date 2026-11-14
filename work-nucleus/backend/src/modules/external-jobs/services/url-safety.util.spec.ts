import { isPrivateOrReservedIp, isSafePublicUrl } from './url-safety.util';

describe('URL Safety & SSRF Prevention Utility', () => {
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
      expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:169.254.169.254')).toBe(true);
    });

    it('allows public IPs', () => {
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('142.250.190.46')).toBe(false);
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
});
