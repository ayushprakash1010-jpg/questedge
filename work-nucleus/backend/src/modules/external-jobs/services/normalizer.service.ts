import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RawExternalJob } from '../connectors/connector.interface';

export interface NormalizedJob {
  sourceName: string;
  sourceId: string;
  sourceCompanySlug?: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  location?: string;
  city?: string;
  state?: string;
  country: string;
  isRemote: boolean;
  workplaceType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryRaw?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  descriptionSnippet?: string;
  employmentType?: string;
  department?: string;
  team?: string;
  extractedSkills: string[];
  tags: string[];
  experienceLevel?: string;
  requiredExperience?: string;
  applyUrl: string;
  applyType: string;
  contentHash: string;
  urlHash: string;
  isActive: boolean;
  postedAt?: Date;
  expiresAt?: Date;
}

const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  blr: 'Bengaluru',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  'new delhi': 'New Delhi',
  delhi: 'New Delhi',
  ncr: 'New Delhi',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  noida: 'Noida',
  hyderabad: 'Hyderabad',
  hyd: 'Hyderabad',
  pune: 'Pune',
  chennai: 'Chennai',
  madras: 'Chennai',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
  ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur',
  kochi: 'Kochi',
  cochin: 'Kochi',
  chandigarh: 'Chandigarh',
  lucknow: 'Lucknow',
  indore: 'Indore',
  thiruvananthapuram: 'Thiruvananthapuram',
  trivandrum: 'Thiruvananthapuram',
  coimbatore: 'Coimbatore',
  nagpur: 'Nagpur',
  visakhapatnam: 'Visakhapatnam',
  vizag: 'Visakhapatnam',
};

const CITY_TO_STATE: Record<string, string> = {
  Bengaluru: 'Karnataka',
  Mumbai: 'Maharashtra',
  Pune: 'Maharashtra',
  Nagpur: 'Maharashtra',
  'New Delhi': 'Delhi',
  Gurugram: 'Haryana',
  Noida: 'Uttar Pradesh',
  Hyderabad: 'Telangana',
  Chennai: 'Tamil Nadu',
  Coimbatore: 'Tamil Nadu',
  Kolkata: 'West Bengal',
  Ahmedabad: 'Gujarat',
  Jaipur: 'Rajasthan',
  Kochi: 'Kerala',
  Thiruvananthapuram: 'Kerala',
  Chandigarh: 'Chandigarh',
  Lucknow: 'Uttar Pradesh',
  Indore: 'Madhya Pradesh',
  Visakhapatnam: 'Andhra Pradesh',
};

const SKILL_DICTIONARY = new Set([
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust',
  'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'elixir',
  'react', 'angular', 'vue', 'next.js', 'nextjs', 'nuxt', 'svelte',
  'node.js', 'nodejs', 'express', 'nestjs', 'django', 'flask', 'fastapi',
  'spring', 'spring boot', 'rails', 'laravel', '.net',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
  'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'dynamodb', 'cassandra', 'sql server',
  'graphql', 'rest', 'grpc', 'websocket', 'kafka', 'rabbitmq',
  'html', 'css', 'sass', 'tailwind', 'tailwindcss', 'bootstrap',
  'git', 'linux', 'bash', 'devops', 'sre',
  'machine learning', 'ml', 'deep learning', 'ai',
  'nlp', 'computer vision', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'data science', 'data engineering', 'spark', 'hadoop',
  'figma', 'sketch', 'ui/ux',
  'product management', 'agile', 'scrum', 'jira',
  'solidity', 'blockchain', 'web3',
  'ios', 'android', 'react native', 'flutter', 'mobile',
  'cypress', 'jest', 'selenium', 'testing',
  'microservices', 'serverless', 'lambda',
  'nginx', 'prometheus', 'grafana', 'datadog',
  'prisma', 'typeorm', 'sequelize', 'mongoose',
]);

@Injectable()
export class NormalizerService {
  private readonly logger = new Logger(NormalizerService.name);

  normalize(raw: RawExternalJob, sourceName: string): NormalizedJob {
    const title = this.cleanText(raw.title);
    const companyName = this.normalizeCompanyName(raw.companyName);
    const { city, state, country } = this.normalizeLocation(raw);
    const location = this.buildLocationString(city, state, country, raw.isRemote);
    const descriptionPlain =
      raw.descriptionPlain || this.stripHtml(raw.descriptionHtml || '');
    const descriptionSnippet = descriptionPlain.substring(0, 200).trim();
    const extractedSkills = this.extractSkills(descriptionPlain, title, raw.tags);
    const experienceLevel = this.inferExperienceLevel(title, descriptionPlain);
    const requiredExperience = this.extractRequiredExperience(descriptionPlain);
    const workplaceType = this.normalizeWorkplaceType(
      raw.workplaceType,
      raw.isRemote,
      descriptionPlain,
    );

    return {
      sourceName,
      sourceId: raw.sourceId,
      sourceCompanySlug: raw.companySlug,
      title,
      companyName,
      companyLogoUrl: raw.companyLogoUrl,
      location,
      city,
      state,
      country,
      isRemote: raw.isRemote || workplaceType === 'Remote',
      workplaceType,
      salaryMin: raw.salaryMin,
      salaryMax: raw.salaryMax,
      salaryCurrency: raw.salaryCurrency,
      salaryPeriod: raw.salaryPeriod,
      salaryRaw: raw.salaryRaw,
      descriptionHtml: raw.descriptionHtml,
      descriptionPlain,
      descriptionSnippet,
      employmentType: raw.employmentType,
      department: raw.department,
      team: raw.team,
      extractedSkills,
      tags: raw.tags || [],
      experienceLevel,
      requiredExperience,
      applyUrl: raw.applyUrl,
      applyType: 'redirect',
      contentHash: this.computeContentHash(title, companyName, location || ''),
      urlHash: this.computeUrlHash(raw.applyUrl),
      isActive: true,
      postedAt: raw.postedAt ? new Date(raw.postedAt) : undefined,
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
    };
  }

  private cleanText(text: string): string {
    return (text || '').trim().replace(/\s+/g, ' ');
  }

  private normalizeCompanyName(name: string): string {
    if (name && !name.includes(' ') && name === name.toLowerCase()) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return name || 'Unknown';
  }

  private normalizeLocation(
    raw: RawExternalJob,
  ): { city?: string; state?: string; country: string } {
    let city = raw.city;
    let state = raw.state;
    let country = raw.country || 'IN';

    if (!city && raw.locationRaw) {
      const locLower = raw.locationRaw.toLowerCase().trim();
      for (const [alias, normalized] of Object.entries(CITY_ALIASES)) {
        if (locLower.includes(alias)) {
          city = normalized;
          break;
        }
      }
      if (
        locLower.includes('india') ||
        locLower.includes(', in') ||
        city
      ) {
        country = 'IN';
      } else if (
        locLower.includes('united states') ||
        locLower.includes(', us') ||
        locLower.includes('usa')
      ) {
        country = 'US';
      } else if (
        locLower.includes('united kingdom') ||
        locLower.includes(', uk')
      ) {
        country = 'GB';
      }
    }

    if (city && !state && CITY_TO_STATE[city]) {
      state = CITY_TO_STATE[city];
    }

    return { city, state, country };
  }

  private buildLocationString(
    city?: string,
    state?: string,
    country?: string,
    isRemote?: boolean,
  ): string {
    const parts = [city, state].filter(Boolean);
    if (parts.length > 0) {
      const base = parts.join(', ');
      return isRemote ? `${base} (Remote)` : base;
    }
    if (isRemote) return 'Remote';
    return country || 'India';
  }

  extractSkills(
    descriptionPlain: string,
    title: string,
    tags?: string[],
  ): string[] {
    const text = `${title} ${descriptionPlain}`.toLowerCase();
    const found = new Set<string>();

    for (const skill of SKILL_DICTIONARY) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text)) {
        found.add(
          skill
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        );
      }
    }

    if (tags) {
      for (const tag of tags) {
        if (tag && SKILL_DICTIONARY.has(tag.toLowerCase())) {
          found.add(tag.charAt(0).toUpperCase() + tag.slice(1));
        }
      }
    }

    return Array.from(found).slice(0, 30);
  }

  private inferExperienceLevel(
    title: string,
    description: string,
  ): string | undefined {
    const text = `${title} ${description}`.toLowerCase();
    if (/\b(intern|internship|trainee)\b/.test(text)) return 'Intern';
    if (/\b(fresher|entry.?level|graduate|junior)\b/.test(text)) return 'Fresher';
    if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(title.toLowerCase()))
      return 'Senior';
    if (
      /\b(manager|director|head of|vp|vice president)\b/.test(
        title.toLowerCase(),
      )
    )
      return 'Lead';
    if (
      /\b(mid.?level|mid.?senior|3.?5\s*years|4.?6\s*years|5.?8\s*years)\b/.test(
        text,
      )
    )
      return 'Mid';
    return undefined;
  }

  private extractRequiredExperience(description: string): string | undefined {
    const text = this.stripHtml(description).replace(/\s+/g, ' ');
    const pattern = /\b(\d{1,2})\s*(?:(\+)|(?:-|–|—|to)\s*(\d{1,2}))?\s*(years?|yrs?|months?|mos?)\s*(?:(?:of|relevant|professional|hands-on|industry|work)\s+){0,3}experience\b/gi;
    const explicitRequirement = /\b(?:minimum|at least|required|requirement|qualification|must have|you (?:should|must|need to|have)|looking for)\b/i;

    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const sentenceStart = Math.max(
        text.lastIndexOf('.', index),
        text.lastIndexOf('!', index),
        text.lastIndexOf('?', index),
      ) + 1;
      const sentenceEndCandidates = [
        text.indexOf('.', index + match[0].length),
        text.indexOf('!', index + match[0].length),
        text.indexOf('?', index + match[0].length),
      ].filter((position) => position >= 0);
      const sentenceEnd = sentenceEndCandidates.length
        ? Math.min(...sentenceEndCandidates)
        : text.length;
      const sentence = text.slice(sentenceStart, sentenceEnd);
      const isRangeOrMinimum = Boolean(match[2] || match[3]);
      const isExplicit = isRangeOrMinimum || explicitRequirement.test(sentence);
      const looksLikeCompanyHistory = /\b(?:our company|the company|organization|organisation|business)\b/i.test(sentence);

      if (!isExplicit || (looksLikeCompanyHistory && !explicitRequirement.test(sentence))) {
        continue;
      }

      const first = match[1];
      const second = match[3];
      const unit = /^(?:months?|mos?)$/i.test(match[4]) ? 'months' : 'years';
      if (second) return `${first}-${second} ${unit}`;
      return `${first}${match[2] ? '+' : ''} ${unit}`;
    }

    return undefined;
  }

  private normalizeWorkplaceType(
    type?: string,
    isRemote?: boolean,
    description?: string,
  ): string {
    if (type) {
      const lower = type.toLowerCase();
      if (lower.includes('remote')) return 'Remote';
      if (lower.includes('hybrid')) return 'Hybrid';
      if (
        lower.includes('onsite') ||
        lower.includes('on-site') ||
        lower.includes('office')
      )
        return 'OnSite';
    }
    if (isRemote) return 'Remote';
    if (description) {
      const lower = description.toLowerCase();
      if (/\bhybrid\b/.test(lower)) return 'Hybrid';
      if (/\bremote\b/.test(lower) && !/\bnot remote\b/.test(lower))
        return 'Remote';
    }
    return 'OnSite';
  }

  private stripHtml(html: string): string {
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');

    // Unescape HTML entities (handles Greenhouse-style double-encoded content)
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/gi, '/');

    // Secondary pass to strip any tags revealed by decoding
    text = text.replace(/<[^>]+>/g, ' ');

    return text.replace(/\s+/g, ' ').trim();
  }

  computeContentHash(title: string, company: string, location: string): string {
    const normalized = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 32);
  }

  computeUrlHash(url: string): string {
    const normalized = url
      .toLowerCase()
      .trim()
      .replace(/\/$/, '')
      .replace(/^https?:\/\//, '');
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 32);
  }
}

