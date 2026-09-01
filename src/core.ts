import { minWidth } from './media';
import type {
  BreakpointMap,
  BreakpointName,
  Listener,
  MatchMap,
  PickOptions,
  ResponsiveSnapshot,
  ResponsiveStateOptions,
  Unsubscribe,
} from './types';

const NOOP: Unsubscribe = () => {};

function resolveWindow(injected?: Window | null): Window | null {
  if (injected !== undefined) return injected;
  return (globalThis as { window?: Window }).window ?? null;
}

function toPx(value: number | string): number {
  if (typeof value === 'number') return value;
  const match = /^(-?[\d.]+)(px|rem|em)?$/i.exec(value.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const num = Number(match[1]);
  const unit = (match[2] ?? 'px').toLowerCase();
  return unit === 'px' ? num : num * 16;
}

export interface ResponsiveState<K extends string, F extends string = never> {
  /** Current immutable snapshot. Safe to read synchronously at any time. */
  get(): ResponsiveSnapshot<K, F>;
  /** Subscribe to breakpoint changes. Fires only when the snapshot changes. */
  subscribe(listener: Listener<ResponsiveSnapshot<K, F>>): Unsubscribe;
  /** `true` when the active breakpoint is exactly `name`. */
  is(name: K): boolean;
  /** `true` at `name` and wider (mobile-first `>=`). */
  up(name: K): boolean;
  /** `true` at `name` and narrower (`<=`, inclusive of `name`'s range). */
  down(name: K): boolean;
  /** `true` between `from` (inclusive) and `to` (exclusive). */
  between(from: K, to: K): boolean;
  /** `true` when a named feature query matches. */
  feature(name: F): boolean;
  /**
   * Resolves a value for the current breakpoint. By default, uses the nearest
   * smaller defined breakpoint (mobile-first); pass `{ fallbackDirection:
   * 'down' }` to use the nearest larger one (desktop-first).
   */
  pick<V>(values: Partial<Record<K, V>>, fallback: V, options?: PickOptions): V;
  /** Detach all listeners. The store becomes inert but still readable. */
  destroy(): void;
  /** Ascending breakpoint names. */
  readonly breakpoints: readonly K[];
  /** For `useSyncExternalStore` / server rendering. */
  getServerSnapshot(): ResponsiveSnapshot<K, F>;
}

export function createResponsiveState<
  T extends BreakpointMap,
  F extends string = never,
>(
  breakpoints: T,
  options: ResponsiveStateOptions<F> = {},
): ResponsiveState<BreakpointName<T>, F> {
  type K = BreakpointName<T>;

  const names = (Object.keys(breakpoints) as K[]).sort(
    (a, b) => toPx(breakpoints[a]!) - toPx(breakpoints[b]!),
  );
  if (names.length === 0) {
    throw new Error('[responsive-state] At least one breakpoint is required.');
  }

  const featureEntries = Object.entries(options.features ?? {}) as [F, string][];
  const win = resolveWindow(options.window);
  const supported = !!win && typeof win.matchMedia === 'function';

  const ssrName = (options.ssrBreakpoint as K | undefined) ?? names[0]!;
  if (!names.includes(ssrName)) {
    throw new Error(`[responsive-state] Unknown ssrBreakpoint "${ssrName}".`);
  }

  const lists = supported
    ? names.map((name) => win!.matchMedia(minWidth(breakpoints[name]!)))
    : [];
  const featureLists = supported
    ? featureEntries.map(([, query]) => win!.matchMedia(query))
    : [];

  function build(activeIndex: number, features: boolean[]): ResponsiveSnapshot<K, F> {
    const current = names[activeIndex]!;
    const is = {} as MatchMap<K>;
    const up = {} as MatchMap<K>;
    const down = {} as MatchMap<K>;
    names.forEach((name, i) => {
      is[name] = i === activeIndex;
      up[name] = activeIndex >= i;
      down[name] = activeIndex <= i;
    });
    const featureMap = {} as MatchMap<F>;
    featureEntries.forEach(([name], i) => {
      featureMap[name] = features[i] ?? false;
    });
    const track = options.trackViewport && win;
    return Object.freeze({
      current,
      index: activeIndex,
      active: Object.freeze(names.slice(0, activeIndex + 1)),
      is: Object.freeze(is),
      up: Object.freeze(up),
      down: Object.freeze(down),
      features: Object.freeze(featureMap),
      width: track ? win!.innerWidth : 0,
      height: track ? win!.innerHeight : 0,
    });
  }

  function readIndex(): number {
    if (!supported) return names.indexOf(ssrName);
    let idx = 0;
    for (let i = 0; i < lists.length; i++) if (lists[i]!.matches) idx = i;
    return idx;
  }

  function readFeatures(): boolean[] {
    return featureLists.map((list) => list.matches);
  }

  const serverSnapshot = build(names.indexOf(ssrName), featureEntries.map(() => false));
  let snapshot = supported ? build(readIndex(), readFeatures()) : serverSnapshot;

  const listeners = new Set<Listener<ResponsiveSnapshot<K, F>>>();
  const cleanups: Unsubscribe[] = [];
  let destroyed = false;

  const attr = (() => {
    const cfg = options.syncAttribute;
    if (!cfg || !win) return null;
    const target =
      (typeof cfg === 'object' ? cfg.target : null) ?? win.document?.documentElement ?? null;
    const name = (typeof cfg === 'object' && cfg.name) || 'data-breakpoint';
    return target ? { target, name } : null;
  })();

  function emit(next: ResponsiveSnapshot<K, F>): void {
    if (
      next.current === snapshot.current &&
      next.width === snapshot.width &&
      next.height === snapshot.height &&
      featureEntries.every(([name]) => next.features[name] === snapshot.features[name])
    ) {
      return;
    }
    const previous = snapshot;
    snapshot = next;
    attr?.target.setAttribute(attr.name, next.current);
    for (const listener of listeners) listener(next, previous);
  }

  function update(): void {
    if (destroyed) return;
    emit(build(readIndex(), readFeatures()));
  }

  if (supported) {
    for (const list of [...lists, ...featureLists]) {
      list.addEventListener('change', update);
      cleanups.push(() => list.removeEventListener('change', update));
    }
    if (options.trackViewport) {
      let frame = 0;
      const onResize = () => {
        if (frame) return;
        frame = win!.requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      };
      win!.addEventListener('resize', onResize, { passive: true });
      cleanups.push(() => {
        if (frame) win!.cancelAnimationFrame(frame);
        win!.removeEventListener('resize', onResize);
      });
    }
    attr?.target.setAttribute(attr.name, snapshot.current);
  }

  return {
    breakpoints: names,
    get: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      if (destroyed) return NOOP;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    is: (name) => snapshot.is[name] ?? false,
    up: (name) => snapshot.up[name] ?? false,
    down: (name) => snapshot.down[name] ?? false,
    between(from, to) {
      const a = names.indexOf(from);
      const b = names.indexOf(to);
      return a >= 0 && b >= 0 && snapshot.index >= a && snapshot.index < b;
    },
    feature: (name) => snapshot.features[name] ?? false,
    pick(values, fallback, pickOptions) {
      const step = pickOptions?.fallbackDirection === 'down' ? 1 : -1;
      const end = step === 1 ? names.length : -1;

      for (let i = snapshot.index; i !== end; i += step) {
        const value = values[names[i]!];
        if (value !== undefined) return value;
      }

      return fallback;
    },
    destroy() {
      destroyed = true;
      for (const off of cleanups.splice(0)) off();
      listeners.clear();
    },
  };
}
