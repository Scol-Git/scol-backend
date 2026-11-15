import { applyLiveIntakeFilter, LIVE_INTAKE_WHERE } from './LiveIntakeFilter';

describe('LiveIntakeFilter', () => {
  it('LIVE_INTAKE_WHERE requires active and published', () => {
    expect(LIVE_INTAKE_WHERE.isActive).toBe(true);
    expect(LIVE_INTAKE_WHERE.isPublished).toBe(true);
    expect(LIVE_INTAKE_WHERE.deletedAt).toBeDefined();
  });

  it('applyLiveIntakeFilter adds three andWhere conditions', () => {
    const qb = { andWhere: jest.fn().mockReturnThis() };
    applyLiveIntakeFilter(qb as never, 'ci');
    expect(qb.andWhere.mock.calls.map((c) => c[0])).toEqual([
      'ci.isActive = true',
      'ci.isPublished = true',
      'ci.deletedAt IS NULL',
    ]);
  });
});
