import { BRAND } from '../../../landing/content'
import './Logo.css'

/* Full logo (symbol + wordmark). The wordmark is dark, so a light-text
   variant is swapped in automatically for the dark theme via CSS. */
export default function Logo({ light = false }) {
  return (
    <span className={`logo${light ? ' logo--light' : ''}`}>
      <img className='logo__img logo__img--dark-text' src='/logo.png' alt={BRAND} />
      <img className='logo__img logo__img--light-text' src='/logo-light.png' alt='' aria-hidden='true' />
    </span>
  )
}
