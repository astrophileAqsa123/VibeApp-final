import { tokenize } from '../../../landing/highlight'
import { FLUTTER_CODE, TERMINAL_OUTRO, TERMINAL_PRELUDE } from '../../../landing/content'
import './Terminal.css'

export function CodeLine({ line }) {
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

export function StatusLine({ entry }) {
  return <div className={`terminal__line terminal__line--${entry.type}`}>{entry.text || '\u00A0'}</div>
}

export default function Terminal() {
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
