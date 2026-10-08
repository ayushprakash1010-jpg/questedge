import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiScreeningService {
  private readonly logger = new Logger(AiScreeningService.name);
  private ai: GoogleGenAI;
  private readonly model: string;
  private readonly hasApiKey: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private fileUpload: FileUploadService,
  ) {
    const rawKey = this.configService.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    this.hasApiKey = !!trimmedKey;
    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash';

    this.logger.log(`AI Service initialized. Key present: ${this.hasApiKey}, Model: ${this.model}`);

    this.ai = new GoogleGenAI({
      apiKey: trimmedKey || 'dummy-key',
    });
  }

  // ── Parse AI JSON response safely ─────────────────────────────
  private parseAiResponse(text: string): any {
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error(`JSON parse failed on AI response. Raw text: ${text}`);
      throw err;
    }
  }

  // ── Extract a clean error message from Google's error format ──
  private extractErrorMessage(error: any): string {
    const raw = error?.message || 'An unknown AI error occurred.';
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error?.message || raw;
    } catch (_) {
      return raw;
    }
  }

  // ── 1. Evaluate Referral Fit (background task) ────────────────
  async evaluateReferralFit(referralId: string): Promise<void> {
    try {
      this.logger.log(`Starting AI evaluation for referral ${referralId}`);

      const referral = await this.prisma.referral.findUnique({
        where: { id: referralId },
        include: {
          mandate: true,
          candidateProfile: true,
        },
      });

      if (!referral) {
        this.logger.error(`Referral ${referralId} not found`);
        return;
      }

      if (!this.hasApiKey) {
        this.logger.warn('GEMINI_API_KEY not set. Using mock evaluation.');
        await this.prisma.referral.update({
          where: { id: referralId },
          data: {
            aiMatchScore: 85,
            aiMatchSummary: 'Candidate has 80% overlap with required skills.',
            aiSummary: JSON.stringify({
              strengths: ['Relevant experience', 'Matches mandatory skills'],
              missingSkills: [],
            }),
          },
        });
        return;
      }

      const { mandate, candidateProfile } = referral;

      // ── Build the prompt text ──────────────────────────────────
      const promptText = `
        You are an expert technical recruiter. Evaluate the fit between a candidate and a job mandate.
        ${candidateProfile.resumeUrl ? 'The candidate\'s full resume is attached as a document — use it as the primary source of truth for their skills and experience.' : 'No resume was uploaded; evaluate based on their profile data only.'}
        
        Job Mandate:
        Title: ${mandate.title}
        Description: ${mandate.description}
        Mandatory Skills: ${JSON.stringify(mandate.mandatorySkills)}
        Required Experience: ${(mandate as any).requiredExperience ?? 'Not specified'}
        
        Candidate Profile:
        Name: ${candidateProfile.name}
        Headline: ${candidateProfile.headline ?? 'N/A'}
        Current Role: ${candidateProfile.currentDesignation ?? 'N/A'} at ${(candidateProfile as any).currentCompany ?? 'N/A'}
        Experience: ${candidateProfile.experienceYears ?? 'N/A'} years
        Location: ${(candidateProfile as any).currentLocation ?? 'N/A'}
        Self-reported Skills: ${JSON.stringify(candidateProfile.skills ?? [])}
        
        Output ONLY valid JSON with this exact structure:
        {
          "matchScore": number (0 to 100),
          "matchSummary": "2-3 sentence summary of why they fit or don't fit, referencing specific evidence from the resume if available",
          "strengths": ["specific strength 1", "specific strength 2"],
          "missingSkills": ["specific missing skill 1", "specific missing skill 2"]
        }
      `;

      // ── Try to attach resume PDF if available ─────────────────
      let contents: any;
      const resumeKey = candidateProfile.resumeUrl;

      if (resumeKey) {
        try {
          this.logger.log(`Fetching resume for candidate ${candidateProfile.id} from key: ${resumeKey}`);
          const fileBuffer = await this.fileUpload.getFileBuffer(resumeKey);
          const mimeType = resumeKey.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          const b64 = Buffer.from(fileBuffer).toString('base64');

          // Send resume as an inline part + text prompt
          contents = [{
            role: 'user',
            parts: [
              { inlineData: { data: b64, mimeType } },
              { text: promptText },
            ],
          }];
          this.logger.log(`Resume attached for referral ${referralId} — using full document evaluation.`);
        } catch (fileErr) {
          // If fetching the resume fails, fall back gracefully to text-only
          this.logger.warn(`Could not fetch resume for referral ${referralId}: ${fileErr}. Falling back to text-only evaluation.`);
          contents = promptText;
        }
      } else {
        this.logger.log(`No resume for referral ${referralId} — using profile text-only evaluation.`);
        contents = promptText;
      }

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const content = response.text;
      if (content) {
        const parsed = this.parseAiResponse(content);
        await this.prisma.referral.update({
          where: { id: referralId },
          data: {
            aiMatchScore: parsed.matchScore,
            aiMatchSummary: parsed.matchSummary,
            aiSummary: JSON.stringify({
              strengths: parsed.strengths,
              missingSkills: parsed.missingSkills,
            }),
          },
        });
        this.logger.log(`Successfully evaluated referral ${referralId}. Score: ${parsed.matchScore}%`);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate referral ${referralId}: ${this.extractErrorMessage(error)}`);
      // Don't rethrow — this is a background task, failure should be silent
    }
  }

  // ── 2. Generate Mandate from Prompt ──────────────────────────
  async generateMandate(prompt: string): Promise<any> {
    this.logger.log(`Generating mandate. Key present: ${this.hasApiKey}, Model: ${this.model}`);

    if (!this.hasApiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Returning mock mandate.');
      return {
        title: 'Senior Developer (Generated)',
        department: 'Engineering',
        description: 'This is a mocked generated job description since the Gemini API key is missing. We are looking for an experienced developer to join our fast-paced team to build amazing scalable products.',
        requiredExperience: '5-8 years',
        mandatorySkills: ['React', 'Node.js', 'TypeScript'],
        preferredSkills: ['AWS', 'Docker'],
        workModel: 'Remote',
        employmentType: 'Full-time',
      };
    }

    try {
      const systemPrompt = `
        You are an expert technical recruiter and HR business partner.
        A hiring manager will provide a brief sentence describing their hiring needs.
        Your task is to generate a fully populated, professional Job Mandate.
        
        Output valid JSON with exactly the following structure:
        {
          "title": "Professional Job Title",
          "department": "Engineering/Sales/etc",
          "description": "A fully formatted, professional 2-3 paragraph job description. Use Markdown for formatting. DO NOT use HTML tags.",
          "requiredExperience": "e.g., 3-5 years",
          "mandatorySkills": ["list", "of", "skills"],
          "preferredSkills": ["list", "of", "skills"],
          "workModel": "Remote/Hybrid/On-site",
          "employmentType": "Full-time/Contract"
        }
      `;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      const content = response.text;
      if (content) {
        return this.parseAiResponse(content);
      }
      throw new Error('AI returned an empty response.');
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      this.logger.error(`generateMandate failed: ${msg}`);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  // ── 3. Parse Resume to Profile ────────────────────────────────
  async parseResumeToProfile(resumeText: string): Promise<any> {
    this.logger.log(`Parsing resume. Key present: ${this.hasApiKey}, Model: ${this.model}`);

    if (!this.hasApiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Returning mock profile.');
      return {
        name: 'Mock Candidate',
        email: 'mock@example.com',
        phone: '+1 555 123 4567',
        currentDesignation: 'Software Engineer',
        experienceYears: 4,
        skills: ['JavaScript', 'TypeScript', 'React'],
        currentLocation: 'San Francisco, CA',
      };
    }

    try {
      const systemPrompt = `
        You are an expert technical recruiter and resume parser.
        You will receive raw text extracted from a candidate's PDF resume.
        Extract the information to populate the candidate's profile.
        
        Output valid JSON with exactly the following structure:
        {
          "name": "Candidate Full Name (or empty string if not found)",
          "email": "Candidate Email (or empty string if not found)",
          "phone": "Candidate Phone Number (or empty string if not found)",
          "currentDesignation": "Their current or most recent job title (or empty string)",
          "currentCompany": "Their current or most recent company name (or empty string)",
          "experienceYears": integer representing total years of experience (estimate if necessary, use 0 for freshers),
          "skills": ["list", "of", "top", "skills", "found"],
          "education": ["Degree from Institution (Year)", "Another Degree..."],
          "currentLocation": "City, State or Country",
          "linkedin": "LinkedIn URL if present in text, else empty string",
          "github": "GitHub URL if present in text, else empty string",
          "portfolio": "Portfolio/Website URL if present, else empty string"
        }
      `;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: resumeText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      const content = response.text;
      if (content) {
        try {
          return this.parseAiResponse(content);
        } catch (parseError) {
          this.logger.error('Failed to parse AI response, falling back to mock.');
          return {
            name: 'Parsed via Fallback',
            email: 'candidate@example.com',
            phone: '+1 000 000 0000',
            currentDesignation: 'Professional',
            experienceYears: 5,
            skills: ['Leadership', 'Communication'],
            currentLocation: 'Remote',
          };
        }
      }
      throw new Error('AI returned an empty response.');
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      this.logger.error(`parseResumeToProfile failed: ${msg}`);
      this.logger.error(error); // Log full trace
      // If we completely crash at the Gemini API level (e.g. rate limit, bad API key), return mock data instead of crashing the UI
      return {
        name: 'Auto-Fill Error Fallback',
        email: 'fallback@example.com',
        phone: '',
        currentDesignation: 'Professional',
        experienceYears: 1,
        skills: ['Fallback Skill'],
        currentLocation: '',
      };
    }
  }
}
