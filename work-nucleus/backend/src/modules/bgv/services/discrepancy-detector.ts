import { BgvCheckType, BgvFinding } from '@prisma/client';

export interface DiscrepancyHit {
  rule: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

/**
 * Heuristic discrepancy detection — runs on every check completion. Conservative
 * by design: false positives surface as a SupportTicket for manual review,
 * never auto-block the candidate.
 */
export function detectDiscrepancies(
  type: BgvCheckType,
  vendorResponse: any,
  candidate: { name: string },
  applicationContext?: { resumeEducation?: any[]; resumeEmployment?: any[] },
): DiscrepancyHit[] {
  const hits: DiscrepancyHit[] = [];

  if (type === BgvCheckType.PAN || type === BgvCheckType.AADHAAR) {
    const vendorName = (vendorResponse?.name ?? vendorResponse?.full_name ?? '').toString();
    if (vendorName && levenshtein(vendorName.toLowerCase(), candidate.name.toLowerCase()) > 2) {
      hits.push({
        rule: 'identity.name_mismatch',
        severity: 'HIGH',
        message: `${type} record name "${vendorName}" diverges from candidate name "${candidate.name}"`,
      });
    }
  }

  if (type === BgvCheckType.EDUCATION) {
    const verified = vendorResponse?.degrees ?? vendorResponse?.education ?? [];
    const claimed = applicationContext?.resumeEducation ?? [];
    if (claimed.length > 0 && verified.length === 0) {
      hits.push({
        rule: 'education.verification_empty',
        severity: 'MEDIUM',
        message: 'Candidate listed education but no verified degrees returned by vendor',
      });
    }
    for (const c of claimed) {
      const match = verified.find((v: any) => similarTitle(v.degree, c.degree));
      if (!match) continue;
      if (c.endYear && match.endYear && Math.abs(Number(c.endYear) - Number(match.endYear)) > 1) {
        hits.push({
          rule: 'education.date_mismatch',
          severity: 'MEDIUM',
          message: `Education end year mismatch for ${c.degree}: claimed ${c.endYear}, verified ${match.endYear}`,
        });
      }
    }
  }

  if (type === BgvCheckType.EMPLOYMENT_HISTORY) {
    const verified = vendorResponse?.employments ?? vendorResponse?.employment ?? [];
    const claimed = applicationContext?.resumeEmployment ?? [];
    for (const c of claimed) {
      const match = verified.find((v: any) => similarCompany(v.company, c.company));
      if (!match) {
        hits.push({
          rule: 'employment.company_mismatch',
          severity: 'MEDIUM',
          message: `Employment at "${c.company}" listed by candidate not found in vendor response`,
        });
      }
    }
  }

  if (type === BgvCheckType.CRIMINAL_COURT || type === BgvCheckType.POLICE_VERIFICATION) {
    const records = vendorResponse?.records ?? vendorResponse?.cases ?? [];
    if (Array.isArray(records) && records.length > 0) {
      hits.push({
        rule: 'criminal.records_present',
        severity: 'HIGH',
        message: `Criminal/police check returned ${records.length} record(s) — manual review required`,
      });
    }
  }

  return hits;
}

export function findingFromHits(hits: DiscrepancyHit[]): BgvFinding {
  if (hits.length === 0) return BgvFinding.CLEAR;
  return BgvFinding.DISCREPANCY;
}

function similarTitle(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

function similarCompany(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(ltd|limited|pvt|private|inc|incorporated|llp|corp|corporation)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
  return norm(a) === norm(b);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev: number[] = new Array(n + 1);
  const cur: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}
