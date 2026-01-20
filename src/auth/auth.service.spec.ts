import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/user/user.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserService = {
    findOne: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock-token'),
    signAsync: vi.fn().mockResolvedValue('mock-token'),
    verify: vi.fn().mockReturnValue({ sub: '1' }),
  };

  const mockPrismaService = {
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  };

  const mockEmailQueue = {
    add: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
