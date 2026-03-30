import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PublicApplyService } from './public-apply.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';

@ApiTags('Public Jobs')
@Public()
@Controller('api/v1/public/jobs')
export class PublicApplyController {
  constructor(private readonly publicApplyService: PublicApplyService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get published job details by slug' })
  getJob(@Param('slug') slug: string) {
    return this.publicApplyService.getJobBySlug(slug);
  }

  @Post(':slug/apply')
  @ApiOperation({ summary: 'Submit a job application' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  apply(
    @Param('slug') slug: string,
    @Body() dto: SubmitApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.publicApplyService.submitApplication(slug, dto, file);
  }
}
