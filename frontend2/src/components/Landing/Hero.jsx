import { useLayoutEffect, useRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'

import { useAuth } from '../../hooks/useAuth'
import { gsap } from '../../landing/gsap'
import { EASE, MEDIA } from '../../landing/theme'

import Button from './common/Button'
import './Hero.css'

export default function Hero() {
  const ref = useRef(null)
  const { isAuthenticated } = useAuth()

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(ref)

    mm.add(MEDIA.motionOk, () => {
      gsap.from('[data-hero]', {
        y: 28,
        autoAlpha: 0,
        duration: 1.1,
        ease: EASE.out,
        stagger: 0.1,
        delay: 0.15,
      })

      gsap.to('.hero__orb--one', {
        yPercent: -45,
        xPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.2 },
      })

      gsap.to('.hero__orb--two', {
        yPercent: 55,
        xPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.4 },
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <section className='hero' id='top' ref={ref}>
      <div className='hero__ambient' aria-hidden='true'>
        <span className='hero__glow' />
        <span className='hero__orb hero__orb--one' />
        <span className='hero__orb hero__orb--two' />
        <span className='hero__grid' />
      </div>

      <div className='container hero__layout'>
        <div className='hero__inner'>
          <h1 className='display hero__title' data-hero>
            <span className='hero__title-line-1'>Turn your idea</span>
            <span className='hero__title-line-2'>into a real Flutter app</span>
            <span className='hero__title-line-3'>
              <span>with</span>
              <span className='hero__sparkle' aria-hidden='true'>
                <svg width='28' height='28' viewBox='0 0 24 24' fill='none'>
                  <path d='M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z' fill='url(#hero-accent-grad)' />
                  <path d='M4.5 4C4.5 5.5 3.5 6.5 2 6.5C3.5 6.5 4.5 7.5 4.5 9C4.5 7.5 5.5 6.5 7 6.5C5.5 6.5 4.5 5.5 4.5 4Z' fill='url(#hero-accent-grad)' opacity='0.8' />
                  <defs>
                    <linearGradient id='hero-accent-grad' x1='2' y1='2' x2='22' y2='22' gradientUnits='userSpaceOnUse'>
                      <stop stopColor='var(--accent-2)' />
                      <stop offset='1' stopColor='var(--accent)' />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className='hero__title-keyword'>VibeApp</span>
              <span className='hero__planet' aria-hidden='true'>
                <svg width='44' height='44' viewBox='0 0 48 48' fill='none'>
                  <defs>
                    <radialGradient id='hero-sphere-grad' cx='38%' cy='35%' r='60%'>
                      <stop offset='0%' stopColor='#122822' />
                      <stop offset='50%' stopColor='#081713' />
                      <stop offset='100%' stopColor='#030a08' />
                    </radialGradient>
                    <linearGradient id='hero-ring-grad' x1='0%' y1='0%' x2='100%' y2='100%'>
                      <stop offset='0%' stopColor='var(--accent-2)' />
                      <stop offset='100%' stopColor='var(--accent)' />
                    </linearGradient>
                  </defs>
                  <ellipse cx='24' cy='24' rx='20' ry='7.5' stroke='url(#hero-ring-grad)' strokeWidth='2' opacity='0.35' transform='rotate(-25 24 24)' strokeDasharray='30 40' strokeDashoffset='15' />
                  <circle cx='24' cy='24' r='13' fill='url(#hero-sphere-grad)' stroke='var(--accent)' strokeWidth='0.8' />
                  <path d='M 13 21 Q 24 27 35 22' stroke='var(--accent-2)' strokeWidth='1.2' opacity='0.6' fill='none' />
                  <ellipse cx='24' cy='24' rx='20' ry='7.5' stroke='url(#hero-ring-grad)' strokeWidth='2' fill='none' transform='rotate(-25 24 24)' strokeDasharray='36 34' strokeDashoffset='44' />
                </svg>
              </span>
            </span>
          </h1>
          <p className='lead hero__lead' data-hero>
            Describe your app, preview it live, and export a Flutter APK to your own phone.
          </p>
          <div className='hero__actions' data-hero>
            <Button to={isAuthenticated ? '/build' : '/signup'} variant='accent' arrow>
              Build Your App
            </Button>
            <Button href='#product' variant='ghost'>
              See Live Preview
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
