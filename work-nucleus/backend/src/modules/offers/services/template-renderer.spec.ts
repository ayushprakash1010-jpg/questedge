import { ForbiddenException } from '@nestjs/common';
import { OfferStatus, Role } from '@prisma/client';
import { OfferApprovalService } from './offer-approval.service';
import { buildOfferHtml, renderTemplate } from './template-renderer';

describe('TemplateRenderer XSS protection & OfferApprovalService RBAC', () => {
  it('escapes interpolated values and strips dangerous HTML vectors', () => {
    const rendered = renderTemplate(
      `<p onclick="evil()">Hi {{candidate.name}}</p><script>alert(1)</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(2)">Link</a>`,
      {
        candidate: { name: '<img src=x onerror=alert(3)>' },
      },
    );

    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<iframe');
    expect(rendered).not.toContain('onclick=');
    expect(rendered).not.toContain('javascript:alert');
    expect(rendered).toContain('&lt;img src=x onerror=alert(3)&gt;');

    const fullHtml = buildOfferHtml({
      bodyHtml: rendered,
      candidateName: '<script>x</script>',
      orgName: 'Acme & Co',
      branding: {
        primaryColor: '#123456; background: url(evil)',
        logoUrl: 'javascript:alert(4)',
      },
    });
    expect(fullHtml).not.toContain('<script>x</script>');
    expect(fullHtml).not.toContain('javascript:alert');
    expect(fullHtml).toContain('Acme &amp; Co');
  });

  it('enforces approval role matching and prevents double approval by same actor', async () => {
    const mockPrisma = {
      offer: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new OfferApprovalService(mockPrisma as any);

    mockPrisma.offer.findFirst.mockResolvedValue({
      id: 'offer-1',
      orgId: 'org-1',
      status: OfferStatus.PENDING_APPROVAL,
      approvalChain: [
        { role: 'HIRING_MANAGER', status: 'PENDING' },
        { role: 'HR', status: 'PENDING' },
      ],
    });

    await expect(
      service.act('org-1', 'offer-1', 'hr-user-1', 'APPROVED', 'ok', Role.HR),
    ).rejects.toThrow(ForbiddenException);

    mockPrisma.offer.findFirst.mockResolvedValue({
      id: 'offer-1',
      orgId: 'org-1',
      status: OfferStatus.PENDING_APPROVAL,
      approvalChain: [
        {
          role: 'HIRING_MANAGER',
          status: 'APPROVED',
          actorUserId: 'dual-user',
        },
        { role: 'HR', status: 'PENDING' },
      ],
    });

    await expect(
      service.act('org-1', 'offer-1', 'dual-user', 'APPROVED', 'ok', Role.HR),
    ).rejects.toThrow(ForbiddenException);

    mockPrisma.offer.update.mockResolvedValue({
      id: 'offer-1',
      status: OfferStatus.APPROVED,
    });

    const approved = await service.act(
      'org-1',
      'offer-1',
      'hr-user-2',
      'APPROVED',
      'lgtm',
      Role.HR,
    );
    expect(approved.status).toBe(OfferStatus.APPROVED);
  });
});
