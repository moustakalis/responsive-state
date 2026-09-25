/**
 * Real-browser checks. These run in Chromium against the native `matchMedia`,
 * so they verify what the fake in `test/matchMedia.ts` can only imitate:
 * CSS unit handling, query validity, boundary behaviour and event timing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  createResponsiveState,
  maxWidth,
  minWidth,
  tailwind,
  type ResponsiveState,
} from '../../src';

const stores: ResponsiveState<string, string>[] = [];
function track<T extends ResponsiveState<string, string>>(store: T): T {
  stores.push(store);
  return store;
}

beforeEach(async () => {
  await page.viewport(900, 700);
});

afterEach(() => {
  for (const store of stores.splice(0)) store.destroy();
  document.documentElement.removeAttribute('data-breakpoint');
});

describe('real matchMedia', () => {
  it('resolves rem breakpoints', async () => {
    const rs = track(createResponsiveState({ base: 0, wide: '48rem' }));
    expect(rs.get().current).toBe('wide');

    await page.viewport(700, 700);
    await expect.poll(() => rs.get().current).toBe('base');
  });

  it('treats unitless numeric strings as pixels', async () => {
    const rs = track(createResponsiveState({ base: 0, md: '768' }));
    expect(rs.get().current).toBe('md');

    await page.viewport(700, 700);
    await expect.poll(() => rs.get().current).toBe('base');
  });

  it('produces valid, non-overlapping min/max queries at the boundary', async () => {
    for (const query of [
      minWidth(768),
      maxWidth(768),
      minWidth('768'),
      maxWidth('48rem'),
    ]) {
      expect(matchMedia(query).media).not.toBe('not all');
    }

    await page.viewport(768, 700);
    await expect.poll(() => matchMedia(minWidth(768)).matches).toBe(true);
    expect(matchMedia(maxWidth(768)).matches).toBe(false);

    await page.viewport(767, 700);
    await expect.poll(() => matchMedia(minWidth(768)).matches).toBe(false);
    expect(matchMedia(maxWidth(768)).matches).toBe(true);
  });

  it('emits once per jump across several breakpoints', async () => {
    const rs = track(createResponsiveState(tailwind));
    const transitions: string[] = [];
    rs.subscribe((next, prev) => transitions.push(`${prev.current}->${next.current}`));

    await page.viewport(300, 700);
    await expect.poll(() => rs.get().current).toBe('base');
    await page.viewport(1600, 700);
    await expect.poll(() => rs.get().current).toBe('2xl');

    expect(transitions).toEqual(['md->base', 'base->2xl']);
  });

  it('mirrors the breakpoint onto <html>', async () => {
    track(createResponsiveState(tailwind, { syncAttribute: true }));
    const html = document.documentElement;
    expect(html.getAttribute('data-breakpoint')).toBe('md');

    await page.viewport(1100, 700);
    await expect.poll(() => html.getAttribute('data-breakpoint')).toBe('lg');
  });

  it('tracks feature queries', async () => {
    const rs = track(
      createResponsiveState(tailwind, {
        features: { portrait: '(orientation: portrait)' },
      }),
    );
    expect(rs.feature('portrait')).toBe(false);

    await page.viewport(600, 900);
    await expect.poll(() => rs.feature('portrait')).toBe(true);
  });

  it('tracks the viewport size when enabled', async () => {
    const rs = track(createResponsiveState(tailwind, { trackViewport: true }));
    expect(rs.get().width).toBe(window.innerWidth);

    await page.viewport(950, 610);
    await expect.poll(() => rs.get().width).toBe(950);
    expect(rs.get().height).toBe(610);
  });

  it('detaches from matchMedia on destroy', async () => {
    const rs = createResponsiveState(tailwind);
    const spy = vi.fn();
    rs.subscribe(spy);
    rs.destroy();

    await page.viewport(1300, 700);
    await expect.poll(() => matchMedia(minWidth(1280)).matches).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect(rs.get().current).toBe('md');
  });

  it('reports a throwing subscriber without starving the others', async () => {
    // The runner patches `reportError` to fail the test, so observe it instead.
    const reportError = vi.spyOn(window, 'reportError').mockImplementation(() => {});
    try {
      const rs = track(createResponsiveState(tailwind));
      const error = new Error('boom');
      const second = vi.fn();
      rs.subscribe(() => {
        throw error;
      });
      rs.subscribe(second);

      await page.viewport(1300, 700);
      await expect.poll(() => second.mock.calls.length).toBe(1);
      expect(reportError).toHaveBeenCalledWith(error);
    } finally {
      reportError.mockRestore();
    }
  });
});
