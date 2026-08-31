/** Tailwind CSS default screens. */
export const tailwind = {
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

/** Three-tier device-class preset. */
export const devices = {
  mobile: 0,
  tablet: 768,
  desktop: 1440,
} as const;
