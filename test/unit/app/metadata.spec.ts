import { describe, it, expect } from 'vitest';
import loadMetadata from '@/metadata';

describe('metadata', () => {
  it('loads swagger metadata structure', async () => {
    const metadata = await loadMetadata();
    expect(metadata['@nestjs/swagger']).toBeDefined();
    expect(Array.isArray(metadata['@nestjs/swagger'].models)).toBe(true);
    expect(Array.isArray(metadata['@nestjs/swagger'].controllers)).toBe(true);
  });
});
