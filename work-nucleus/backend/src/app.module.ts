import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HiringPlansModule } from './modules/hiring-plans/hiring-plans.module';
import { SkillsModule } from './modules/skills/skills.module';
import { JobDescriptionsModule } from './modules/job-descriptions/job-descriptions.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { TrainingModule } from './modules/training/training.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SearchModule } from './modules/search/search.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { PublicApplyModule } from './modules/public-apply/public-apply.module';
import { JobQueueModule } from './modules/job-queue/job-queue.module';
import { Msg91Module } from './integrations/msg91/msg91.module';
import { CommsModule } from './modules/comms/comms.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SecurityModule } from './modules/security/security.module';
import { HotCacheModule } from './modules/cache/cache.module';
import { AiCostModule } from './modules/ai-cost/ai-cost.module';
import { PushModule } from './modules/push/push.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MandatesModule } from './modules/mandates/mandates.module';
import { RecruiterModule } from './modules/recruiter/recruiter.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { CandidatePortalModule } from './modules/candidate-portal/candidate-portal.module';
import { ClaimScopeModule } from './modules/claim-scope/claim-scope.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { AiScreeningModule } from './modules/ai-screening/ai-screening.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HiringPlansModule,
    SkillsModule,
    JobDescriptionsModule,
    PipelineModule,
    CandidatesModule,
    ApplicationsModule,
    FeedbackModule,
    DecisionsModule,
    TrainingModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
    SearchModule,
    FileUploadModule,
    PublicApplyModule,
    JobQueueModule,
    Msg91Module,
    CommsModule,
    ReportsModule,
    SecurityModule,
    HotCacheModule,
    AiCostModule,
    PushModule,
    HealthModule,
    MandatesModule,
    RecruiterModule,
    ReferralsModule,
    CandidatePortalModule,
    ClaimScopeModule,
    RewardsModule,
    AiScreeningModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
