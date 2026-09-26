/**
 * Tailwind CSS v4 default breakpoints. Uses `rem` like Tailwind itself, so
 * JavaScript stays in sync with your CSS when users change their browser
 * font size.
 */
export const tailwind = {
  base: 0,
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
} as const;

/** Tailwind CSS v3 default screens (px). */
export const tailwind3 = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Bootstrap 5 grid tiers. */
export const bootstrap = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
} as const;

/** Material Design 3 window size classes. */
export const material = {
  compact: 0,
  medium: 600,
  expanded: 840,
  large: 1200,
  extraLarge: 1600,
} as const;

/** Ant Design grid breakpoints. */
export const antDesign = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
  xxxl: 1920,
} as const;

/** Bulma responsiveness breakpoints. */
export const bulma = {
  mobile: 0,
  tablet: 769,
  desktop: 1024,
  widescreen: 1216,
  fullhd: 1408,
} as const;

/** Foundation for Sites 6 breakpoints. */
export const foundation = {
  small: 0,
  medium: 640,
  large: 1024,
  xlarge: 1200,
  xxlarge: 1440,
} as const;

/** Three-tier device-class preset. */
export const devices = {
  mobile: 0,
  tablet: 768,
  desktop: 1440,
} as const;
