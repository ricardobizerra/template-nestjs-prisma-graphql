export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface StoragePort {
  upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string }>;
}
