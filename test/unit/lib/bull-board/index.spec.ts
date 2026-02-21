import { describe, it, expect } from 'vitest';
import * as board from '@/lib/bull-board';

describe('bull-board index', () => {
  it('re-exports bull board module', () => {
    expect(board.BullBoardModule).toBeDefined();
  });
});
