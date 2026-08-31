/**
 * A breakpoint map: name -> minimum viewport width.
 *
 * Widths may be numbers (interpreted as `px`) or CSS length strings
 * (`'48rem'`, `'768px'`, `'40em'`).
 */
export type BreakpointMap = Record<string, number | string>;

export type BreakpointName<T extends BreakpointMap> = Extract<keyof T, string>;

/** Result of a single named media query. */
export type MatchMap<K extends string> = Record<K, boolean>;

export interface ResponsiveSnapshot<K extends string, F extends string = never> {
  /** The single active breakpoint (largest one whose min-width matches). */
  readonly current: K;
  /** Zero-based index of `current` in ascending breakpoint order. */
  readonly index: number;
  /** Every breakpoint whose min-width currently matches (cumulative). */
  readonly active: readonly K[];
  /** `{ sm: true, md: false, ... }` — exact match only. */
  readonly is: Readonly<MatchMap<K>>;
  /** `{ sm: true, md: true, lg: false }` — `>=` semantics. */
  readonly up: Readonly<MatchMap<K>>;
  /** `{ sm: false, md: true, lg: true }` — `<=` semantics. */
  readonly down: Readonly<MatchMap<K>>;
  /** Extra user-defined feature queries (orientation, pointer, motion...). */
  readonly features: Readonly<MatchMap<F>>;
  /** Viewport width in px at the time of evaluation (`0` during SSR). */
  readonly width: number;
  /** Viewport height in px at the time of evaluation (`0` during SSR). */
  readonly height: number;
}

export type Unsubscribe = () => void;

export type Listener<S> = (snapshot: S, previous: S) => void;

export interface ResponsiveStateOptions<F extends string = never> {
  /**
   * Extra media queries exposed under `snapshot.features`.
   * @example { dark: '(prefers-color-scheme: dark)', touch: '(pointer: coarse)' }
   */
  features?: Record<F, string>;
  /**
   * Breakpoint assumed before hydration / during SSR. Defaults to the
   * smallest breakpoint (mobile-first).
   */
  ssrBreakpoint?: string;
  /**
   * Mirror the active breakpoint onto an element as a `data-*` attribute
   * (e.g. `<html data-breakpoint="md">`). Pass `false` to disable.
   * @default false
   */
  syncAttribute?: boolean | { target?: Element | null; name?: string };
  /**
   * Track viewport width/height in the snapshot. Adds a throttled (rAF)
   * `resize` listener; leave `false` if you only need breakpoints.
   * @default false
   */
  trackViewport?: boolean;
  /** Injectable window for tests / multi-window (iframe, popup) setups. */
  window?: Window | null;
}
