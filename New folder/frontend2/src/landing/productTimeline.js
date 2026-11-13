import { gsap } from './gsap'
import { EASE } from './theme'

export const PRODUCT_SCROLL_LENGTH = '+=360%'

const LINE_STEP = 0.16
const TASK_GAP_EM = 0.5

function parkedPosition(stage, isMobile) {
  return {
    x: () => stage.clientWidth * (isMobile ? 0.24 : 0.3),
    y: () => stage.clientHeight * (isMobile ? 0.3 : 0.27),
    scale: isMobile ? 0.46 : 0.52,
  }
}

function emToPx(el, em) {
  return parseFloat(getComputedStyle(el).fontSize) * em
}

/**
 * Final composition used when the user has
 * prefers-reduced-motion enabled.
 */
export function applyStaticState(els, { isMobile }) {
  const {
    stage,
    phone,
    terminal,
    hint,
    captions,
    editor,
    toast,
    progressFill,
    progressLabels,
  } = els

  const parked = parkedPosition(stage, isMobile)

  gsap.set(phone, {
    x: parked.x(),
    y: parked.y(),
    scale: parked.scale,
  })

  gsap.set(editor, {
    yPercent: 104,
    y: 0,
  })

  gsap.set(
    [
      hint,
      toast,
      captions[0],
      captions[1],
      progressLabels[0],
    ],
    {
      autoAlpha: 0,
    },
  )

  gsap.set(progressFill, {
    width: '25%',
  })

  gsap.set(terminal, {
    autoAlpha: 1,
  })
}

/**
 * Main scroll-driven product animation.
 */
export function buildProductTimeline(els, { isMobile }) {
  const {
    stage,
    phone,
    terminal,
    hint,
    captions,
    editor,
    placeholder,
    chars,
    toast,
    newTask,
    newTaskCard,
    list,
    progressFill,
    progressLabels,
    lines,
    code,
    codeBody,
  } = els

  /*
   * IMPORTANT:
   *
   * Keep the entire phone visible when the product
   * section first enters the viewport.
   *
   * Previously the phone used a large scale and
   * yPercent offset. That pushed part of the phone
   * outside the viewport and created the large
   * empty black area after the hero.
   */
  gsap.set(phone, {
    scale: isMobile ? 0.82 : 0.88,
    yPercent: 0,
    y: 0,
  })

  /*
   * Terminal starts hidden.
   */
  gsap.set(terminal, {
    autoAlpha: 0,
    y: 48,
    scale: 0.96,
  })

  /*
   * Captions.
   */
  gsap.set(captions, {
    autoAlpha: 0,
    y: 8,
  })

  /*
   * Task editor starts below the phone.
   */
  gsap.set(editor, {
    yPercent: 104,
    y: 0,
  })

  /*
   * Typing characters start invisible.
   */
  gsap.set(chars, {
    opacity: 0,
  })

  /*
   * Toast starts hidden.
   */
  gsap.set(toast, {
    autoAlpha: 0,
    y: 8,
  })

  /*
   * New generated task starts collapsed.
   */
  gsap.set(newTask, {
    height: 0,
    autoAlpha: 0,
    marginBottom: 0,
  })

  /*
   * Terminal code lines start hidden.
   */
  gsap.set(lines, {
    autoAlpha: 0,
    y: 6,
  })

  /*
   * Second progress label starts hidden.
   */
  if (progressLabels[1]) {
    gsap.set(progressLabels[1], {
      autoAlpha: 0,
    })
  }

  /*
   * Work out how much terminal code can fit
   * inside its visible container.
   */
  const lineHeight = lines[0]?.offsetHeight || 22

  const visibleLines = Math.max(
    4,
    Math.floor(codeBody.clientHeight / lineHeight) - 1,
  )

  const codeDuration = lines.length * LINE_STEP

  const scrollStart =
    Math.min(lines.length, visibleLines) * LINE_STEP

  const scrollDuration = Math.max(
    0.1,
    codeDuration - scrollStart,
  )

  /*
   * Final parked phone position beside terminal.
   */
  const parked = parkedPosition(stage, isMobile)

  /*
   * Main GSAP timeline.
   */
  const tl = gsap.timeline({
    defaults: {
      ease: EASE.strong,
    },
  })

  /*
   * -------------------------------------------------
   * STEP 1
   * Reveal complete phone
   * -------------------------------------------------
   */
  tl.addLabel('reveal')

    .to(
      hint,
      {
        autoAlpha: 0,
        duration: 0.3,
      },
      'reveal',
    )

    .to(
      phone,
      {
        scale: isMobile ? 0.88 : 0.94,
        yPercent: 0,
        y: 0,
        duration: 1.15,
      },
      'reveal',
    )

    .to(
      captions[0],
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
      },
      'reveal+=0.9',
    )

    /*
     * -------------------------------------------------
     * STEP 2
     * Open task editor
     * -------------------------------------------------
     */

    .addLabel('editor', '+=0.2')

    .to(
      list,
      {
        scale: 0.96,
        opacity: 0.35,
        duration: 0.7,
      },
      'editor',
    )

    .to(
      editor,
      {
        yPercent: 0,
        duration: 0.8,
      },
      'editor',
    )

    /*
     * -------------------------------------------------
     * STEP 3
     * Type task
     * -------------------------------------------------
     */

    .addLabel('type', '+=0.2')

    .to(
      placeholder,
      {
        autoAlpha: 0,
        duration: 0.2,
      },
      'type',
    )

    .to(
      chars,
      {
        opacity: 1,
        duration: 0.05,
        stagger: 0.09,
        ease: 'none',
      },
      'type',
    )

    /*
     * -------------------------------------------------
     * STEP 4
     * Save task
     * -------------------------------------------------
     */

    .addLabel('save', '+=0.3')

    .to(
      toast,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.4,
      },
      'save',
    )

    .to(
      captions[0],
      {
        autoAlpha: 0,
        y: -8,
        duration: 0.4,
      },
      'save+=0.3',
    )

    .to(
      captions[1],
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
      },
      'save+=0.5',
    )

    /*
     * Close editor.
     */
    .to(
      editor,
      {
        yPercent: 104,
        duration: 0.8,
      },
      'save+=0.7',
    )

    /*
     * Restore task list.
     */
    .to(
      list,
      {
        scale: 1,
        opacity: 1,
        duration: 0.7,
      },
      'save+=0.7',
    )

    /*
     * Add newly created task.
     */
    .to(
      newTask,
      {
        height: 'auto',
        autoAlpha: 1,
        marginBottom: emToPx(
          newTask,
          TASK_GAP_EM,
        ),
        duration: 0.6,
      },
      'save+=1.0',
    )

    /*
     * Highlight new task.
     */
    .fromTo(
      newTaskCard,
      {
        backgroundColor:
          'rgba(124, 255, 107, 0.16)',
      },
      {
        backgroundColor: '#102729',
        duration: 1.4,
        ease: 'power2.out',
      },
      'save+=1.1',
    )

    /*
     * Update progress.
     */
    .to(
      progressFill,
      {
        width: '25%',
        duration: 0.6,
      },
      'save+=1.1',
    )

    .to(
      progressLabels[0],
      {
        autoAlpha: 0,
        duration: 0.3,
      },
      'save+=1.1',
    )

    .to(
      progressLabels[1],
      {
        autoAlpha: 1,
        duration: 0.3,
      },
      'save+=1.3',
    )

    /*
     * Hide saved toast.
     */
    .to(
      toast,
      {
        autoAlpha: 0,
        y: -6,
        duration: 0.4,
      },
      'save+=1.8',
    )

    /*
     * -------------------------------------------------
     * STEP 5
     * Move phone to side
     * -------------------------------------------------
     */

    .addLabel('move', '+=0.3')

    .to(
      phone,
      {
        ...parked,
        duration: 1.6,
        ease: EASE.expo,
      },
      'move',
    )

    .to(
      captions[1],
      {
        autoAlpha: 0,
        y: -8,
        duration: 0.4,
      },
      'move+=0.3',
    )

    .to(
      captions[2],
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
      },
      'move+=0.6',
    )

    /*
     * -------------------------------------------------
     * STEP 6
     * Reveal terminal
     * -------------------------------------------------
     */

    .to(
      terminal,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1.3,
        ease: EASE.expo,
      },
      'move+=0.5',
    )

    /*
     * -------------------------------------------------
     * STEP 7
     * Generate code
     * -------------------------------------------------
     */

    .addLabel('code', '-=0.3')

    .to(
      lines,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.25,
        stagger: LINE_STEP,
        ease: 'power1.out',
      },
      'code',
    )

    /*
     * Scroll terminal code only after visible
     * lines exceed terminal height.
     */
    .to(
      code,
      {
        y: () =>
          -Math.max(
            0,
            code.scrollHeight -
              codeBody.clientHeight,
          ),

        duration: scrollDuration,
        ease: 'none',
      },
      `code+=${scrollStart}`,
    )

    /*
     * Small hold at end before ScrollTrigger
     * releases the pinned section.
     */
    .to(
      {},
      {
        duration: 1,
      },
    )

  return tl
}