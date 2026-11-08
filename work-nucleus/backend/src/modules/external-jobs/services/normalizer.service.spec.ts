import { NormalizerService } from './normalizer.service';
import { RawExternalJob } from '../connectors/connector.interface';

describe('NormalizerService', () => {
  let service: NormalizerService;

  beforeEach(() => {
    service = new NormalizerService();
  });

  // ── Helper to create a minimal raw job ────────────────────────────
  function makeRawJob(overrides: Partial<RawExternalJob> = {}): RawExternalJob {
    return {
      sourceId: 'test-123',
      title: 'Software Engineer',
      companyName: 'TestCo',
      applyUrl: 'https://example.com/apply',
      isRemote: false,
      tags: [],
      ...overrides,
    } as RawExternalJob;
  }

  // ── normalize() ───────────────────────────────────────────────────

  describe('normalize()', () => {
    it('should return a valid NormalizedJob with all required fields', () => {
      const raw = makeRawJob();
      const result = service.normalize(raw, 'greenhouse');

      expect(result.sourceName).toBe('greenhouse');
      expect(result.sourceId).toBe('test-123');
      expect(result.title).toBe('Software Engineer');
      expect(result.companyName).toBe('TestCo');
      expect(result.applyUrl).toBe('https://example.com/apply');
      expect(result.applyType).toBe('redirect');
      expect(result.isActive).toBe(true);
      expect(result.contentHash).toBeDefined();
      expect(result.urlHash).toBeDefined();
      expect(Array.isArray(result.extractedSkills)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should pass through salary fields', () => {
      const raw = makeRawJob({
        salaryMin: 1000000,
        salaryMax: 2000000,
        salaryCurrency: 'INR',
        salaryPeriod: 'yearly',
        salaryRaw: '₹10L - ₹20L',
      });
      const result = service.normalize(raw, 'lever');
      expect(result.salaryMin).toBe(1000000);
      expect(result.salaryMax).toBe(2000000);
      expect(result.salaryCurrency).toBe('INR');
    });

    it('should generate descriptionSnippet from HTML when no plain text', () => {
      const raw = makeRawJob({
        descriptionHtml: '<p>We are looking for a <strong>Node.js</strong> developer to join our team. Must have experience with React and TypeScript.</p>',
        descriptionPlain: undefined,
      });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.descriptionSnippet).toBeDefined();
      expect(result.descriptionSnippet!.length).toBeLessThanOrEqual(200);
      expect(result.descriptionPlain).toContain('Node.js');
    });
  });

  // ── Location Normalization ────────────────────────────────────────

  describe('location normalization', () => {
    it('should normalize Bangalore → Bengaluru', () => {
      const raw = makeRawJob({ locationRaw: 'Bangalore, India' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.city).toBe('Bengaluru');
      expect(result.state).toBe('Karnataka');
      expect(result.country).toBe('IN');
    });

    it('should normalize Bombay → Mumbai', () => {
      const raw = makeRawJob({ locationRaw: 'Bombay' });
      const result = service.normalize(raw, 'lever');
      expect(result.city).toBe('Mumbai');
      expect(result.state).toBe('Maharashtra');
    });

    it('should normalize Gurgaon → Gurugram', () => {
      const raw = makeRawJob({ locationRaw: 'Gurgaon, Haryana' });
      const result = service.normalize(raw, 'lever');
      expect(result.city).toBe('Gurugram');
      expect(result.state).toBe('Haryana');
    });

    it('should normalize Calcutta → Kolkata', () => {
      const raw = makeRawJob({ locationRaw: 'Calcutta' });
      const result = service.normalize(raw, 'lever');
      expect(result.city).toBe('Kolkata');
      expect(result.state).toBe('West Bengal');
    });

    it('should normalize Trivandrum → Thiruvananthapuram', () => {
      const raw = makeRawJob({ locationRaw: 'Trivandrum' });
      const result = service.normalize(raw, 'lever');
      expect(result.city).toBe('Thiruvananthapuram');
      expect(result.state).toBe('Kerala');
    });

    it('should normalize Vizag → Visakhapatnam', () => {
      const raw = makeRawJob({ locationRaw: 'Vizag, Andhra Pradesh' });
      const result = service.normalize(raw, 'lever');
      expect(result.city).toBe('Visakhapatnam');
      expect(result.state).toBe('Andhra Pradesh');
    });

    it('should use provided city directly if already canonical', () => {
      const raw = makeRawJob({ city: 'Pune', country: 'IN' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.city).toBe('Pune');
      expect(result.state).toBe('Maharashtra');
    });

    it('should detect US country from location string', () => {
      const raw = makeRawJob({ locationRaw: 'San Francisco, USA' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.country).toBe('US');
    });

    it('should detect UK country from location string', () => {
      const raw = makeRawJob({ locationRaw: 'London, United Kingdom' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.country).toBe('GB');
    });

    it('should build remote location string', () => {
      const raw = makeRawJob({ locationRaw: 'Pune, India', isRemote: true });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.location).toContain('Remote');
      expect(result.isRemote).toBe(true);
    });

    it('should return "Remote" when no location and isRemote', () => {
      const raw = makeRawJob({ isRemote: true });
      const result = service.normalize(raw, 'remotive');
      expect(result.location).toBe('Remote');
    });
  });

  // ── Skill Extraction ──────────────────────────────────────────────

  describe('extractSkills()', () => {
    it('should extract known skills from description text', () => {
      const skills = service.extractSkills(
        'We need a developer with React, Node.js, and TypeScript experience',
        'Full Stack Developer',
        [],
      );
      expect(skills).toContain('React');
      expect(skills).toContain('Typescript');
    });

    it('should extract skills from title', () => {
      const skills = service.extractSkills(
        'Build modern applications',
        'Python Django Developer',
        [],
      );
      expect(skills).toContain('Python');
      expect(skills).toContain('Django');
    });

    it('should extract skills from tags', () => {
      const skills = service.extractSkills(
        'Great opportunity',
        'Developer',
        ['python', 'aws', 'docker'],
      );
      expect(skills).toContain('Python');
      expect(skills).toContain('Aws');
      expect(skills).toContain('Docker');
    });

    it('should not exceed 30 skills', () => {
      const lotsOfSkills =
        'javascript typescript python java go rust ruby php react angular vue nextjs nodejs express nestjs django flask fastapi spring rails aws azure gcp docker kubernetes terraform postgresql mysql mongodb redis elasticsearch graphql kafka html css tailwind git linux devops';
      const skills = service.extractSkills(lotsOfSkills, 'Engineer', []);
      expect(skills.length).toBeLessThanOrEqual(30);
    });

    it('should return empty for irrelevant text', () => {
      const skills = service.extractSkills(
        'We are looking for a janitor',
        'Office Cleaner',
        [],
      );
      expect(skills.length).toBe(0);
    });
  });

  // ── Experience Level Inference ────────────────────────────────────

  describe('experience level inference', () => {
    it('should detect Intern from title', () => {
      const raw = makeRawJob({ title: 'Software Engineer Intern' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.experienceLevel).toBe('Intern');
    });

    it('should detect Fresher from description', () => {
      const raw = makeRawJob({
        title: 'Developer',
        descriptionPlain: 'This is a fresher position',
      });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.experienceLevel).toBe('Fresher');
    });

    it('should detect Senior from title', () => {
      const raw = makeRawJob({ title: 'Senior Software Engineer' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.experienceLevel).toBe('Senior');
    });

    it('should detect Lead/Manager from title', () => {
      const raw = makeRawJob({ title: 'Engineering Manager' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.experienceLevel).toBe('Lead');
    });

    it('should return undefined for ambiguous title', () => {
      const raw = makeRawJob({ title: 'Software Engineer' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.experienceLevel).toBeUndefined();
    });
  });

  // ── Workplace Type Normalization ──────────────────────────────────

  describe('workplace type normalization', () => {
    it('should normalize "remote" type', () => {
      const raw = makeRawJob({ workplaceType: 'remote' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.workplaceType).toBe('Remote');
    });

    it('should normalize "hybrid" type', () => {
      const raw = makeRawJob({ workplaceType: 'hybrid' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.workplaceType).toBe('Hybrid');
    });

    it('should normalize "on-site" type', () => {
      const raw = makeRawJob({ workplaceType: 'on-site' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.workplaceType).toBe('OnSite');
    });

    it('should infer Remote from isRemote flag', () => {
      const raw = makeRawJob({ isRemote: true });
      const result = service.normalize(raw, 'remotive');
      expect(result.workplaceType).toBe('Remote');
      expect(result.isRemote).toBe(true);
    });

    it('should infer hybrid from description text', () => {
      const raw = makeRawJob({
        descriptionPlain: 'This role supports a hybrid work model',
      });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.workplaceType).toBe('Hybrid');
    });

    it('should default to OnSite', () => {
      const raw = makeRawJob();
      const result = service.normalize(raw, 'greenhouse');
      expect(result.workplaceType).toBe('OnSite');
    });
  });

  // ── Company Name Normalization ────────────────────────────────────

  describe('company name normalization', () => {
    it('should capitalize single-word lowercase name', () => {
      const raw = makeRawJob({ companyName: 'razorpay' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.companyName).toBe('Razorpay');
    });

    it('should preserve multi-word names', () => {
      const raw = makeRawJob({ companyName: 'Tata Consultancy Services' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.companyName).toBe('Tata Consultancy Services');
    });

    it('should use "Unknown" for empty name', () => {
      const raw = makeRawJob({ companyName: '' });
      const result = service.normalize(raw, 'greenhouse');
      expect(result.companyName).toBe('Unknown');
    });
  });

  // ── Content Hashing ───────────────────────────────────────────────

  describe('content hashing', () => {
    it('should produce consistent hash for same inputs', () => {
      const a = service.computeContentHash('Dev', 'Co', 'Mumbai');
      const b = service.computeContentHash('Dev', 'Co', 'Mumbai');
      expect(a).toBe(b);
    });

    it('should produce different hash for different inputs', () => {
      const a = service.computeContentHash('Dev', 'Co', 'Mumbai');
      const b = service.computeContentHash('PM', 'Co', 'Mumbai');
      expect(a).not.toBe(b);
    });

    it('should be case-insensitive', () => {
      const a = service.computeContentHash('Dev', 'Co', 'Mumbai');
      const b = service.computeContentHash('dev', 'co', 'mumbai');
      expect(a).toBe(b);
    });

    it('should return a 32-char hex string', () => {
      const hash = service.computeContentHash('A', 'B', 'C');
      expect(hash.length).toBe(32);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  // ── URL Hashing ───────────────────────────────────────────────────

  describe('URL hashing', () => {
    it('should normalize trailing slashes', () => {
      const a = service.computeUrlHash('https://example.com/apply/');
      const b = service.computeUrlHash('https://example.com/apply');
      expect(a).toBe(b);
    });

    it('should normalize protocol', () => {
      const a = service.computeUrlHash('https://example.com/apply');
      const b = service.computeUrlHash('http://example.com/apply');
      expect(a).toBe(b);
    });

    it('should be case-insensitive', () => {
      const a = service.computeUrlHash('HTTPS://Example.Com/Apply');
      const b = service.computeUrlHash('https://example.com/apply');
      expect(a).toBe(b);
    });
  });
});
