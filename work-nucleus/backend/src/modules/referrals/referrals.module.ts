import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { CommsModule } from '../comms/comms.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CommsModule, NotificationsModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
})
export class ReferralsModule {}
