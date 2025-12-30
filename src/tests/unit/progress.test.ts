import { describe, it, expect } from 'vitest';
import { isVideoCompleted, calculateVideoProgressPercentage } from '../../lib/mux';

describe('Progress calculations', () => {
  it('calculates video progress percentage correctly', () => {
    expect(calculateVideoProgressPercentage(0, 100)).toBe(0);
    expect(calculateVideoProgressPercentage(50, 100)).toBe(50);
    expect(calculateVideoProgressPercentage(100, 100)).toBe(100);
    expect(calculateVideoProgressPercentage(150, 100)).toBe(100); // Should be capped at 100%
    expect(calculateVideoProgressPercentage(50, 0)).toBe(0); // Avoid division by zero
    expect(calculateVideoProgressPercentage(-10, 100)).toBe(0); // Should not be negative
  });
  
  it('determines if a video is completed correctly', () => {
    expect(isVideoCompleted(0, 100)).toBe(false);
    expect(isVideoCompleted(94, 100)).toBe(false); // 94% is not complete
    expect(isVideoCompleted(95, 100)).toBe(true); // 95% is complete
    expect(isVideoCompleted(100, 100)).toBe(true);
    expect(isVideoCompleted(50, 0)).toBe(false); // Avoid division by zero
  });
});
