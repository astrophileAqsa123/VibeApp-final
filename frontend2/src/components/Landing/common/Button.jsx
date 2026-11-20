import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import './Button.css'

export default function Button({
  to,
  href,
  variant = 'primary',
  arrow = false,
  className = '',
  children,
  onClick,
  ...rest
}) {
  const classes = `btn btn--${variant}${className ? ` ${className}` : ''}`
  const content = (
    <>
      <span>{children}</span>
      {arrow && <FiArrowRight className='btn__arrow' aria-hidden='true' />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button type='button' className={classes} onClick={onClick} {...rest}>
      {content}
    </button>
  )
}
