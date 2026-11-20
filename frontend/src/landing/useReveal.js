import { useLayoutEffect } from 'react'
import { gsap } from './gsap'
import { EASE, MEDIA } from './theme'

/**
 * Attaches a scroll-triggered reveal to elements with [data-reveal]
 * inside the given container ref. Reverts on unmount.
 */
export function useReveal(containerRef, { start = 'top 82%', stagger = 0.08 } = {}) {
  useLayoutEffect(() => {
    if (!containerRef.current) return

    const mm = gsap.matchMedia(containerRef)

    mm.add(MEDIA.motionOk, () => {
      const targets = gsap.utils.toArray('[data-reveal]', containerRef.current)
      if (!targets.length) return

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: EASE.out,
          stagger,
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            once: true,
          },
        },
      )
    })

    return () => mm.revert()
  }, [containerRef, start, stagger])
}
