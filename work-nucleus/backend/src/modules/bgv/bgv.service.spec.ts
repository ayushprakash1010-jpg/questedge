import { BadRequestException } from '@nestjs/common';
import {
  BgvCheckStatus,
  BgvCheckType,
  BgvFinding,
  BgvProfileStatus,
  BgvVendor,
} from '@prisma/client';
import { BgvService } from './bgv.service';

describe('BgvService OTP delivery & override finalization', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevResend = process.env.RESEND_API_KEY;
  const prevSendGrid = process.env.SENDGRID_API_KEY;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
    if (prevSendGrid === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = prevSendGrid;
    jest.clearAllMocks();
  });

  function buildService(overrides?: { withEmail?: boolean }) {
    const prisma: any = {
      bgvProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      bgvCheck: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      candidateJoining: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const email = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const ai = { summarise: jest.fn().mockResolvedValue({ overall_recommendation: 'CLEAR' }) };
    const svc = new BgvService(
      prisma,
      {} as any,
      {} as any,
      ai as any,
      overrides?.withEmail === false ? undefined : (email as any),
    );
    return { svc, prisma, email };
  }

  it('sends BGV consent OTP via Email when RESEND_API_KEY is configured', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const { svc, prisma, email } = buildService();
    prisma.bgvProfile.findUnique.mockResolvedValue({
      id: 'prof-1',
      status: BgvProfileStatus.CONSENT_PENDING,
      candidate: { id: 'c-1', name: 'Asha', email: 'asha@example.com', phone: null },
      organization: { id: 'org-1', name: 'Acme' },
      checks: [{ type: BgvCheckType.PAN }],
    });

    const res = await svc.startConsent('tok-1', '127.0.0.1');

    expect(res.sent).toBe(true);
    expect(res.channel).toBe('email');
    expect(email.sendEmail).toHaveBeenCalledWith(
      'asha@example.com',
      expect.stringContaining('OTP'),
      expect.stringContaining('Hi Asha'),
    );
  });

  it('sends BGV consent OTP via Email when SENDGRID_API_KEY is configured', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.SENDGRID_API_KEY = 'SG.test_key';
    const { svc, prisma, email } = buildService();
    prisma.bgvProfile.findUnique.mockResolvedValue({
      id: 'prof-1',
      status: BgvProfileStatus.CONSENT_PENDING,
      candidate: { id: 'c-1', name: 'Asha', email: 'asha@example.com', phone: null },
      organization: { id: 'org-1', name: 'Acme' },
      checks: [{ type: BgvCheckType.PAN }],
    });

    const res = await svc.startConsent('tok-1', '127.0.0.1');

    expect(res.sent).toBe(true);
    expect(res.channel).toBe('email');
    expect(email.sendEmail).toHaveBeenCalledWith(
      'asha@example.com',
      expect.stringContaining('OTP'),
      expect.stringContaining('Hi Asha'),
    );
  });

  it('fails closed in production when RESEND_API_KEY and SENDGRID_API_KEY are missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    const { svc, prisma } = buildService();
    prisma.bgvProfile.findUnique.mockResolvedValue({
      id: 'prof-1',
      status: BgvProfileStatus.CONSENT_PENDING,
      candidate: { id: 'c-1', name: 'Asha', email: 'asha@example.com', phone: null },
      organization: { id: 'org-1', name: 'Acme' },
      checks: [{ type: BgvCheckType.PAN }],
    });

    await expect(svc.startConsent('tok-1', '127.0.0.1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('recomputes profile status from NEEDS_REVIEW to COMPLETED when HR overrides finding to CLEAR', async () => {
    const { svc, prisma } = buildService();
    prisma.bgvCheck.findFirst.mockResolvedValue({
      id: 'chk-1',
      profileId: 'prof-1',
      finding: BgvFinding.DISCREPANCY,
      response: {},
    });
    prisma.bgvCheck.update.mockResolvedValue({});
    prisma.bgvCheck.findUnique.mockResolvedValue({
      id: 'chk-1',
      finding: BgvFinding.CLEAR,
    });
    prisma.bgvProfile.findUnique.mockResolvedValue({
      id: 'prof-1',
      orgId: 'org-1',
      status: BgvProfileStatus.NEEDS_REVIEW,
      vendor: BgvVendor.AUTHBRIDGE,
      offerId: null,
      candidate: { name: 'Asha' },
      checks: [
        {
          id: 'chk-1',
          type: BgvCheckType.PAN,
          status: BgvCheckStatus.COMPLETED,
          finding: BgvFinding.CLEAR,
          reportUrl: null,
          response: {},
        },
      ],
    });

    await svc.overrideFinding(
      'org-1',
      'chk-1',
      'hr-1',
      BgvFinding.CLEAR,
      'Verified original document',
    );

    expect(prisma.bgvProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prof-1' },
        data: expect.objectContaining({
          status: BgvProfileStatus.COMPLETED,
        }),
      }),
    );
  });
});
