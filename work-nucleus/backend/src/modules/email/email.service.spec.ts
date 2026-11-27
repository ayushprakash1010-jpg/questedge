import sgMail = require('@sendgrid/mail');
import { EmailService } from './email.service';

describe('EmailService SendGrid fallback', () => {
  const prevResend = process.env.RESEND_API_KEY;
  const prevSendGrid = process.env.SENDGRID_API_KEY;
  const prevSendGridFrom = process.env.SENDGRID_FROM_EMAIL;

  afterEach(() => {
    jest.restoreAllMocks();
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
    if (prevSendGrid === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = prevSendGrid;
    if (prevSendGridFrom === undefined) delete process.env.SENDGRID_FROM_EMAIL;
    else process.env.SENDGRID_FROM_EMAIL = prevSendGridFrom;
  });

  it('initializes SendGrid cleanly without TypeError when SENDGRID_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.SENDGRID_API_KEY = 'SG.test_dummy_key';
    process.env.SENDGRID_FROM_EMAIL = 'QuestEdge <noreply@questedge.in>';

    const setKeySpy = jest.spyOn(sgMail, 'setApiKey').mockImplementation(() => undefined as any);
    const sendSpy = jest.spyOn(sgMail, 'send').mockResolvedValue([{ statusCode: 202 } as any, {}]);

    const svc = new EmailService();
    await svc.sendEmail('candidate@example.com', 'OTP Verification', '<p>123456</p>');

    expect(setKeySpy).toHaveBeenCalledWith('SG.test_dummy_key');
    expect(sendSpy).toHaveBeenCalledWith({
      to: 'candidate@example.com',
      from: 'QuestEdge <noreply@questedge.in>',
      subject: 'OTP Verification',
      html: '<p>123456</p>',
    });
  });
});
