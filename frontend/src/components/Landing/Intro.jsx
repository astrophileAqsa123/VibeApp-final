import { useRef } from 'react'
import { useReveal } from '../../landing/useReveal'
import './Intro.css'

export default function Intro() {
  const ref = useRef(null)
  useReveal(ref)

  return (
    <section className='intro section' ref={ref}>
      <div className='container intro__grid'>
        <div className='intro__aside'>
          <p className='eyebrow' data-reveal>
            A new development workflow
          </p>
        </div>
        <div className='intro__copy'>
          <h2 className='h2' data-reveal>
            Build software
            <br />
            from prompts, not boilerplate.
          </h2>
          <p className='lead' data-reveal>
            Describe what you want. VibeApp designs the interface, writes the Flutter code, provisions Supabase, and keeps everything in
            sync as your idea evolves. You preview, refine, and ship.
          </p>
        </div>
      </div>
    </section>
  )
}
