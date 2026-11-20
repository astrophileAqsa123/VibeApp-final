import { useRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import { useReveal } from '../../landing/useReveal'
import Button from './common/Button'
import './CTA.css'

export default function CTA() {
  const ref = useRef(null)
  const { isAuthenticated } = useAuth()
  useReveal(ref)

  return (
    <section className='cta section' id='cta' ref={ref}>
      <div className='container cta__inner'>
        <h2 className='display' data-reveal>
          Start building
          <br />
          what comes next.
        </h2>
        <p className='lead' data-reveal>
          Free to start. No credit card required.
        </p>
        <div className='cta__actions' data-reveal>
          <Button to={isAuthenticated ? '/build' : '/signup'} variant='accent' arrow>
            Get Started
          </Button>
          <a className='link-arrow' href='#developers'>
            <span>Learn more</span>
            <FiArrowRight aria-hidden='true' />
          </a>
        </div>
      </div>
    </section>
  )
}
