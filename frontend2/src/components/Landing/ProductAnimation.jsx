import { useLayoutEffect, useRef } from 'react'
import { FiArrowDown } from 'react-icons/fi'

import { gsap, ScrollTrigger } from '../../landing/gsap'
import { MEDIA } from '../../landing/theme'
import { PRODUCT_CAPTIONS } from '../../landing/content'
import {
  applyStaticState,
  buildProductTimeline,
  PRODUCT_SCROLL_LENGTH,
} from '../../landing/productTimeline'

import TodoPhone from './common/TodoPhone'
import Terminal from './common/Terminal'
import './ProductAnimation.css'

export default function ProductAnimation() {
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
          timeline.fromTo(els.stage, { perspective: 1400 }, { perspective: 1050, duration: 1 }, 0)
          timeline.fromTo(els.phone, { rotateY: 0, rotateX: 0, z: 0 }, { rotateY: 0, rotateX: 0, z: 0, duration: 1 }, 0)
          timeline.fromTo(els.terminal, { rotateY: 0, rotateX: 0, z: -30 }, { rotateY: 0, rotateX: 0, z: 50, duration: 1 }, 0)
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
