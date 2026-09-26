/**
 * Type-level regression checks. Not executed; `pnpm typecheck` compiles this
 * file, so a broken expectation fails CI.
 */
import { createResponsiveState, tailwind, type ResponsiveStateOptions } from '../src';

// Options objects typed with the public interface keep working (0.3 code).
const typed: ResponsiveStateOptions<'dark'> = {
  features: { dark: '(prefers-color-scheme: dark)' },
};
createResponsiveState(tailwind, typed).feature('dark');

// A runtime string (cookie, header) is still accepted; unknown names throw.
declare const fromCookie: string;
createResponsiveState(tailwind, { ssrBreakpoint: fromCookie });

// Literal names are still offered and accepted.
createResponsiveState(tailwind, { ssrBreakpoint: 'lg' });

// ssr.features must not invent feature names that `features` does not declare.
const noFeatures = createResponsiveState(tailwind, { ssr: { features: { dark: true } } });
// @ts-expect-error -- `dark` was never declared, so it is not a typed feature
noFeatures.feature('dark');
createResponsiveState(tailwind, {
  features: { dark: '(prefers-color-scheme: dark)' },
  // @ts-expect-error -- typo in an assumed feature
  ssr: { features: { drak: true } },
});

// fromCssVariables keeps literal breakpoint names.
import { fromCssVariables } from '../src';
const css = createResponsiveState(fromCssVariables(tailwind));
css.up('md');
// @ts-expect-error -- unknown breakpoint
css.up('huge');
