export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
}

export const MEDIA = {
  mobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.mobile}px)`,
  motionOk: '(prefers-reduced-motion: no-preference)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
}

export const EASE = {
  standard: 'power2.out',
  out: 'power3.out',
  expo: 'power4.out',
  strong: 'power2.inOut',
}

export const TIMING = {
  fast: 0.25,
  base: 0.4,
  slow: 0.8,
  heroStagger: 0.1,
}
