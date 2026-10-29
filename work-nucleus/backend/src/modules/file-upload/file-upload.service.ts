import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file magic bytes to verify content matches declared MIME type (P0-12 / F-14).
 * Rejects executables, scripts, or corrupt files masquerading as documents.
 */
function validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return mimetype === 'application/pdf';
  }

  // DOCX: ZIP archive header PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return (
      mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  // DOC (legacy Microsoft Compound File Binary Format / OLE2): 0xD0 0xCF 0x11 0xE0
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return mimetype === 'application/msword';
  }

  return false;
}

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'questedge-resumes');
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
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch (err: any) {
        this.logger.warn(
          `Failed to create bucket "${this.bucket}": ${err.message}. File uploads will fail until configured.`,
        );
      }
    }
  }

  async uploadResume(
    file: Express.Multer.File,
    candidateId: string,
  ): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file content provided.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, DOCX, and DOC files are allowed.',
      );
    }

    if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 10 MB.');
    }

    // P0-12: Magic byte validation to prevent MIME spoofing
    if (!validateMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'File contents do not match the expected document format.',
      );
    }

    // P0-12: Sanitize candidate ID and filename to prevent path traversal in S3 keys
    const safeCandidateId = candidateId.replace(/[^a-zA-Z0-9_-]/g, '');
    const rawFilename = path.basename(file.originalname || 'resume.pdf');
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `resumes/${safeCandidateId}/${Date.now()}-${safeFilename}`;

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

  async getPresignedUrl(key: string, filename?: string): Promise<string> {
    const cleanFilename = filename
      ? filename.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
      : undefined;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(cleanFilename
        ? { ResponseContentDisposition: `inline; filename="${cleanFilename}"` }
        : {}),
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
