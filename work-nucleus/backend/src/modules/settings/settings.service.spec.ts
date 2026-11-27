import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService validation', () => {
  it('rejects unknown setting keys and invalid bgvProvider values', async () => {
    const prisma: any = {
      orgSettings: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'set-1',
          orgId: 'org-1',
          settings: { bgvProvider: 'authbridge' },
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'set-1', orgId: 'org-1', settings: data.settings }),
        ),
      },
    };
    const svc = new SettingsService(prisma);

    await expect(
      svc.update('org-1', { unknownKey: true }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.update('org-1', { bgvProvider: 'kpmg' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.update('org-1', { scoringWeights: { technical: 50, hr: 20 } }),
    ).rejects.toThrow(BadRequestException);

    const updated = await svc.update('org-1', {
      bgvProvider: 'OnGrid',
      maxInterviewRounds: 5,
    });
    expect((updated.settings as any).bgvProvider).toBe('ongrid');
    expect((updated.settings as any).maxInterviewRounds).toBe(5);
  });
});
