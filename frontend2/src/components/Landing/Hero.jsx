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
          <h1
            className='display hero__title'
            data-hero
            style={{
              fontSize: 'clamp(1.25rem, 4.6vw, 3.25rem)',
              lineHeight: 1.2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span className='hero__title-line-1'>Describe your app,</span>
            <span
              className='hero__title-line-2'
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', whiteSpace: 'nowrap' }}
            >
              <span className='hero__sparkle' aria-hidden='true'>
                <svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
                  <path d='M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z' fill='url(#hero-accent-grad)' />
                  <defs>
                    <linearGradient id='hero-accent-grad' x1='2' y1='2' x2='22' y2='22' gradientUnits='userSpaceOnUse'>
                      <stop stopColor='var(--accent-2)' />
                      <stop offset='1' stopColor='var(--accent)' />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className='hero__title-keyword' style={{ whiteSpace: 'nowrap' }}>
                Preview and Ship on phone
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
