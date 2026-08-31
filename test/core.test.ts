import { describe, expect, it, vi } from 'vitest';
import { createResponsiveState, tailwind, devices } from '../src';
import { createFakeWindow } from './matchMedia';

describe('createResponsiveState', () => {
  it('resolves the active breakpoint on creation', () => {
    const { window } = createFakeWindow(1024);
    const rs = createResponsiveState(tailwind, { window });
    expect(rs.get().current).toBe('lg');
    expect(rs.get().index).toBe(3);
  });

  it('exposes exact, up and down maps', () => {
    const { window } = createFakeWindow(800);
    const rs = createResponsiveState(tailwind, { window });
    expect(rs.is('md')).toBe(true);
    expect(rs.up('sm')).toBe(true);
    expect(rs.up('lg')).toBe(false);
    expect(rs.down('xl')).toBe(true);
    expect(rs.between('sm', 'lg')).toBe(true);
    expect(rs.between('lg', '2xl')).toBe(false);
  });

  it('reports the cumulative active list', () => {
    const { window } = createFakeWindow(1024);
    const rs = createResponsiveState(tailwind, { window });
    expect(rs.get().active).toEqual(['base', 'sm', 'md', 'lg']);
  });

  it('notifies subscribers only when the breakpoint changes', () => {
    const { window, resize } = createFakeWindow(500);
    const rs = createResponsiveState(tailwind, { window });
    const spy = vi.fn();
    rs.subscribe(spy);
    resize(700);
    resize(720);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(rs.get().current).toBe('sm');
    resize(1280);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]![1].current).toBe('sm');
  });

  it('stops notifying after unsubscribe', () => {
    const { window, resize } = createFakeWindow(500);
    const rs = createResponsiveState(devices, { window });
    const spy = vi.fn();
    rs.subscribe(spy)();
    resize(1500);
    expect(spy).not.toHaveBeenCalled();
  });

  it('picks values with mobile-first fallback', () => {
    const { window, resize } = createFakeWindow(1280);
    const rs = createResponsiveState(tailwind, { window });
    const columns = { base: 1, md: 2, '2xl': 6 } as const;
    expect(rs.pick(columns, 1)).toBe(2);
    resize(1600);
    expect(rs.pick(columns, 1)).toBe(6);
  });

  it('tracks extra feature queries', () => {
    const { window, resize } = createFakeWindow(1200, 800);
    const rs = createResponsiveState(devices, {
      window,
      features: { portrait: '(orientation: portrait)' },
    });
    expect(rs.feature('portrait')).toBe(false);
    resize(600, 900);
    expect(rs.feature('portrait')).toBe(true);
  });

  it('mirrors the breakpoint onto a data attribute', () => {
    const { window, resize } = createFakeWindow(400);
    createResponsiveState(devices, { window, syncAttribute: true });
    const el = window.document.documentElement;
    expect(el.getAttribute('data-breakpoint')).toBe('mobile');
    resize(1500);
    expect(el.getAttribute('data-breakpoint')).toBe('desktop');
  });

  it('tracks viewport size when enabled', () => {
    const { window, resize } = createFakeWindow(900, 600);
    const rs = createResponsiveState(devices, { window, trackViewport: true });
    expect(rs.get().width).toBe(900);
    resize(950, 610);
    expect(rs.get().width).toBe(950);
    expect(rs.get().height).toBe(610);
  });

  it('falls back to the SSR breakpoint without a window', () => {
    const rs = createResponsiveState(tailwind, { window: null, ssrBreakpoint: 'lg' });
    expect(rs.get().current).toBe('lg');
    expect(rs.getServerSnapshot().current).toBe('lg');
    expect(rs.get().width).toBe(0);
  });

  it('rejects an unknown ssrBreakpoint', () => {
    expect(() =>
      createResponsiveState(tailwind, { window: null, ssrBreakpoint: 'nope' }),
    ).toThrow(/unknown ssrbreakpoint/i);
  });

  it('stops emitting after destroy', () => {
    const { window, resize } = createFakeWindow(400);
    const rs = createResponsiveState(devices, { window });
    const spy = vi.fn();
    rs.subscribe(spy);
    rs.destroy();
    resize(1500);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an empty breakpoint map', () => {
    expect(() => createResponsiveState({})).toThrow(/at least one breakpoint/i);
  });

  it('accepts rem-based breakpoints', () => {
    const { window } = createFakeWindow(700);
    const rs = createResponsiveState({ base: 0, wide: '48rem' }, { window });
    expect(rs.get().current).toBe('base');
  });

  it('sorts breakpoints declared out of order', () => {
    const { window } = createFakeWindow(1000);
    const rs = createResponsiveState({ wide: 1200, base: 0, mid: 800 }, { window });
    expect(rs.breakpoints).toEqual(['base', 'mid', 'wide']);
    expect(rs.get().current).toBe('mid');
  });
});
