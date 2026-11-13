import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiCode,
  FiCpu,
  FiGithub,
  FiLayers,
  FiLinkedin,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiTag,
  FiTwitter,
  FiX,
} from 'react-icons/fi'

import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import { gsap, ScrollTrigger } from '../landing/gsap'
import { BREAKPOINTS, EASE, MEDIA } from '../landing/theme'
import {
  BRAND,
  DEV_POINTS,
  FEATURES,
  FLUTTER_CODE,
  FOOTER_COLUMNS,
  NAV_LINKS,
  NEW_TASK_TEXT,
  PRODUCT_CAPTIONS,
  SHOWCASE_CODE,
  SHOWCASE_LOG,
  TERMINAL_OUTRO,
  TERMINAL_PRELUDE,
  TODO_TASKS,
  WORKFLOW_STEPS,
} from '../landing/content'
import {
  applyStaticState,
  buildProductTimeline,
  PRODUCT_SCROLL_LENGTH,
} from '../landing/productTimeline'
import { tokenize } from '../landing/highlight'
import { useReveal } from '../landing/useReveal'

import './Landing.css'

/* ==========================================================================
   UI COMPONENTS
   ========================================================================== */

function Logo({ light = false }) {
  return (
    <span className={`logo${light ? ' logo--light' : ''}`}>
      <span className='logo__mark' aria-hidden='true'>V</span>
      <span className='logo__name'>{BRAND}</span>
    </span>
  )
}

function Button({
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

/* ==========================================================================
   CODE & TERMINAL HIGHLIGHTING
   ========================================================================== */

function CodeLine({ line }) {
  return (
    <div className='terminal__line'>
      {line === ''
        ? '\u00A0'
        : tokenize(line).map((token, i) =>
            token.type ? (
              <span key={i} className={`tok-${token.type}`}>
                {token.text}
              </span>
            ) : (
              token.text
            ),
          )}
    </div>
  )
}

function StatusLine({ entry }) {
  return <div className={`terminal__line terminal__line--${entry.type}`}>{entry.text || '\u00A0'}</div>
}

function Terminal() {
  return (
    <div className='terminal' role='img' aria-label='A terminal generating a Flutter application from the saved task.'>
      <div className='terminal__bar'>
        <span className='terminal__dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
        <span className='terminal__title'>vibe · generate</span>
        <span className='terminal__badge'>lib/main.dart</span>
      </div>

      <div className='terminal__body'>
        <div className='terminal__code'>
          {TERMINAL_PRELUDE.map((entry, i) => (
            <StatusLine key={`pre-${i}`} entry={entry} />
          ))}
          {FLUTTER_CODE.map((line, i) => (
            <CodeLine key={`code-${i}`} line={line} />
          ))}
          {TERMINAL_OUTRO.map((entry, i) => (
            <StatusLine key={`out-${i}`} entry={entry} />
          ))}
          <div className='terminal__line terminal__line--prompt'>
            <span className='terminal__cursor' />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   PHONE PREVIEW COMPONENT
   ========================================================================== */

function TaskItem({ task }) {
  return (
    <li className={`todo-slot${task.isNew ? ' todo-slot--new' : ''}`}>
      <div className={`todo-task${task.done ? ' todo-task--done' : ''}`}>
        <span className='todo-task__check' aria-hidden='true'>
          {task.done && <FiCheck />}
        </span>
        <span className='todo-task__label'>{task.label}</span>
      </div>
    </li>
  )
}

function TaskGroup({ title, tasks }) {
  return (
    <div className='todo__group'>
      <p className='todo__group-title'>{title}</p>
      <ul>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  )
}

function TodoPhone() {
  return (
    <div
      className='phone'
      role='img'
      aria-label={`A to-do app on a phone. A new task, ${NEW_TASK_TEXT}, is typed and saved to the list.`}
    >
      <div className='phone__screen'>
        <div className='phone__island' />
        <div className='phone__status'>
          <span>9:41</span>
          <span className='phone__status-right'>
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className='todo-list'>
          <div className='todo__header'>
            <p className='todo__date'>Tuesday</p>
            <p className='todo__title'>My Tasks</p>
            <div className='todo__progress'>
              <span className='todo__progress-bar'>
                <span className='todo__progress-fill' />
              </span>
              <span className='todo__progress-label'>
                <span>1 of 3 done</span>
                <span>1 of 4 done</span>
              </span>
            </div>
          </div>

          <TaskGroup title='Today' tasks={TODO_TASKS.today} />
          <TaskGroup title='Upcoming' tasks={TODO_TASKS.upcoming} />

          <span className='todo__fab' aria-hidden='true'>
            <FiPlus />
          </span>
        </div>

        <div className='todo-editor'>
          <div className='todo-editor__bar'>
            <span className='todo-editor__back'>
              <FiChevronLeft />
            </span>
            <span className='todo-editor__heading'>New task</span>
            <span className='todo-editor__save'>Save</span>
          </div>

          <p className='todo-editor__label'>Task</p>
          <p className='todo-editor__input'>
            <span className='todo-editor__placeholder'>What needs to be done?</span>
            <span className='todo-editor__text'>
              {NEW_TASK_TEXT.split('').map((char, i) => (
                <span className='todo-editor__char' key={i}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
              <span className='todo-editor__cursor' />
            </span>
          </p>

          <div className='todo-editor__meta'>
            <span className='todo-editor__chip'>
              <FiCalendar /> Today
            </span>
            <span className='todo-editor__chip'>
              <FiTag /> Mobile
            </span>
          </div>
        </div>

        <div className='todo-toast-wrap'>
          <span className='todo-toast'>
            Saved <FiCheck />
          </span>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   NAVBAR SECTION
   ========================================================================== */

function Navbar() {
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
            <Button to='/dashboard' variant='primary' className='btn--sm nav__cta'>
              Dashboard
            </Button>
          ) : (
            <>
              <Button to='/login' variant='ghost' className='btn--sm nav__cta'>
                Sign In
              </Button>
              <Button to='/signup' variant='primary' className='btn--sm nav__cta'>
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

/* ==========================================================================
   HERO SECTION
   ========================================================================== */

function Hero() {
  const ref = useRef(null)
  const { isAuthenticated } = useAuth()

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(ref)

    mm.add(MEDIA.motionOk, () => {
      gsap.from('[data-hero]', {
        y: 28,
        autoAlpha: 0,
        duration: 1.1,
        ease: EASE.out,
        stagger: 0.1,
        delay: 0.15,
      })

      gsap.fromTo(
        '.hero__phone-wrap',
        {
          x: 90,
          y: 70,
          rotateY: 24,
          rotateX: 10,
          rotateZ: -4,
          scale: 0.86,
          autoAlpha: 0,
        },
        {
          x: 0,
          y: 0,
          rotateY: -10,
          rotateX: 3,
          rotateZ: -2,
          scale: 1,
          autoAlpha: 1,
          duration: 1.45,
          ease: EASE.out,
          delay: 0.2,
        },
      )

      gsap.to('.hero__phone-float', {
        y: -16,
        rotateZ: 1.25,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.from('.hero__scene-card', {
        y: 60,
        z: -160,
        rotateX: 16,
        autoAlpha: 0,
        duration: 1.3,
        stagger: 0.12,
        ease: EASE.out,
        delay: 0.4,
      })

      gsap.to('.hero__phone-wrap', {
        yPercent: 22,
        rotateY: 8,
        rotateX: -4,
        rotateZ: 2,
        scale: 0.95,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })

      gsap.to('.hero__scene', {
        yPercent: 20,
        rotateX: -6,
        rotateY: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })

      gsap.to('.hero__orb--one', {
        yPercent: -45,
        xPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.2 },
      })

      gsap.to('.hero__orb--two', {
        yPercent: 55,
        xPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.4 },
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <section className='hero' id='top' ref={ref}>
      <div className='hero__ambient' aria-hidden='true'>
        <span className='hero__orb hero__orb--one' />
        <span className='hero__orb hero__orb--two' />
        <span className='hero__grid' />
      </div>

      <div className='container hero__layout hero__layout--phone'>
        <div className='hero__inner'>
          <p className='eyebrow' data-hero>
            AI-powered development platform
          </p>
          <h1 className='display hero__title' data-hero>
            From ideas
            <br />
            to working software.
          </h1>
          <p className='lead' data-hero>
            Turn your ideas into real applications with an AI-powered development workflow.
          </p>
          <div className='hero__actions' data-hero>
            <Button to={isAuthenticated ? '/build' : '/signup'} variant='accent' arrow>
              Start Building
            </Button>
            <a className='link-arrow' href='#product'>
              <span>Explore Platform</span>
              <FiArrowRight aria-hidden='true' />
            </a>
          </div>
        </div>


        <div className='hero__visual'>
          <div className='hero__phone-glow' aria-hidden='true' />

          <div className='hero__phone-wrap'>
            <div className='hero__phone-float'>
              <TodoPhone />
            </div>
          </div>

          <div className='hero__visual-orbit hero__visual-orbit--one' aria-hidden='true' />
          <div className='hero__visual-orbit hero__visual-orbit--two' aria-hidden='true' />
        </div>

        <div className='hero__scene' aria-hidden='true'>
          <div className='hero__scene-card hero__scene-card--code'>
            <span className='scene-kicker'>AI build</span>
            <strong>Generating Flutter UI</strong>
            <div className='scene-code'><i /><i /><i /><i /></div>
          </div>
          <div className='hero__scene-card hero__scene-card--data'>
            <span className='scene-kicker'>Supabase</span>
            <strong>Schema synced</strong>
            <span className='scene-status'>Live</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   PRODUCT ANIMATION SECTION (PINNED INTERACTION TIMELINE)
   ========================================================================== */

function ProductAnimation() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const q = gsap.utils.selector(stage)

    const collect = () => ({
      stage,
      phone: q('.product__phone')[0],
      terminal: q('.product__terminal')[0],
      hint: q('.product__hint')[0],
      captions: q('.product__caption'),
      editor: q('.todo-editor')[0],
      placeholder: q('.todo-editor__placeholder')[0],
      chars: q('.todo-editor__char'),
      toast: q('.todo-toast')[0],
      newTask: q('.todo-slot--new')[0],
      newTaskCard: q('.todo-slot--new .todo-task')[0],
      list: q('.todo-list')[0],
      progressFill: q('.todo__progress-fill')[0],
      progressLabels: q('.todo__progress-label span'),
      lines: q('.terminal__line'),
      code: q('.terminal__code')[0],
      codeBody: q('.terminal__body')[0],
    })

    const mm = gsap.matchMedia()

    mm.add(
      {
        desktop: `${MEDIA.desktop} and ${MEDIA.motionOk}`,
        mobile: `${MEDIA.mobile} and ${MEDIA.motionOk}`,
        reduced: MEDIA.reducedMotion,
      },
      (context) => {
        const { mobile, reduced } = context.conditions
        const els = collect()

        if (reduced) {
          applyStaticState(els, { isMobile: window.matchMedia(MEDIA.mobile).matches })
          return
        }

        const timeline = buildProductTimeline(els, { isMobile: mobile })

        if (!mobile) {
          timeline.fromTo(els.stage, { perspective: 1400 }, { perspective: 950, duration: 1 }, 0)
          timeline.fromTo(els.phone, { rotateY: -18, rotateX: 8, z: 80 }, { rotateY: 14, rotateX: -5, z: 20, duration: 1 }, 0)
          timeline.fromTo(els.terminal, { rotateY: 14, rotateX: -6, z: -40 }, { rotateY: -8, rotateX: 3, z: 70, duration: 1 }, 0)
        }

        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: PRODUCT_SCROLL_LENGTH,
          pin: true,
          scrub: 0.8,
          animation: timeline,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        })
      },
    )

    return () => mm.revert()
  }, [])

  return (
    <section className='product' id='product' ref={sectionRef} aria-label='Product demonstration'>
      <div className='product__stage' ref={stageRef}>
        <div className='product__phone'>
          <div className='product__float'>
            <TodoPhone />
          </div>
        </div>

        <div className='product__terminal'>
          <Terminal />
        </div>

        <div className='product__captions' aria-hidden='true'>
          {PRODUCT_CAPTIONS.map((caption) => (
            <span key={caption} className='product__caption'>
              {caption}
            </span>
          ))}
        </div>

        <p className='product__hint' aria-hidden='true'>
          Scroll to explore
          <FiArrowDown />
        </p>
      </div>
    </section>
  )
}

/* ==========================================================================
   INTRO SECTION
   ========================================================================== */

function Intro() {
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

/* ==========================================================================
   FEATURES SECTION
   ========================================================================== */

const FEATURE_ICONS = {
  cpu: FiCpu,
  layers: FiLayers,
  code: FiCode,
  refresh: FiRefreshCw,
}

function Features() {
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

/* ==========================================================================
   WORKFLOW SECTION
   ========================================================================== */

function Workflow() {
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

/* ==========================================================================
   SHOWCASE SECTION
   ========================================================================== */

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

function Showcase() {
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

/* ==========================================================================
   DARK STATEMENT SECTION (FOR DEVELOPERS)
   ========================================================================== */

function DarkStatement() {
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

/* ==========================================================================
   CALL TO ACTION SECTION
   ========================================================================== */

function CTA() {
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

/* ==========================================================================
   FOOTER SECTION
   ========================================================================== */

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com', Icon: FiGithub },
  { label: 'Twitter', href: 'https://twitter.com', Icon: FiTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: FiLinkedin },
]

function Footer() {
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

/* ==========================================================================
   MAIN EXPORT: LANDING PAGE
   ========================================================================== */

export default function Landing() {
  useEffect(() => {
    // Web fonts change layout heights; refresh pinned sections once they settle.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }
  }, [])

  return (
    <div className='landing-root'>
      <a href='#main' className='skip-link'>
        Skip to content
      </a>
      <Navbar />
      <main id='main'>
        <Hero />
        <ProductAnimation />
        <Intro />
        <Features />
        <Workflow />
        <Showcase />
        <DarkStatement />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
