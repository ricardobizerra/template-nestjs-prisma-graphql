import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { HttpException } from '@nestjs/common';
import { STORAGE_PROVIDER } from '@/lib/storage/storage.interface';

import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { create } from 'domain';

describe('UserController', () => {
  let controller: UserController;
  let userService: any;

  const mockUserService = {
    findMany: vi.fn(),
    findOne: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };

  const mockAuthService = {
    signIn: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: STORAGE_PROVIDER, useValue: {} },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne (me)', () => {
    it('should return user from service', async () => {
      const user = { id: '1', email: 't@t.com' };
      userService.findOne.mockResolvedValue(user);
      const result = await controller.findOne(user as any);
      expect(result).toEqual(user);
      expect(userService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findMany', () => {
    it('should return paginated users', async () => {
      const mockResult = { edges: [], pageInfo: {} };
      userService.findMany.mockResolvedValue(mockResult);

      const result = await controller.findMany('10');

      expect(result).toBe(mockResult);
      expect(userService.findMany).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should throw conflict if email exists', async () => {
      userService.findByEmail.mockResolvedValue({ id: '1' });
      await expect(
        controller.create({ email: 't@t.com' } as any),
      ).rejects.toThrow(HttpException);
    });

    it('should create and sign in user', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({ id: '1', email: 't@t.com' });
      mockAuthService.signIn.mockResolvedValue({ accessToken: 'tk' });

      const result = await controller.create({
        email: 't@t.com',
        password: 'p',
        name: 'N',
        role: 'USER',
      } as any);

      expect(result.accessToken).toBe('tk');
    });
  });
});
