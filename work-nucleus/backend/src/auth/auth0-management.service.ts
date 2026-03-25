import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManagementClient } from 'auth0';
import { randomBytes } from 'crypto';

@Injectable()
export class Auth0ManagementService implements OnModuleInit {
  private management: ManagementClient;
  private readonly logger = new Logger(Auth0ManagementService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const domain = this.configService.getOrThrow<string>('AUTH0_DOMAIN');
    const clientId = this.configService.getOrThrow<string>(
      'AUTH0_MANAGEMENT_CLIENT_ID',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'AUTH0_MANAGEMENT_CLIENT_SECRET',
    );

    this.management = new ManagementClient({
      domain,
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

    // Send password reset email so user can set their own password
    await this.management.tickets.changePassword({
      user_id: auth0Sub,
      result_url:
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001',
    });

    this.logger.log(`Sent password reset email to ${email}`);

    return auth0Sub;
  }

  async blockUser(auth0Sub: string): Promise<void> {
    await this.management.users.update(
      { id: auth0Sub },
      { blocked: true },
    );
    this.logger.log(`Blocked Auth0 user ${auth0Sub}`);
  }

  async unblockUser(auth0Sub: string): Promise<void> {
    await this.management.users.update(
      { id: auth0Sub },
      { blocked: false },
    );
    this.logger.log(`Unblocked Auth0 user ${auth0Sub}`);
  }

  private generateTempPassword(): string {
    return randomBytes(18).toString('base64url') + '!A1';
  }
}
