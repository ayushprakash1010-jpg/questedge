import { IsEnum } from 'class-validator';
import { PublishChannel } from '@prisma/client';

export class PublishJobDto {
  @IsEnum(PublishChannel)
  channel: PublishChannel;
}
