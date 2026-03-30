import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'work-nucleus-resumes');
    this.s3 = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000'),
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true, // required for MinIO
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      this.logger.log(`Creating bucket "${this.bucket}"...`);
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created`);
    }
  }

  async uploadResume(
    file: Express.Multer.File,
    candidateId: string,
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, DOCX, and DOC files are allowed.',
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 10 MB.');
    }

    const key = `resumes/${candidateId}/${Date.now()}-${file.originalname}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
