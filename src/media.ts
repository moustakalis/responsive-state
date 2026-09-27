import type { BreakpointMap, BreakpointName } from './types';

const UNITLESS = /^-?(?:\d+\.?\d*|\.\d+)$/;

/**
 * Normalizes a breakpoint value to a CSS length string. Numbers and unitless
 * numeric strings (`'768'`) are treated as pixels, because a unitless non-zero
 * length is invalid inside a media query and would never match.
 */
export function toLength(value: number | string): string {
  if (typeof value === 'number') return `${value}px`;
  const trimmed = value.trim();
  return UNITLESS.test(trimmed) ? `${trimmed}px` : trimmed;
}

/**
 * Subtracts the smallest representable step from a length so `max-width`
 * ranges never overlap their `min-width` neighbour. Uses a 0.02px fudge
 * factor, which keeps ranges exclusive under sub-pixel zoom.
 */
export function stepDown(value: number | string): string {
  if (typeof value === 'number') return `${value - 0.02}px`;
  const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(value.trim());
  if (!match) return `calc(${value} - 0.02px)`;
  const [, num, rawUnit] = match;
  const unit = rawUnit!.toLowerCase();
  const delta = unit === 'px' || unit === '' ? 0.02 : 0.001;
  return `${Number(num) - delta}${unit || 'px'}`;
}

export function minWidth(value: number | string): string {
  return `(min-width: ${toLength(value)})`;
}

export function maxWidth(value: number | string): string {
  return `(max-width: ${stepDown(value)})`;
}

export function betweenWidth(from: number | string, to: number | string): string {
  return `${minWidth(from)} and ${maxWidth(to)}`;
}

/**
 * Approximates a length in px for ordering only. `rem`/`em` assume the 16px
 * initial font size that media queries resolve against; anything else sorts
 * last.
 * @internal
 */
export const ORDERABLE_LENGTH = /^(-?[\d.]+)(px|rem|em)?$/i;

export function toPx(value: number | string): number {
  if (typeof value === 'number') return value;
  const match = ORDERABLE_LENGTH.exec(value.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const num = Number(match[1]);
  const unit = (match[2] ?? 'px').toLowerCase();
  return unit === 'px' ? num : num * 16;
}

/** @internal Breakpoint names in ascending width order. */
export function sortBreakpoints<T extends BreakpointMap>(
  breakpoints: T,
): BreakpointName<T>[] {
  return (Object.keys(breakpoints) as BreakpointName<T>[]).sort(
    (a, b) => toPx(breakpoints[a]!) - toPx(breakpoints[b]!),
  );
}

/**
 * Builds one exclusive media query per breakpoint tier, for CSS-in-JS or
 * anywhere you need the raw query string. Ranges never overlap.
 *
 * @example
 * toMediaQueries({ base: 0, md: 768, lg: 1024 })
 * // {
 * //   base: '(max-width: 767.98px)',
 * //   md:   '(min-width: 768px) and (max-width: 1023.98px)',
 * //   lg:   '(min-width: 1024px)',
 * // }
 */
export function toMediaQueries<T extends BreakpointMap>(
  breakpoints: T,
): Readonly<Record<BreakpointName<T>, string>> {
  const names = sortBreakpoints(breakpoints);
  const queries = {} as Record<BreakpointName<T>, string>;
  names.forEach((name, i) => {
    const next = names[i + 1];
    const parts: string[] = [];
    if (i > 0 || toPx(breakpoints[name]!) !== 0) parts.push(minWidth(breakpoints[name]!));
    if (next !== undefined) parts.push(maxWidth(breakpoints[next]!));
    queries[name] = parts.join(' and ') || 'all';
  });
  return Object.freeze(queries);
}
