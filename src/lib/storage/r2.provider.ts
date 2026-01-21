import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, UploadResult } from './storage.interface';
import { Env } from '@/env';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly accountId: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.bucket = this.configService.get('STORAGE_BUCKET', { infer: true })!;
    this.endpoint = this.configService.get('STORAGE_ENDPOINT', {
      infer: true,
    })!;

    // Extract account ID from endpoint (https://<account_id>.r2.cloudflarestorage.com)
    const match = this.endpoint.match(
      /https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/,
    );
    this.accountId = match?.[1] || '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
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
    // R2 public URL format (if public access is enabled)
    // You may want to use a custom domain here
    return `https://${this.bucket}.${this.accountId}.r2.dev/${key}`;
  }
}
