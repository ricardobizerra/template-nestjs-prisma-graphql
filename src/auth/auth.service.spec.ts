import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/user/user.service';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
