import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'

/**
 * Mounts Lenis smooth scroll wired to GSAP ticker + ScrollTrigger.
 * Use at the top of a page component — auto-destroys on unmount.
 *
 * Skips automatically for:
 *  - prefers-reduced-motion
 *  - touch-only devices (Lenis touchMultiplier handles mobile naturally)
 */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out — same feel as Webflow
      smoothWheel: true,
      touchMultiplier: 1.8,
      infinite: false,
    })

    // Sync Lenis with GSAP's ticker (single rAF loop — no double rAF)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    // Keep ScrollTrigger scroll position in sync
    lenis.on('scroll', ScrollTrigger.update)

    return () => {
      lenis.destroy()
      // Remove all gsap ticker listeners added by this instance
      gsap.ticker.remove((time) => lenis.raf(time * 1000))
      gsap.ticker.lagSmoothing(1000, 50) // restore default
    }
  }, [])
}
