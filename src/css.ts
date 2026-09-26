import { resolveWindow } from './env';
import type { BreakpointMap, BreakpointName } from './types';

export interface CssVariableOptions {
  /**
   * Custom property prefix. The breakpoint name is appended to it.
   * @default '--breakpoint-' (Tailwind CSS v4)
   */
  prefix?: string;
  /** Element to read the variables from. Defaults to `<html>`. */
  target?: Element | null;
  /** Injectable window for tests / iframes. */
  window?: Window | null;
}

/**
 * Reads breakpoint widths from CSS custom properties so JavaScript and CSS
 * share one source of truth. Every name in `fallback` is looked up as
 * `${prefix}${name}` (e.g. `--breakpoint-md`); names without a variable, and
 * every name during SSR, keep their fallback value.
 *
 * Tailwind CSS v4 only emits theme variables that your CSS uses. Declare the
 * breakpoints in `@theme static { ... }` (or reference them) so they exist at
 * runtime.
 *
 * @example
 * import { createResponsiveState, fromCssVariables, tailwind } from 'responsive-state';
 * const viewport = createResponsiveState(fromCssVariables(tailwind));
 */
export function fromCssVariables<T extends BreakpointMap>(
  fallback: T,
  options: CssVariableOptions = {},
): Record<BreakpointName<T>, number | string> {
  const result: Record<string, number | string> = { ...fallback };
  const win = resolveWindow(options.window);
  const target = options.target ?? win?.document?.documentElement;
  if (!win || !target || typeof win.getComputedStyle !== 'function') return result;

  const style = win.getComputedStyle(target);
  const prefix = options.prefix ?? '--breakpoint-';
  for (const name of Object.keys(fallback)) {
    const value = style.getPropertyValue(prefix + name).trim();
    if (value && value !== 'initial') result[name] = value;
  }
  return result;
}
