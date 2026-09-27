import { resolveWindow } from './env';
import { minWidth, sortBreakpoints, toLength, toPx } from './media';
import type {
  BreakpointMap,
  BreakpointName,
  Listener,
  MatchMap,
  PickOptions,
  ResponsiveSnapshot,
  ResponsiveStateOptions,
  Unsubscribe,
  WatchOptions,
} from './types';

const NOOP: Unsubscribe = () => {};

/**
 * Surfaces a subscriber's error without letting it stop the remaining
 * subscribers or escape from the `matchMedia` change handler. Uses the
 * standard `reportError` where available, which fires `window.onerror` and
 * logs to the console like an uncaught error would.
 */
function reportListenerError(error: unknown): void {
  const scope = globalThis as { reportError?: (e: unknown) => void };
  if (typeof scope.reportError === 'function') {
    // Called as a method: an unbound `reportError` throws "Illegal invocation".
    scope.reportError(error);
  } else {
    setTimeout(() => {
      throw error;
    });
  }
}

/**
 * Listens for `change` on a MediaQueryList, falling back to the legacy
 * `addListener` API for Safari 13 and older.
 */
function listen(list: MediaQueryList, callback: () => void): Unsubscribe {
  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', callback);
    return () => list.removeEventListener('change', callback);
  }
  list.addListener(callback);
  return () => list.removeListener(callback);
}

export interface ResponsiveState<K extends string, F extends string = never> {
  /** Current immutable snapshot. Safe to read synchronously at any time. */
  get(): ResponsiveSnapshot<K, F>;
  /** Subscribe to breakpoint changes. Fires only when the snapshot changes. */
  subscribe(listener: Listener<ResponsiveSnapshot<K, F>>): Unsubscribe;
  /**
   * Watch a value derived from the snapshot. The listener runs only when the
   * selected value changes, which makes "entered / left desktop" style logic
   * and custom tiers one-liners.
   *
   * @example
   * rs.watch((s) => s.up.lg, (isDesktop) => { if (isDesktop) closeMobileMenu(); });
   */
  watch<T>(
    selector: (snapshot: ResponsiveSnapshot<K, F>) => T,
    listener: (value: T, previous: T) => void,
    options?: WatchOptions<T>,
  ): Unsubscribe;
  /** `true` when the active breakpoint is exactly `name`. */
  is(name: K): boolean;
  /** `true` at `name` and wider (mobile-first `>=`). */
  up(name: K): boolean;
  /** `true` at `name` and narrower (`<=`, inclusive of `name`'s range). */
  down(name: K): boolean;
  /**
   * `true` when strictly narrower than `name` (`<`). Matches Tailwind's
   * `max-*` variants and the `maxWidth()` helper.
   */
  below(name: K): boolean;
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
  /** Ascending breakpoint names (frozen). */
  readonly breakpoints: readonly K[];
  /** For `useSyncExternalStore` / server rendering. */
  getServerSnapshot(): ResponsiveSnapshot<K, F>;
}

export function createResponsiveState<T extends BreakpointMap, F extends string = never>(
  breakpoints: T,
  // `string & {}` keeps literal autocomplete while still accepting options
  // objects typed as `ResponsiveStateOptions<F>` (where the name is `string`).
  options: ResponsiveStateOptions<F, BreakpointName<T> | (string & {})> = {},
): ResponsiveState<BreakpointName<T>, F> {
  type K = BreakpointName<T>;

  const names = sortBreakpoints(breakpoints);
  if (names.length === 0) {
    throw new Error('[responsive-state] At least one breakpoint is required.');
  }
  // The smallest tier is the fallback when no larger min-width matches, so it
  // must genuinely cover every viewport. Otherwise `current`, `up` and
  // `active` would claim a match the browser does not report.
  const smallest = names[0]!;
  if (toPx(breakpoints[smallest]!) !== 0) {
    const shown = JSON.stringify(breakpoints[smallest]);
    throw new Error(
      `[responsive-state] The smallest breakpoint must start at 0 (got ${smallest}: ${shown}). ` +
        `Add a base tier, e.g. { base: 0, ${smallest}: ${shown}, ... }.`,
    );
  }
  Object.freeze(names);

  const featureEntries = Object.entries(options.features ?? {}) as [F, string][];
  const win = resolveWindow(options.window);
  const supported = !!win && typeof win.matchMedia === 'function';
  const track = !!options.trackViewport;
  const ssr = options.ssr ?? {};

  if (options.ssrBreakpoint !== undefined && ssr.width !== undefined) {
    throw new Error(
      '[responsive-state] Use either ssrBreakpoint or ssr.width, not both.',
    );
  }
  let ssrIndex = 0;
  if (options.ssrBreakpoint !== undefined) {
    ssrIndex = names.indexOf(options.ssrBreakpoint as K);
    if (ssrIndex < 0) {
      throw new Error(
        `[responsive-state] Unknown ssrBreakpoint "${options.ssrBreakpoint}".`,
      );
    }
  } else if (ssr.width !== undefined) {
    const width = ssr.width;
    names.forEach((name, i) => {
      if (toPx(breakpoints[name]!) <= width) ssrIndex = i;
    });
  }

  const lists = supported
    ? names.map((name) => win!.matchMedia(minWidth(breakpoints[name]!)))
    : [];
  const featureLists = supported
    ? featureEntries.map(([, query]) => win!.matchMedia(query))
    : [];

  function build(
    activeIndex: number,
    features: boolean[],
    width: number,
    height: number,
  ): ResponsiveSnapshot<K, F> {
    const current = names[activeIndex]!;
    const next = names[activeIndex + 1];
    const is = {} as MatchMap<K>;
    const up = {} as MatchMap<K>;
    const down = {} as MatchMap<K>;
    const below = {} as MatchMap<K>;
    names.forEach((name, i) => {
      is[name] = i === activeIndex;
      up[name] = activeIndex >= i;
      down[name] = activeIndex <= i;
      below[name] = activeIndex < i;
    });
    const featureMap = {} as MatchMap<F>;
    featureEntries.forEach(([name], i) => {
      featureMap[name] = features[i] ?? false;
    });
    return Object.freeze({
      current,
      index: activeIndex,
      active: Object.freeze(names.slice(0, activeIndex + 1)),
      is: Object.freeze(is),
      up: Object.freeze(up),
      down: Object.freeze(down),
      below: Object.freeze(below),
      features: Object.freeze(featureMap),
      min: toLength(breakpoints[current]!),
      max: next === undefined ? null : toLength(breakpoints[next]!),
      width,
      height,
    });
  }

  function read(): ResponsiveSnapshot<K, F> {
    let idx = 0;
    for (let i = 0; i < lists.length; i++) if (lists[i]!.matches) idx = i;
    return build(
      idx,
      featureLists.map((list) => list.matches),
      track ? win!.innerWidth : 0,
      track ? win!.innerHeight : 0,
    );
  }

  const ssrFeatures = featureEntries.map(([name]) => ssr.features?.[name] ?? false);
  const serverSnapshot = build(
    ssrIndex,
    ssrFeatures,
    track ? (ssr.width ?? 0) : 0,
    track ? (ssr.height ?? 0) : 0,
  );
  // Without matchMedia (e.g. jsdom) the breakpoint falls back to the server
  // assumption, but a real window can still report its size.
  let snapshot = supported
    ? read()
    : track && win
      ? build(ssrIndex, ssrFeatures, win.innerWidth, win.innerHeight)
      : serverSnapshot;

  const listeners = new Set<Listener<ResponsiveSnapshot<K, F>>>();
  const cleanups: Unsubscribe[] = [];
  let destroyed = false;

  const attr = (() => {
    const cfg = options.syncAttribute;
    if (!cfg || !win) return null;
    const target =
      (typeof cfg === 'object' ? cfg.target : null) ??
      win.document?.documentElement ??
      null;
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
    for (const listener of listeners) {
      try {
        listener(next, previous);
      } catch (error) {
        reportListenerError(error);
      }
    }
  }

  function update(): void {
    if (!destroyed) emit(read());
  }

  function subscribe(listener: Listener<ResponsiveSnapshot<K, F>>): Unsubscribe {
    if (destroyed) return NOOP;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  if (supported) {
    for (const list of [...lists, ...featureLists]) cleanups.push(listen(list, update));
    if (track) {
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
    subscribe,
    watch(selector, listener, watchOptions = {}) {
      if (destroyed) return NOOP;
      const equals = watchOptions.equals ?? Object.is;
      let value = selector(snapshot);
      const unsubscribe = subscribe((next) => {
        const selected = selector(next);
        if (equals(selected, value)) return;
        const previous = value;
        value = selected;
        listener(selected, previous);
      });
      if (watchOptions.immediate) {
        // Same isolation as change notifications: a throwing listener is
        // reported, and the watch stays registered.
        try {
          listener(value, value);
        } catch (error) {
          reportListenerError(error);
        }
      }
      return unsubscribe;
    },
    is: (name) => snapshot.is[name] ?? false,
    up: (name) => snapshot.up[name] ?? false,
    down: (name) => snapshot.down[name] ?? false,
    below: (name) => snapshot.below[name] ?? false,
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
