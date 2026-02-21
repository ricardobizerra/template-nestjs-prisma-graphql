import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as softDelete from '@/lib/prisma/soft-delete.extension';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockConfigService = {
    get: vi.fn((key) => {
      if (key === 'NODE_ENV') return 'test';
      return 'mock-value';
    }),
  };

  beforeEach(async () => {
    // Mock the extension functions
    vi.spyOn(softDelete, 'configureSoftDelete').mockImplementation(() => {});
    vi.spyOn(softDelete, 'executeHardDelete').mockResolvedValue(
      undefined as any,
    );
    vi.spyOn(softDelete, 'restoreSoftDeleted').mockResolvedValue(
      undefined as any,
    );
    vi.spyOn(softDelete, 'findSoftDeleted').mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on init', async () => {
    const connectSpy = vi
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect on destroy', async () => {
    const disconnectSpy = vi
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);
    // Mock queryRaw for truncation logic in test mode
    vi.spyOn(service, '$queryRaw').mockResolvedValue([]);

    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should execute transaction', async () => {
    const transactionSpy = vi
      .spyOn(service, '$transaction')
      .mockResolvedValue('success' as any);
    const result = await service.executeTransaction(async () => 'success');
    expect(result).toBe('success');
    expect(transactionSpy).toHaveBeenCalled();
  });

  it('should call hardDelete extension', async () => {
    await service.hardDelete('User' as any, { id: '1' });
    expect(softDelete.executeHardDelete).toHaveBeenCalled();
  });

  it('should call restore extension', async () => {
    await service.restore('User' as any, '1');
    expect(softDelete.restoreSoftDeleted).toHaveBeenCalled();
  });

  it('should call findDeleted extension', async () => {
    await service.findDeleted('User' as any);
    expect(softDelete.findSoftDeleted).toHaveBeenCalled();
  });
});
