/**
 * Returns the injected window, or the global one when running in a browser.
 * `null` means "no DOM" (SSR, workers, tests without a window).
 */
export function resolveWindow(injected?: Window | null): Window | null {
  if (injected !== undefined) return injected;
  return (globalThis as { window?: Window }).window ?? null;
}
