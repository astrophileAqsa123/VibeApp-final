import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi'
import { BRAND, FOOTER_COLUMNS } from '../../landing/content'
import Logo from './common/Logo'
import './Footer.css'

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com', Icon: FiGithub },
  { label: 'Twitter', href: 'https://twitter.com', Icon: FiTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: FiLinkedin },
]

export default function Footer() {
  return (
    <footer className='footer'>
      <div className='container'>
        <div className='footer__top'>
          <div className='footer__brand'>
            <a href='#top' aria-label={`${BRAND}, back to top`}>
              <Logo />
            </a>
            <p className='footer__tag'>From ideas to working software. An AI-powered development workflow.</p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} className='footer__col' aria-label={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className='footer__bottom'>
          <p>
            © {new Date().getFullYear()} {BRAND} Labs. All rights reserved.
          </p>
          <ul className='footer__social'>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} aria-label={label} target='_blank' rel='noopener noreferrer'>
                  <Icon aria-hidden='true' />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
