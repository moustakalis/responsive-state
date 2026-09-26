/**
 * Real-browser checks for the helpers that build or read CSS: query validity,
 * tier exclusivity against the native `matchMedia`, and custom properties
 * resolved through real `getComputedStyle`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  createResponsiveState,
  fromCssVariables,
  tailwind,
  tailwind3,
  toMediaQueries,
} from '../../src';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('toMediaQueries() in a real browser', () => {
  it('produces valid queries', () => {
    for (const query of [
      ...Object.values(toMediaQueries(tailwind)),
      ...Object.values(toMediaQueries(tailwind3)),
    ]) {
      expect(matchMedia(query).media, query).not.toBe('not all');
    }
  });

  it('matches exactly one tier at and around each boundary', async () => {
    const queries = Object.entries(toMediaQueries(tailwind));
    for (const width of [639, 640, 767, 768, 1023, 1024, 1279, 1280, 1535, 1536]) {
      await page.viewport(width, 700);
      await expect
        .poll(() => queries.filter(([, q]) => matchMedia(q).matches).length, {
          message: `at ${width}px`,
        })
        .toBe(1);
    }
  });
});

describe('fromCssVariables() in a real browser', () => {
  it('reads breakpoints from custom properties on <html>', async () => {
    const style = document.createElement('style');
    style.textContent = ':root { --breakpoint-md: 50rem; --breakpoint-lg: 1000px; }';
    document.head.append(style);
    cleanups.push(() => style.remove());

    const breakpoints = fromCssVariables(tailwind);
    expect(breakpoints).toMatchObject({ md: '50rem', lg: '1000px', sm: '40rem' });

    await page.viewport(790, 700);
    const rs = createResponsiveState(breakpoints);
    cleanups.push(() => rs.destroy());
    expect(rs.get().current).toBe('sm'); // 790px < 50rem (800px)

    await page.viewport(810, 700);
    await expect.poll(() => rs.get().current).toBe('md');
  });
});

describe('fromCssVariables() with values that cannot be ordered', () => {
  it('keeps the fallback so breakpoint order stays correct', async () => {
    const style = document.createElement('style');
    style.textContent = ':root { --breakpoint-sm: calc(40rem + 1px); }';
    document.head.append(style);
    cleanups.push(() => style.remove());

    const breakpoints = fromCssVariables(tailwind);
    expect(breakpoints.sm).toBe('40rem');

    await page.viewport(1400, 700);
    const rs = createResponsiveState(breakpoints);
    cleanups.push(() => rs.destroy());
    expect(rs.breakpoints).toEqual(['base', 'sm', 'md', 'lg', 'xl', '2xl']);
    expect(rs.get().current).toBe('xl');
  });
});

describe('watch() in a real browser', () => {
  it('reports entering and leaving a breakpoint', async () => {
    await page.viewport(900, 700);
    const rs = createResponsiveState(tailwind);
    cleanups.push(() => rs.destroy());
    const spy = vi.fn();
    rs.watch((s) => s.up.lg, spy);

    await page.viewport(1100, 700);
    await expect.poll(() => spy.mock.calls.length).toBe(1);
    expect(spy).toHaveBeenLastCalledWith(true, false);

    await page.viewport(1300, 700);
    await expect.poll(() => rs.get().current).toBe('xl');
    expect(spy).toHaveBeenCalledTimes(1);

    await page.viewport(800, 700);
    await expect.poll(() => spy.mock.calls.length).toBe(2);
    expect(spy).toHaveBeenLastCalledWith(false, true);
  });
});
