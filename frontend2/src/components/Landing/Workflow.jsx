import { useLayoutEffect, useRef } from 'react'

import { gsap, ScrollTrigger } from '../../landing/gsap'
import { MEDIA } from '../../landing/theme'
import { useReveal } from '../../landing/useReveal'
import { WORKFLOW_STEPS } from '../../landing/content'

import './Workflow.css'

export default function Workflow() {
  const ref = useRef(null)
  useReveal(ref)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(ref)

    mm.add(MEDIA.motionOk, () => {
      const steps = gsap.utils.toArray('.step', ref.current)

      steps.forEach((step) =>
        ScrollTrigger.create({
          trigger: step,
          start: 'top 55%',
          end: 'bottom 45%',
          toggleClass: { targets: step, className: 'is-active' },
        }),
      )

      gsap.fromTo(
        '.workflow__line-fill',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.workflow__steps',
            start: 'top 55%',
            end: 'bottom 55%',
            scrub: true,
          },
        },
      )
    })

    return () => mm.revert()
  }, [])

  return (
    <section className='workflow section' id='workflow' ref={ref}>
      <div className='container workflow__grid'>
        <div className='workflow__head'>
          <p className='eyebrow' data-reveal>
            Workflow
          </p>
          <h2 className='h2' data-reveal>
            Four steps.
            <br />
            One continuous flow.
          </h2>
          <p className='lead' data-reveal>
            No handoffs between tools. Each step feeds the next, and every change flows back to the source.
          </p>
        </div>

        <ol className='workflow__steps'>
          <span className='workflow__line' aria-hidden='true'>
            <span className='workflow__line-fill' />
          </span>
          {WORKFLOW_STEPS.map((step) => (
            <li key={step.number} className='step' data-reveal>
              <span className='step__num'>{step.number}</span>
              <h3 className='step__title'>{step.title}</h3>
              <p className='body step__text'>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
