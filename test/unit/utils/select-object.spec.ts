import { describe, it, expect } from 'vitest';
import { selectObject } from '@/utils/select-object';

describe('selectObject', () => {
  it('maps selected fields', () => {
    const res = selectObject<{ id: string; email: string }, { id: string }>([
      'id',
    ]);
    expect(res).toEqual({ id: true });
  });

  it('maps hashed/default fields', () => {
    const res = selectObject<
      { id: string; email: string; name: string },
      { id: string; fullName: string }
    >(['id', 'fullName'], { fullName: ['name'], DEFAULT: ['email'] });
    expect(res).toEqual({ id: true, name: true, email: true });
  });
});
