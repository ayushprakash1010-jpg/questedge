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
import { SupportModule } from './modules/support/support.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { PublicApplyModule } from './modules/public-apply/public-apply.module';
import { JobQueueModule } from './modules/job-queue/job-queue.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

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
    SupportModule,
    FileUploadModule,
    PublishingModule,
    PublicApplyModule,
    JobQueueModule,
    HealthModule,
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
