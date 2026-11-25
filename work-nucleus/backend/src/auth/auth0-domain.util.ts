/**
 * Strips protocol prefixes, trailing slashes, and surrounding whitespace from an
 * Auth0 domain string so URLs can be constructed consistently.
 */
export function normalizeAuth0Domain(rawDomain?: string | null): string {
  if (!rawDomain) {
    return '';
  }

  return rawDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

/**
 * Returns the deduplicated list of Auth0 token issuers accepted by JWT
 * validation. Including the canonical tenant domain alongside the custom
 * domain allows zero-downtime rollouts between frontend and backend.
 */
export function buildTrustedAuth0Issuers(
  primaryDomain?: string | null,
  canonicalDomain?: string | null,
): string[] {
  const issuers: string[] = [];
  for (const raw of [primaryDomain, canonicalDomain]) {
    const normalized = normalizeAuth0Domain(raw);
    if (!normalized) {
      continue;
    }
    const issuer = `https://${normalized}/`;
    if (!issuers.includes(issuer)) {
      issuers.push(issuer);
    }
  }
  return issuers;
}

/**
 * Resolves the trusted `/userinfo` origin for a validated JWT payload. Only
 * matches configured Auth0 domains to avoid trusting arbitrary `iss` claims.
 */
export function resolveTrustedUserInfoOrigin(
  tokenIssuer: string | undefined,
  primaryDomain?: string | null,
  canonicalDomain?: string | null,
): string {
  const primary = normalizeAuth0Domain(primaryDomain);
  const trustedOrigins = buildTrustedAuth0Issuers(
    primaryDomain,
    canonicalDomain,
  ).map((issuer) => issuer.replace(/\/+$/, ''));

  if (tokenIssuer) {
    const normalizedTokenOrigin = `https://${normalizeAuth0Domain(tokenIssuer)}`;
    if (trustedOrigins.includes(normalizedTokenOrigin)) {
      return normalizedTokenOrigin;
    }
  }

  return primary ? `https://${primary}` : trustedOrigins[0] || '';
}
