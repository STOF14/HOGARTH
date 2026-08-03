import { describe, it, expect } from 'vitest';
import { computeSlotPosition } from '../../src/world/town.js';

describe('computeSlotPosition', () => {
  it('alternates sides of the street starting on the left', () => {
    expect(computeSlotPosition(0).side).toBe(-1);
    expect(computeSlotPosition(1).side).toBe(1);
    expect(computeSlotPosition(2).side).toBe(-1);
    expect(computeSlotPosition(3).side).toBe(1);
  });

  it('places two plots per row before advancing z', () => {
    expect(computeSlotPosition(0).row).toBe(0);
    expect(computeSlotPosition(1).row).toBe(0);
    expect(computeSlotPosition(2).row).toBe(1);
    expect(computeSlotPosition(3).row).toBe(1);
  });

  it('advances z by exactly one zSpacing per row', () => {
    const zSpacing = 6, rowStartZ = -6;
    const row0 = computeSlotPosition(0, rowStartZ, zSpacing).z;
    const row1 = computeSlotPosition(2, rowStartZ, zSpacing).z;
    expect(row1 - row0).toBe(zSpacing);
  });

  it('respects custom rowStartZ/zSpacing arguments', () => {
    const pos = computeSlotPosition(2, -10, 8);
    expect(pos.z).toBe(-10 + 1 * 8);
  });
});
