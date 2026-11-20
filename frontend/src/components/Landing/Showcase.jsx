import { useLayoutEffect, useRef } from 'react'

import { gsap } from '../../landing/gsap'
import { EASE, MEDIA } from '../../landing/theme'
import { useReveal } from '../../landing/useReveal'
import { SHOWCASE_CODE, SHOWCASE_LOG, TODO_TASKS } from '../../landing/content'
import { CodeLine } from './common/Terminal'

import './Showcase.css'

function MiniPreview() {
  return (
    <div className='mini'>
      <p className='mini__title'>My Tasks</p>
      {TODO_TASKS.today.map((task) => (
        <div key={task.id} className={`mini__task${task.done ? ' is-done' : ''}`}>
          <i className='mini__check' />
          <span>{task.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Showcase() {
  const ref = useRef(null)
  useReveal(ref)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(ref)

    mm.add(MEDIA.motionOk, () => {
      gsap.from('.app', {
        y: 80,
        autoAlpha: 0,
        duration: 1.3,
        ease: EASE.out,
        scrollTrigger: { trigger: '.app', start: 'top 85%', once: true },
      })

      gsap.from('.app__panel', {
        y: 24,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: EASE.out,
        scrollTrigger: { trigger: '.app', start: 'top 70%', once: true },
      })

      gsap.from('.app__log li', {
        x: -10,
        autoAlpha: 0,
        stagger: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: '.app', start: 'top 60%', end: 'center 45%', scrub: true },
      })

      gsap.fromTo(
        '.app__progress-fill',
        { scaleX: 0.1 },
        {
          scaleX: 0.75,
          ease: 'none',
          scrollTrigger: { trigger: '.app', start: 'top 60%', end: 'bottom 60%', scrub: true },
        },
      )
    })

    return () => mm.revert()
  }, [])

  return (
    <section className='showcase section section--dark' ref={ref}>
      <div className='container'>
        <div className='showcase__head'>
          <p className='eyebrow' data-reveal>
            The platform
          </p>
          <h2 className='h2' data-reveal>
            One workspace.
            <br />
            Idea, interface, implementation.
          </h2>
          <p className='lead' data-reveal>
            Spec, design, and code live side by side. Change one and the others follow.
          </p>
        </div>

        <div className='app' aria-hidden='true'>
          <div className='app__bar'>
            <span className='app__dots'>
              <i />
              <i />
              <i />
            </span>
            <div className='app__tabs'>
              <span>Spec</span>
              <span className='is-active'>Design</span>
              <span>Code</span>
            </div>
            <span className='app__status'>
              <i />
              Generating
            </span>
          </div>

          <div className='app__body'>
            <aside className='app__panel app__side'>
              <p className='app__panel-title'>Projects</p>
              <ul>
                <li className='is-active'>My Tasks</li>
                <li>Onboarding</li>
                <li>Payments</li>
                <li>Settings</li>
              </ul>
              <p className='app__panel-title'>Screens</p>
              <ul>
                <li className='is-active'>TodoScreen</li>
                <li>TaskEditor</li>
                <li>Profile</li>
              </ul>
            </aside>

            <div className='app__main'>
              <div className='app__panel app__canvas'>
                <p className='app__panel-title'>Design · TodoScreen</p>
                <div className='app__preview'>
                  <MiniPreview />
                </div>
              </div>
              <div className='app__panel app__code'>
                <p className='app__panel-title'>lib/screens/todo_screen.dart</p>
                <pre className='app__pre'>
                  {SHOWCASE_CODE.map((line, i) => (
                    <CodeLine key={i} line={line} />
                  ))}
                </pre>
              </div>
            </div>

            <aside className='app__panel app__activity'>
              <p className='app__panel-title'>Activity</p>
              <ul className='app__log'>
                {SHOWCASE_LOG.map((entry) => (
                  <li key={entry.text} className={entry.pending ? 'is-pending' : ''}>
                    {entry.text}
                  </li>
                ))}
              </ul>
              <div className='app__progress'>
                <span className='app__progress-fill' />
              </div>
              <p className='app__progress-label'>Build · 3 of 4 screens</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
