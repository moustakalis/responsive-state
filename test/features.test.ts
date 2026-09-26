import { describe, expect, it, vi } from 'vitest';
import {
  antDesign,
  bootstrap,
  bulma,
  createResponsiveState,
  devices,
  foundation,
  fromCssVariables,
  material,
  tailwind,
  tailwind3,
  toMediaQueries,
} from '../src';
import { createFakeWindow } from './matchMedia';

describe('below()', () => {
  it('is strictly narrower than the named breakpoint', () => {
    const { window, resize } = createFakeWindow(800);
    const rs = createResponsiveState(tailwind3, { window });
    expect(rs.get().current).toBe('md');
    expect(rs.below('md')).toBe(false);
    expect(rs.below('lg')).toBe(true);
    expect(rs.down('md')).toBe(true);
    expect(rs.get().below).toMatchObject({
      base: false,
      md: false,
      lg: true,
      '2xl': true,
    });

    resize(700);
    expect(rs.below('md')).toBe(true);
  });
});

describe('watch()', () => {
  it('fires only when the selected value changes', () => {
    const { window, resize } = createFakeWindow(500);
    const rs = createResponsiveState(tailwind3, { window });
    const spy = vi.fn();
    rs.watch((s) => s.up.lg, spy);

    resize(700); // sm: still not lg
    resize(900); // md
    expect(spy).not.toHaveBeenCalled();

    resize(1100);
    expect(spy).toHaveBeenCalledExactlyOnceWith(true, false);
    resize(1400);
    expect(spy).toHaveBeenCalledTimes(1);
    resize(600);
    expect(spy).toHaveBeenLastCalledWith(false, true);
  });

  it('supports derived tiers across breakpoints and features', () => {
    const { window, resize } = createFakeWindow(400, 800);
    const rs = createResponsiveState(tailwind3, {
      window,
      features: { portrait: '(orientation: portrait)' },
    });
    const handset = vi.fn();
    rs.watch((s) => s.below.md && s.features.portrait, handset, { immediate: true });
    expect(handset).toHaveBeenLastCalledWith(true, true);

    resize(700, 400); // still below md, now landscape
    expect(handset).toHaveBeenLastCalledWith(false, true);
    expect(handset).toHaveBeenCalledTimes(2);
  });

  it('reports a throwing immediate listener and stays registered', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    try {
      const { window, resize } = createFakeWindow(500);
      const rs = createResponsiveState(tailwind3, { window });
      const error = new Error('boom');
      const calls: boolean[] = [];
      expect(() =>
        rs.watch(
          (s) => s.up.lg,
          (value) => {
            calls.push(value);
            if (calls.length === 1) throw error;
          },
          { immediate: true },
        ),
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledWith(error);

      resize(1300);
      expect(calls).toEqual([false, true]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does nothing once the store is destroyed', () => {
    const { window } = createFakeWindow(500);
    const rs = createResponsiveState(tailwind3, { window });
    rs.destroy();
    const spy = vi.fn();
    rs.watch((s) => s.current, spy, { immediate: true })();
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts a custom equality check and unsubscribes', () => {
    const { window, resize } = createFakeWindow(500);
    const rs = createResponsiveState(tailwind3, { window });
    const spy = vi.fn();
    const stop = rs.watch((s) => [...s.active], spy, {
      equals: (a, b) => a.length === b.length,
    });

    resize(700);
    expect(spy).toHaveBeenCalledTimes(1);
    stop();
    resize(1300);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('ssr', () => {
  it('resolves the server breakpoint from a width', () => {
    const rs = createResponsiveState(tailwind, { window: null, ssr: { width: 1100 } });
    expect(rs.getServerSnapshot().current).toBe('lg');
    expect(rs.get().current).toBe('lg');
  });

  it('uses assumed feature values and reports size when tracking', () => {
    const rs = createResponsiveState(devices, {
      window: null,
      trackViewport: true,
      features: { dark: '(prefers-color-scheme: dark)', touch: '(pointer: coarse)' },
      ssr: { width: 800, height: 600, features: { dark: true } },
    });
    const snap = rs.getServerSnapshot();
    expect(snap.current).toBe('tablet');
    expect(snap.features).toEqual({ dark: true, touch: false });
    expect([snap.width, snap.height]).toEqual([800, 600]);
  });

  it('keeps the server snapshot separate from the live client snapshot', () => {
    const { window } = createFakeWindow(1300);
    const rs = createResponsiveState(tailwind3, { window, ssr: { width: 375 } });
    expect(rs.getServerSnapshot().current).toBe('base');
    expect(rs.get().current).toBe('xl');
  });

  it('still reports the real size when the window lacks matchMedia', () => {
    const window = { innerWidth: 900, innerHeight: 600 } as unknown as Window;
    const rs = createResponsiveState(tailwind, { window, trackViewport: true });
    expect([rs.get().width, rs.get().height]).toEqual([900, 600]);
    expect(rs.get().current).toBe('base');
    expect(rs.getServerSnapshot().width).toBe(0);
  });

  it('rejects combining ssrBreakpoint with ssr.width', () => {
    expect(() =>
      createResponsiveState(tailwind, {
        window: null,
        ssrBreakpoint: 'md',
        ssr: { width: 1 },
      }),
    ).toThrow(/either ssrBreakpoint or ssr.width/);
  });
});

describe('snapshot tier range', () => {
  it('exposes the current tier bounds as CSS lengths', () => {
    const { window, resize } = createFakeWindow(800);
    const rs = createResponsiveState(tailwind, { window });
    expect([rs.get().min, rs.get().max]).toEqual(['48rem', '64rem']);
    resize(1600);
    expect([rs.get().min, rs.get().max]).toEqual(['96rem', null]);
    resize(300);
    expect([rs.get().min, rs.get().max]).toEqual(['0px', '40rem']);
  });
});

describe('toMediaQueries()', () => {
  it('builds exclusive, ordered tier queries', () => {
    expect(toMediaQueries({ lg: 1024, base: 0, md: '48rem' })).toEqual({
      base: '(max-width: 47.999rem)',
      md: '(min-width: 48rem) and (max-width: 1023.98px)',
      lg: '(min-width: 1024px)',
    });
  });

  it('matches exactly one tier at any width', () => {
    const queries = Object.values(toMediaQueries(tailwind3));
    for (const width of [0, 639, 640, 767, 768, 1023, 1024, 1535, 1536, 3000]) {
      const { window } = createFakeWindow(width);
      const matching = queries.filter((q) => window.matchMedia(q).matches);
      expect(matching, `at ${width}px`).toHaveLength(1);
    }
  });

  it('handles a single tier and a non-zero first tier', () => {
    expect(toMediaQueries({ only: 0 })).toEqual({ only: 'all' });
    expect(toMediaQueries({ sm: 640 })).toEqual({ sm: '(min-width: 640px)' });
  });
});

describe('fromCssVariables()', () => {
  function cssWindow(vars: Record<string, string>) {
    return {
      document: { documentElement: {} },
      getComputedStyle: () => ({ getPropertyValue: (name: string) => vars[name] ?? '' }),
    } as unknown as Window;
  }

  it('overrides fallback values with CSS custom properties', () => {
    const window = cssWindow({
      '--breakpoint-md': ' 50rem ',
      '--breakpoint-xl': 'initial',
    });
    expect(fromCssVariables(tailwind, { window })).toEqual({ ...tailwind, md: '50rem' });
  });

  it('ignores values that cannot be ordered by width', () => {
    const window = cssWindow({
      '--breakpoint-sm': 'calc(40rem + 1px)',
      '--breakpoint-md': '50vw',
      '--breakpoint-lg': '1000',
      '--breakpoint-xl': '70EM',
    });
    expect(fromCssVariables(tailwind, { window })).toEqual({
      ...tailwind,
      lg: '1000',
      xl: '70EM',
    });
  });

  it('supports a custom prefix and target', () => {
    const target = {} as Element;
    const getComputedStyle = vi.fn(() => ({
      getPropertyValue: (name: string) => (name === '--bp-tablet' ? '700px' : ''),
    }));
    const window = { getComputedStyle } as unknown as Window;
    expect(fromCssVariables(devices, { window, target, prefix: '--bp-' })).toEqual({
      ...devices,
      tablet: '700px',
    });
    expect(getComputedStyle).toHaveBeenCalledWith(target);
  });

  it('returns the fallback without a DOM', () => {
    const result = fromCssVariables(tailwind, { window: null });
    expect(result).toEqual(tailwind);
    expect(result).not.toBe(tailwind);
  });
});

describe('legacy MediaQueryList listeners', () => {
  it('falls back to addListener/removeListener', () => {
    const { window, resize } = createFakeWindow(500);
    const native = window.matchMedia.bind(window);
    const added = vi.fn();
    const removed = vi.fn();
    window.matchMedia = (query: string) => {
      const list = native(query);
      return {
        get matches() {
          return list.matches;
        },
        media: list.media,
        addListener(cb: () => void) {
          added();
          list.addEventListener('change', cb);
        },
        removeListener(cb: () => void) {
          removed();
          list.removeEventListener('change', cb);
        },
      } as unknown as MediaQueryList;
    };

    const rs = createResponsiveState(tailwind3, { window });
    resize(1300);
    expect(rs.get().current).toBe('xl');
    expect(added).toHaveBeenCalledTimes(6);
    rs.destroy();
    expect(removed).toHaveBeenCalledTimes(6);
  });
});

describe('presets', () => {
  it.each(
    Object.entries({
      tailwind,
      tailwind3,
      bootstrap,
      material,
      antDesign,
      bulma,
      foundation,
      devices,
    }),
  )('%s is a valid breakpoint map', (_, preset) => {
    const rs = createResponsiveState(preset, { window: null });
    expect(rs.breakpoints).toEqual(Object.keys(preset));
  });

  it('keeps tailwind (rem) and tailwind3 (px) equivalent at the default font size', () => {
    for (const width of [639, 640, 1023, 1024, 1536]) {
      const { window } = createFakeWindow(width);
      expect(createResponsiveState(tailwind, { window }).get().current).toBe(
        createResponsiveState(tailwind3, { window }).get().current,
      );
    }
  });
});
