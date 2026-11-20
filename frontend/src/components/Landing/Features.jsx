import { useRef } from 'react'
import {
  FiArrowUpRight,
  FiCode,
  FiCpu,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi'

import { useReveal } from '../../landing/useReveal'
import { FEATURES } from '../../landing/content'
import './Features.css'

const FEATURE_ICONS = {
  cpu: FiCpu,
  layers: FiLayers,
  code: FiCode,
  refresh: FiRefreshCw,
}

export default function Features() {
  const ref = useRef(null)
  useReveal(ref)

  return (
    <section className='features section' id='features' ref={ref}>
      <div className='container'>
        <div className='features__head'>
          <p className='eyebrow' data-reveal>
            Features
          </p>
          <h2 className='h2' data-reveal>
            Everything between
            <br />
            the idea and the app.
          </h2>
        </div>

        <ul className='features__grid'>
          {FEATURES.map((feature) => {
            const Icon = FEATURE_ICONS[feature.icon]
            return (
              <li key={feature.title} className='feature' data-reveal>
                <span className='feature__icon' aria-hidden='true'>
                  <Icon />
                </span>
                <h3 className='h3 feature__title'>{feature.title}</h3>
                <p className='body feature__text'>{feature.text}</p>
                <span className='feature__corner' aria-hidden='true'>
                  <FiArrowUpRight />
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
