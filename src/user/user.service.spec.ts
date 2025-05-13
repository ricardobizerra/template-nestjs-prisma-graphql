import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createTestModel } from '@/utils/create-test-model';
import { OrderDirection } from '@/utils/args/ordenation.args';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [UserService],
    });

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find many users', async () => {
    const users = await service.findMany({
      queriedFields: ['id', 'name', 'email'],
      paginationArgs: {
        first: 10,
        after: null,
        before: null,
        last: null,
      },
      searchArgs: {
        search: '',
      },
      ordenationArgs: {
        orderBy: 'id',
        orderDirection: OrderDirection.Asc,
      },
    });

    expect(users).toBeDefined();
  });
});
