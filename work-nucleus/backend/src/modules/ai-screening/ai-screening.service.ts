import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiScreeningService {
  private readonly logger = new Logger(AiScreeningService.name);
  private ai: GoogleGenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const rawKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({
      apiKey: rawKey ? rawKey.trim() : 'dummy-key',
    });
  }

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

      // Check if API key is real. If dummy, just mock it.
      if (!this.configService.get<string>('GEMINI_API_KEY')) {
        this.logger.warn('GEMINI_API_KEY not found. Using mock evaluation.');
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

      const prompt = `
        Evaluate the fit between a candidate and a job mandate.
        
        Job Mandate:
        Title: ${referral.mandate.title}
        Description: ${referral.mandate.description}
        Mandatory Skills: ${JSON.stringify(referral.mandate.mandatorySkills)}
        
        Candidate Profile:
        Name: ${referral.candidateProfile.name}
        Headline: ${referral.candidateProfile.headline}
        Experience: ${referral.candidateProfile.experienceYears} years
        Skills: ${JSON.stringify(referral.candidateProfile.skills)}
        
        Output valid JSON with the following structure:
        {
          "matchScore": number (0 to 100),
          "matchSummary": "1-2 sentence summary of why they fit or don't fit",
          "strengths": ["list", "of", "strengths"],
          "missingSkills": ["list", "of", "missing", "skills"]
        }
      `;

      const response = await this.ai.models.generateContent({
        model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const content = response.text;
      if (content) {
        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
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
        this.logger.log(`Successfully evaluated referral ${referralId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate referral ${referralId}`, error);
    }
  }
  async generateMandate(prompt: string): Promise<any> {
    const rawKey = this.configService.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    this.logger.log(`GEMINI_API_KEY present: ${!!trimmedKey}, starts with: ${trimmedKey?.substring(0, 8)}`);

    try {
      this.logger.log('Generating mandate from prompt');
      
      if (!trimmedKey) {
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

      const systemPrompt = `
        You are an expert technical recruiter and HR business partner.
        A hiring manager will provide a brief sentence describing their hiring needs.
        Your task is to generate a fully populated, professional Job Mandate.
        
        Output valid JSON with exactly the following structure:
        {
          "title": "Professional Job Title",
          "department": "Engineering/Sales/etc",
          "description": "A fully formatted, professional 2-3 paragraph job description. Use HTML tags like <p> and <ul> if helpful for formatting.",
          "requiredExperience": "e.g., 3-5 years",
          "mandatorySkills": ["list", "of", "skills"],
          "preferredSkills": ["list", "of", "skills"],
          "workModel": "Remote/Hybrid/On-site",
          "employmentType": "Full-time/Contract"
        }
      `;

      const modelToUse = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
      this.logger.log(`Using model: ${modelToUse}`);

      const response = await this.ai.models.generateContent({
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        }
      });

      const content = response.text;
      if (content) {
        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
      throw new Error('Failed to generate mandate');
    } catch (error) {
      this.logger.error('Failed to generate mandate. Full error:', JSON.stringify(error, null, 2));
      throw new HttpException(
        error.message || 'Failed to generate mandate. Please check your Gemini API key.',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async parseResumeToProfile(resumeText: string): Promise<any> {
    try {
      if (!this.configService.get<string>('GEMINI_API_KEY')) {
        this.logger.warn('GEMINI_API_KEY not found. Using mock parsing.');
        return {
          name: "Mock Candidate",
          email: "mock@example.com",
          phone: "+1 555 123 4567",
          currentDesignation: "Software Engineer",
          experienceYears: 4,
          skills: ["JavaScript", "TypeScript", "React"],
          currentLocation: "San Francisco, CA"
        };
      }

      const systemPrompt = `
        You are an expert technical recruiter and resume parser.
        You will receive raw text extracted from a candidate's PDF resume.
        Extract the information to populate the candidate's profile.
        
        Output valid JSON with exactly the following structure:
        {
          "name": "Candidate Full Name (or empty if not found)",
          "email": "Candidate Email (or empty if not found)",
          "phone": "Candidate Phone Number (or empty if not found)",
          "currentDesignation": "Their current or most recent job title",
          "experienceYears": integer representing total years of experience (estimate if necessary),
          "skills": ["list", "of", "top", "skills", "found"],
          "currentLocation": "City, State or Country"
        }
      `;

      const response = await this.ai.models.generateContent({
        model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash',
        contents: resumeText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        }
      });

      const content = response.text;
      if (content) {
        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
      throw new Error('Failed to parse resume');
    } catch (error) {
      this.logger.error('Failed to parse resume', error);
      throw error;
    }
  }
}
