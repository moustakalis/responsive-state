import { describe, expect, it } from 'vitest';
import { betweenWidth, maxWidth, minWidth, stepDown, toLength } from '../src/media';

describe('media helpers', () => {
  it('normalizes lengths', () => {
    expect(toLength(768)).toBe('768px');
    expect(toLength('48rem')).toBe('48rem');
  });

  it('steps down without overlap', () => {
    expect(stepDown(768)).toBe('767.98px');
    expect(stepDown('768px')).toBe('767.98px');
    expect(stepDown('48rem')).toBe('47.999rem');
  });

  it('builds queries', () => {
    expect(minWidth(640)).toBe('(min-width: 640px)');
    expect(maxWidth(640)).toBe('(max-width: 639.98px)');
    expect(betweenWidth(640, 1024)).toBe('(min-width: 640px) and (max-width: 1023.98px)');
  });
});
