import { useEffect, useRef, useState } from 'react'
import { FiMenu, FiX } from 'react-icons/fi'

import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ThemeToggle'
import { ScrollTrigger } from '../../landing/gsap'
import { BREAKPOINTS } from '../../landing/theme'
import { BRAND, NAV_LINKS } from '../../landing/content'

import Button from './common/Button'
import Logo from './common/Logo'
import './Navbar.css'

export default function Navbar() {
  const navRef = useRef(null)
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 40,
      end: 'max',
      toggleClass: { targets: navRef.current, className: 'is-scrolled' },
    })
    return () => trigger.kill()
  }, [])

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)
    const onKey = (e) => e.key === 'Escape' && close()
    const onResize = () => window.innerWidth >= BREAKPOINTS.mobile && close()

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header ref={navRef} className={`nav${open ? ' is-open' : ''}`}>
      <div className='container nav__inner'>
        <a href='#top' className='nav__brand' aria-label={`${BRAND}, back to top`}>
          <Logo />
        </a>

        <nav className='nav__links' aria-label='Primary'>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className='nav__link'>
              {link.label}
            </a>
          ))}
        </nav>

        <div className='nav__actions'>
          <ThemeToggle />
          {isAuthenticated ? (
            <Button to='/dashboard' variant='accent' className='btn--sm nav__cta'>
              Dashboard
            </Button>
          ) : (
            <>
              <Button to='/login' variant='ghost' className='btn--sm nav__cta'>
                Sign In
              </Button>
              <Button to='/signup' variant='accent' className='btn--sm nav__cta'>
                Get Started
              </Button>
            </>
          )}

          <button
            type='button'
            className='nav__toggle'
            aria-expanded={open}
            aria-controls='mobile-menu'
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <FiX aria-hidden='true' /> : <FiMenu aria-hidden='true' />}
            <span className='sr-only'>{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <nav id='mobile-menu' className='nav__mobile' aria-label='Mobile' aria-hidden={!open}>
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className='nav__mobile-link'
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            {link.label}
          </a>
        ))}
        {isAuthenticated ? (
          <Button
            to='/dashboard'
            variant='accent'
            arrow
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            Go to Dashboard
          </Button>
        ) : (
          <>
            <Button
              to='/login'
              variant='ghost'
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              Sign In
            </Button>
            <Button
              to='/signup'
              variant='accent'
              arrow
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              Get Started
            </Button>
          </>
        )}
      </nav>
    </header>
  )
}
