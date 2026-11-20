import { useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useReveal } from '../../landing/useReveal'
import { DEV_POINTS } from '../../landing/content'
import Button from './common/Button'
import './Developers.css'

export default function Developers() {
  const ref = useRef(null)
  const { isAuthenticated } = useAuth()
  useReveal(ref)

  return (
    <section className='dev section section--dark' id='developers' ref={ref}>
      <div className='container dev__grid'>
        <div className='dev__copy'>
          <p className='eyebrow' data-reveal>
            For developers
          </p>
          <h2 className='h2' data-reveal>
            Real code.
            <br />
            <span className='dev__accent'>Yours to keep.</span>
          </h2>
          <p className='lead' data-reveal>
            VibeApp writes readable Flutter and Dart you can open in any editor. No runtime, no black box. Export ZIP,
            build APK, connect Supabase, and keep building.
          </p>
          <div className='dev__actions' data-reveal>
            <Button to={isAuthenticated ? '/build' : '/signup'} variant='primary' arrow>
              Start building
            </Button>
            <code className='dev__cmd'>
              <span>$</span> vibe export <b>--zip</b>
            </code>
          </div>
        </div>

        <ul className='dev__points'>
          {DEV_POINTS.map((point) => (
            <li key={point.number} data-reveal>
              <span className='dev__num'>{point.number}</span>
              <div>
                <h3 className='dev__point-title'>{point.title}</h3>
                <p className='body'>{point.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
