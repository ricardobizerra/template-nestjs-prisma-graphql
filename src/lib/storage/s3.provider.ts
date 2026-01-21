import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, UploadResult } from './storage.interface';
import { Env } from '@/env';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.bucket = this.configService.get('STORAGE_BUCKET', { infer: true })!;
    this.region = this.configService.get('STORAGE_REGION', { infer: true })!;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('STORAGE_ACCESS_KEY', {
          infer: true,
        })!,
        secretAccessKey: this.configService.get('STORAGE_SECRET_KEY', {
          infer: true,
        })!,
      },
    });
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
      contentType,
      size: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
