import {
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY'),
      },
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
    });
  }

  public async uploadPublicFile(
    fileId: string,
    data: Buffer,
    options: Partial<PutObjectCommandInput> = {},
  ): Promise<PutObjectCommandOutput> {
    return this.s3Client.send(
      new PutObjectCommand({
        ACL: 'public-read',
        Bucket: this.configService.get<string>('S3_CONTAINER_ID'),
        Key: fileId,
        Body: data,
        ...options,
      }),
    );
  }
}
