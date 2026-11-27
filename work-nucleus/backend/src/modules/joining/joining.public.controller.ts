import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { SubmitDocumentDto } from './dto/submit-document.dto';
import { JoiningService } from './joining.service';

@ApiTags('Public Joining Portal (v2)')
@Public()
@Controller('api/v2/public/joining')
export class JoiningPublicController {
  constructor(private readonly service: JoiningService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Fetch joining record by candidate token' })
  get(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an onboarding document for a checklist item' })
  upload(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadDocument(token, file);
  }

  @Post(':token/submit')
  @ApiOperation({ summary: 'Submit a document for a checklist item' })
  submit(@Param('token') token: string, @Body() dto: SubmitDocumentDto) {
    return this.service.submitDocument(token, dto);
  }
}
