import { createHash } from 'crypto';

/**
 * Unit-level coverage of the chain logic without spinning up Prisma.
 * Mirrors the hash recipe used in SecurityService.append().
 */
describe('security log hash chain', () => {
  function chainHash(prev: string | null, body: string): string {
    return createHash('sha256').update((prev ?? '') + body).digest('hex');
  }

  it('first entry uses empty prev', () => {
    const h = chainHash(null, '{"a":1}');
    expect(h).toHaveLength(64);
  });

  it('hashes are deterministic and chain', () => {
    const h1 = chainHash(null, 'evt1');
    const h2 = chainHash(h1, 'evt2');
    const h3 = chainHash(h2, 'evt3');

    expect(chainHash(null, 'evt1')).toBe(h1);
    expect(chainHash(h1, 'evt2')).toBe(h2);
    expect(chainHash(h2, 'evt3')).toBe(h3);
  });

  it('tampering the middle row breaks the chain', () => {
    const h1 = chainHash(null, 'evt1');
    const h2 = chainHash(h1, 'evt2');
    const h3 = chainHash(h2, 'evt3');

    const tampered = chainHash(h1, 'evt2-tampered');
    const reChained = chainHash(tampered, 'evt3');

    expect(tampered).not.toBe(h2);
    expect(reChained).not.toBe(h3);
  });
});
