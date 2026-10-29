import { Test, TestingModule } from '@nestjs/testing';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { FileUploadService } from '../file-upload/file-upload.service';

describe('CandidatePortalController', () => {
  let controller: CandidatePortalController;
  let candidatePortalService: any;
  let fileUploadService: any;

  beforeEach(async () => {
    candidatePortalService = {
      getMyProfile: jest.fn(),
      upsertProfile: jest.fn(),
      exportCandidateData: jest.fn(),
      eraseCandidateData: jest.fn(),
      getCandidateResumeKeyWithAuth: jest.fn(),
    };

    fileUploadService = {
      uploadResume: jest.fn(),
      getPresignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatePortalController],
      providers: [
        {
          provide: CandidatePortalService,
          useValue: candidatePortalService,
        },
        {
          provide: FileUploadService,
          useValue: fileUploadService,
        },
      ],
    }).compile();

    controller = module.get<CandidatePortalController>(CandidatePortalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('privacy endpoints (P2-12)', () => {
    const mockUser = {
      auth0Sub: 'auth0|user123',
      email: 'jane@example.com',
    };
    const mockProfile = { id: 'profile-uuid-1', auth0Sub: 'auth0|user123' };

    it('exportMyData should retrieve profile and invoke exportCandidateData', async () => {
      candidatePortalService.getMyProfile.mockResolvedValue(mockProfile);
      candidatePortalService.exportCandidateData.mockResolvedValue({
        compliance: 'GDPR_ARTICLE_20_AND_DPDP_SECTION_11',
      });

      const result = await controller.exportMyData(mockUser);
      expect(candidatePortalService.getMyProfile).toHaveBeenCalledWith(
        'auth0|user123',
        'jane@example.com',
      );
      expect(candidatePortalService.exportCandidateData).toHaveBeenCalledWith(
        'profile-uuid-1',
      );
      expect(result.compliance).toBe('GDPR_ARTICLE_20_AND_DPDP_SECTION_11');
    });

    it('eraseMyData should retrieve profile and invoke eraseCandidateData', async () => {
      candidatePortalService.getMyProfile.mockResolvedValue(mockProfile);
      candidatePortalService.eraseCandidateData.mockResolvedValue({
        success: true,
        message: 'Scrubbed',
      });

      const result = await controller.eraseMyData(mockUser);
      expect(candidatePortalService.getMyProfile).toHaveBeenCalledWith(
        'auth0|user123',
        'jane@example.com',
      );
      expect(candidatePortalService.eraseCandidateData).toHaveBeenCalledWith(
        'profile-uuid-1',
      );
      expect(result.success).toBe(true);
    });

    it('getMyResumeUrl should generate presigned url with clean filename', async () => {
      candidatePortalService.getMyProfile.mockResolvedValue({
        id: 'profile-uuid-1',
        name: 'Jane Doe',
        resumeUrl: 'resumes/jane/123-resume.pdf',
      });
      fileUploadService.getPresignedUrl.mockResolvedValue('https://s3.signed/Jane_Doe_Resume.pdf');

      const result = await controller.getMyResumeUrl(mockUser);
      expect(fileUploadService.getPresignedUrl).toHaveBeenCalledWith(
        'resumes/jane/123-resume.pdf',
        'Jane_Doe_Resume.pdf',
      );
      expect(result.url).toBe('https://s3.signed/Jane_Doe_Resume.pdf');
    });

    it('getCandidateResumeUrl should generate presigned url with candidate name in filename', async () => {
      candidatePortalService.getCandidateResumeKeyWithAuth.mockResolvedValue({
        resumeKey: 'resumes/ravi/456-resume.pdf',
        candidateName: 'Ravi Kumar',
      });
      fileUploadService.getPresignedUrl.mockResolvedValue('https://s3.signed/Ravi_Kumar_Resume.pdf');

      const result = await controller.getCandidateResumeUrl(mockUser, 'candidate-1');
      expect(candidatePortalService.getCandidateResumeKeyWithAuth).toHaveBeenCalledWith(
        mockUser,
        'candidate-1',
      );
      expect(fileUploadService.getPresignedUrl).toHaveBeenCalledWith(
        'resumes/ravi/456-resume.pdf',
        'Ravi_Kumar_Resume.pdf',
      );
      expect(result.url).toBe('https://s3.signed/Ravi_Kumar_Resume.pdf');
    });
  });
});
