export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Get a signed URL for private file access
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Get the public URL for a file (if bucket is public)
   */
  getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
