import {
  KeysetPaginatedFindMany,
  encodeCursor,
  decodeCursor,
  CursorData,
} from '@/utils/keyset-paginated-find-many';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { OrderDirection } from '@/utils/args/ordenation.args';

describe('KeysetPaginatedFindMany', () => {
  let mockDrizzleService: any;

  interface TestUser {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }

  const createMockItems = (count: number): TestUser[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `id-${String(i + 1).padStart(3, '0')}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      createdAt: new Date(2024, 0, i + 1),
    }));

  beforeEach(() => {
    mockDrizzleService = {
      db: {
        execute: vi.fn(),
      },
      executeTransaction: vi.fn(),
    };
  });

  describe('encodeCursor / decodeCursor', () => {
    it('should encode and decode cursor correctly', () => {
      const cursorData: CursorData = {
        id: 'user-123',
        sortValue: 'John Doe',
      };

      const encoded = encodeCursor(cursorData);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(cursorData);
    });

    it('should handle null sortValue', () => {
      const cursorData: CursorData = {
        id: 'user-456',
        sortValue: null,
      };

      const encoded = encodeCursor(cursorData);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(cursorData);
    });

    it('should handle numeric sortValue', () => {
      const cursorData: CursorData = {
        id: 'user-789',
        sortValue: 12345,
      };

      const encoded = encodeCursor(cursorData);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(cursorData);
    });

    it('should return null for invalid cursor', () => {
      const decoded = decodeCursor('invalid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('cursor should be opaque (not easily guessable)', () => {
      const cursor = encodeCursor({ id: 'test', sortValue: 'value' });

      // Cursor should not be a simple number (like offset-based)
      expect(Number.isNaN(Number(cursor))).toBe(true);

      // Cursor should be base64 encoded JSON
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      expect(() => JSON.parse(decoded)).not.toThrow();
    });
  });

  describe('findMany with empty results', () => {
    it('should return empty edges and correct pageInfo', async () => {
      mockDrizzleService.db.execute.mockResolvedValue({ rows: [] });

      const paginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 10, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'name',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result = await paginator.findMany();

      expect(result.edges).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
    });
  });

  describe('Relay Connection spec compliance', () => {
    it('should return edges with cursor and node properties', async () => {
      const mockItems = createMockItems(3);
      mockDrizzleService.db.execute.mockResolvedValue({ rows: mockItems });

      const paginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 10, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'name',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result = await paginator.findMany();

      expect(result.edges).toHaveLength(3);
      result.edges.forEach((edge, index) => {
        expect(edge).toHaveProperty('cursor');
        expect(edge).toHaveProperty('node');
        expect(typeof edge.cursor).toBe('string');
        expect(edge.node.id).toBe(mockItems[index].id);

        // Verify cursor contains the correct data
        const cursorData = decodeCursor(edge.cursor);
        expect(cursorData?.id).toBe(mockItems[index].id);
        expect(cursorData?.sortValue).toBe(mockItems[index].name);
      });
    });

    it('should return pageInfo with required fields', async () => {
      const mockItems = createMockItems(3);
      mockDrizzleService.db.execute.mockResolvedValue({ rows: mockItems });

      const paginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 10, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'name',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result = await paginator.findMany();

      expect(result.pageInfo).toHaveProperty('hasNextPage');
      expect(result.pageInfo).toHaveProperty('hasPreviousPage');
      expect(result.pageInfo).toHaveProperty('startCursor');
      expect(result.pageInfo).toHaveProperty('endCursor');
      expect(typeof result.pageInfo.hasNextPage).toBe('boolean');
      expect(typeof result.pageInfo.hasPreviousPage).toBe('boolean');
    });
  });

  describe('hasNextPage / hasPreviousPage', () => {
    it('should set hasNextPage true when more items exist', async () => {
      // Return 11 items when limit is 10 (fetches limit + 1)
      const mockItems = createMockItems(11);
      mockDrizzleService.db.execute.mockResolvedValue({ rows: mockItems });

      const paginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 10, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'name',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result = await paginator.findMany();

      // Should only return 10 items, not 11
      expect(result.edges).toHaveLength(10);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should set hasPreviousPage true when after cursor is provided', async () => {
      const mockItems = createMockItems(5);
      mockDrizzleService.db.execute.mockResolvedValue({ rows: mockItems });

      const afterCursor = encodeCursor({ id: 'prev-id', sortValue: 'A' });

      const paginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: {
            first: 10,
            after: afterCursor,
            last: null,
            before: null,
          },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'name',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result = await paginator.findMany();

      expect(result.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe('cursor stability (key advantage over offset)', () => {
    it('cursor contains ID and sortValue for stable pagination', () => {
      const item = createMockItems(1)[0];
      const cursor = encodeCursor({
        id: item.id,
        sortValue: item.name,
      });

      const decoded = decodeCursor(cursor);

      // Cursor is tied to specific item, not a position
      expect(decoded?.id).toBe(item.id);
      expect(decoded?.sortValue).toBe(item.name);

      // Even if items are inserted/deleted, this cursor will still
      // find items after this specific item's position in the sort order
    });
  });

  describe('data consistency (navigation back and forth)', () => {
    it('should return same first page data when navigating back from second page', async () => {
      // Simulate dataset of 10 items, pagpaginating with first=5
      const allItems = createMockItems(10);
      const firstPageItems = allItems.slice(0, 6); // +1 for hasNextPage check
      const secondPageItems = allItems.slice(5, 10);

      // First page request
      mockDrizzleService.db.execute.mockResolvedValueOnce({
        rows: firstPageItems,
      });

      const firstPagePaginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 5, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'id',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const firstPageResult = await firstPagePaginator.findMany();
      const endCursorFirstPage = firstPageResult.pageInfo.endCursor;

      // Verify first page data
      expect(firstPageResult.edges).toHaveLength(5);
      expect(firstPageResult.edges[0].node.id).toBe('id-001');
      expect(firstPageResult.edges[4].node.id).toBe('id-005');

      // Second page request (using endCursor from first page)
      mockDrizzleService.db.execute.mockResolvedValueOnce({
        rows: secondPageItems,
      });

      const secondPagePaginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: {
            first: 5,
            after: endCursorFirstPage,
            last: null,
            before: null,
          },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'id',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const secondPageResult = await secondPagePaginator.findMany();

      // Verify second page data continues from where first page ended
      expect(secondPageResult.edges[0].node.id).toBe('id-006');
      expect(secondPageResult.pageInfo.hasPreviousPage).toBe(true);

      // Go back to first page using before cursor (simulated)
      mockDrizzleService.db.execute.mockResolvedValueOnce({
        rows: firstPageItems.slice(0, 5),
      });

      const backToFirstPaginator = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 5, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'id',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const backToFirstResult = await backToFirstPaginator.findMany();

      // Verify returning to first page gives same data as initial first page
      expect(backToFirstResult.edges).toHaveLength(5);
      expect(backToFirstResult.edges[0].node.id).toBe(
        firstPageResult.edges[0].node.id,
      );
      expect(backToFirstResult.edges[4].node.id).toBe(
        firstPageResult.edges[4].node.id,
      );
    });

    it('cursor from specific item should always reference that item', () => {
      const items = createMockItems(5);
      const thirdItem = items[2]; // id-003

      // Create cursor for third item
      const cursor = encodeCursor({
        id: thirdItem.id,
        sortValue: thirdItem.name,
      });

      // Decode and verify - should always point to same item
      const decoded = decodeCursor(cursor);

      expect(decoded?.id).toBe('id-003');
      expect(decoded?.sortValue).toBe('User 3');

      // Re-encode and decode again - should be idempotent
      const reEncoded = encodeCursor(decoded!);
      const reDecoded = decodeCursor(reEncoded);

      expect(reDecoded).toEqual(decoded);
    });

    it('edges should maintain order consistency across pages', async () => {
      const allItems = createMockItems(15);

      // Page 1: items 1-5
      mockDrizzleService.db.execute.mockResolvedValueOnce({
        rows: allItems.slice(0, 6),
      }); // +1 for hasNextPage

      const page1 = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: { first: 5, after: null, last: null, before: null },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'id',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result1 = await page1.findMany();

      // Page 2: items 6-10
      mockDrizzleService.db.execute.mockResolvedValueOnce({
        rows: allItems.slice(5, 11),
      }); // +1 for hasNextPage

      const page2 = new KeysetPaginatedFindMany<TestUser>(
        mockDrizzleService as DrizzleService,
        {
          tableName: 'User',
          paginationArgs: {
            first: 5,
            after: result1.pageInfo.endCursor,
            last: null,
            before: null,
          },
          searchArgs: { search: '' },
          searchByFields: ['name'],
          orderBy: 'id',
          orderDirection: OrderDirection.Asc,
          selectFields: ['id', 'name', 'email'],
        },
      );

      const result2 = await page2.findMany();

      // Verify no overlap between pages
      const page1Ids = result1.edges.map((e) => e.node.id);
      const page2Ids = result2.edges.map((e) => e.node.id);

      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);

      // Verify order is maintained
      expect(page1Ids).toEqual([
        'id-001',
        'id-002',
        'id-003',
        'id-004',
        'id-005',
      ]);
      expect(page2Ids).toEqual([
        'id-006',
        'id-007',
        'id-008',
        'id-009',
        'id-010',
      ]);
    });
  });
});
