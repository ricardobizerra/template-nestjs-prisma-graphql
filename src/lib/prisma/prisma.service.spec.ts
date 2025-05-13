import { TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { createTestModel } from '@/utils/create-test-model';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [PrismaService],
    });

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
