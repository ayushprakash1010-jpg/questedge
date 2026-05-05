import { PartialType } from '@nestjs/swagger';
import { CreateOfferTemplateDto } from './create-offer-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOfferTemplateDto extends PartialType(CreateOfferTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
