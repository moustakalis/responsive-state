/** Normalizes a breakpoint value to a CSS length string. */
export function toLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
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
  const [, num, unit] = match;
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
