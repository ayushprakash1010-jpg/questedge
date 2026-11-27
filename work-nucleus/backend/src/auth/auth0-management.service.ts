import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManagementClient } from 'auth0';
import { randomBytes } from 'crypto';
import { normalizeAuth0Domain } from './auth0-domain.util';
import { EmailService } from '../modules/email/email.service';

@Injectable()
export class Auth0ManagementService implements OnModuleInit {
  private management: ManagementClient;
  private readonly logger = new Logger(Auth0ManagementService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  onModuleInit() {
    const primaryDomain = normalizeAuth0Domain(
      this.configService.getOrThrow<string>('AUTH0_DOMAIN'),
    );
    const managementDomain = normalizeAuth0Domain(
      this.configService.get<string>('AUTH0_MANAGEMENT_DOMAIN'),
    );
    // Auth0 Management API v2 tokens require the canonical *.auth0.com domain
    // as both host and audience even when user login uses a custom domain.
    const domain = managementDomain || primaryDomain;
    const audience =
      this.configService.get<string>('AUTH0_MANAGEMENT_AUDIENCE')?.trim() ||
      `https://${domain}/api/v2/`;

    if (
      !managementDomain &&
      primaryDomain &&
      !primaryDomain.endsWith('.auth0.com')
    ) {
      this.logger.warn(
        `AUTH0_MANAGEMENT_DOMAIN is not set while AUTH0_DOMAIN="${primaryDomain}" appears to be a custom domain. Set AUTH0_MANAGEMENT_DOMAIN to your canonical *.auth0.com tenant domain.`,
      );
    }

    const clientId = this.configService.getOrThrow<string>(
      'AUTH0_MANAGEMENT_CLIENT_ID',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'AUTH0_MANAGEMENT_CLIENT_SECRET',
    );

    this.management = new ManagementClient({
      domain,
      audience,
      clientId,
      clientSecret,
    });
  }

  async createUser(email: string, name: string): Promise<string> {
    const response = await this.management.users.create({
      email,
      name,
      connection: 'Username-Password-Authentication',
      password: this.generateTempPassword(),
      email_verified: false,
    });

    const auth0Sub = response.data.user_id;
    this.logger.log(`Created Auth0 user for ${email} (${auth0Sub})`);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    // Generate password setup ticket and dispatch invite email
    const ticketRes = await this.management.tickets.changePassword({
      user_id: auth0Sub,
      result_url: frontendUrl,
    });
    const inviteUrl = (ticketRes as any)?.data?.ticket || frontendUrl;

    try {
      await this.emailService?.sendNotificationEmail(
        email,
        'You have been invited to QuestEdge',
        `Hi ${name}, you have been invited to join your organization on QuestEdge. Use the link below to set your password and sign in.`,
        inviteUrl,
      );
      this.logger.log(`Dispatched invite setup email to ${email}`);
    } catch (err: any) {
      this.logger.warn(
        `Auth0 ticket generated for ${email}, but invite email delivery failed: ${err?.message || err}`,
      );
    }

    return auth0Sub;
  }

  async blockUser(auth0Sub: string): Promise<void> {
    await this.management.users.update({ id: auth0Sub }, { blocked: true });
    this.logger.log(`Blocked Auth0 user ${auth0Sub}`);
  }

  async unblockUser(auth0Sub: string): Promise<void> {
    await this.management.users.update({ id: auth0Sub }, { blocked: false });
    this.logger.log(`Unblocked Auth0 user ${auth0Sub}`);
  }

  private generateTempPassword(): string {
    return randomBytes(18).toString('base64url') + '!A1';
  }
}
