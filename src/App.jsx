import { useCallback, useEffect, useState } from 'react'
import './App.css'

const OPERATORS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? null : a / b),
}

const KEY_MAP = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  ',': '.',
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  '%': '%',
  Enter: '=',
  '=': '=',
  Escape: 'AC',
  Backspace: '⌫',
  Delete: 'AC',
}

const MAX_HISTORY = 20

function formatDisplay(value) {
  if (value === 'Error' || value === null || value === undefined) return 'Error'
  const str = String(value)
  if (str.includes('e') || str.includes('E')) return str
  const [intPart, decPart] = str.split('.')
  const formattedInt = Number(intPart).toLocaleString('en-US')
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt
}

function trimResult(num) {
  if (!Number.isFinite(num)) return null
  const rounded = Math.round(num * 1e12) / 1e12
  return String(rounded)
}

export default function App() {
  const [display, setDisplay] = useState('0')
  const [previous, setPrevious] = useState(null)
  const [operator, setOperator] = useState(null)
  const [overwrite, setOverwrite] = useState(true)
  const [expression, setExpression] = useState('')
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  const profile = {
    name: 'Guest User',
    handle: '@guest',
    initials: 'GU',
  }

  const pushHistory = useCallback((expr, result) => {
    setHistory((current) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, expr, result },
      ...current,
    ].slice(0, MAX_HISTORY))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const recallHistory = useCallback((entry) => {
    setDisplay(entry.result)
    setExpression(entry.expr)
    setPrevious(null)
    setOperator(null)
    setOverwrite(true)
  }, [])

  const clearAll = useCallback(() => {
    setDisplay('0')
    setPrevious(null)
    setOperator(null)
    setOverwrite(true)
    setExpression('')
  }, [])

  const deleteLast = useCallback(() => {
    if (overwrite) return
    setDisplay((current) => {
      if (current.length <= 1 || (current.length === 2 && current.startsWith('-'))) {
        setOverwrite(true)
        return '0'
      }
      return current.slice(0, -1)
    })
  }, [overwrite])

  const inputDigit = useCallback(
    (digit) => {
      setDisplay((current) => {
        if (overwrite) {
          setOverwrite(false)
          return digit
        }
        if (current === '0') return digit
        if (current.replace('-', '').replace('.', '').length >= 12) return current
        return current + digit
      })
    },
    [overwrite],
  )

  const inputDecimal = useCallback(() => {
    setDisplay((current) => {
      if (overwrite) {
        setOverwrite(false)
        return '0.'
      }
      if (current.includes('.')) return current
      return `${current}.`
    })
  }, [overwrite])

  const toggleSign = useCallback(() => {
    setDisplay((current) => {
      if (current === '0' || current === 'Error') return current
      return current.startsWith('-') ? current.slice(1) : `-${current}`
    })
    setOverwrite(false)
  }, [])

  const applyPercent = useCallback(() => {
    setDisplay((current) => {
      if (current === 'Error') return current
      const value = parseFloat(current)
      if (Number.isNaN(value)) return current
      return trimResult(value / 100) ?? 'Error'
    })
    setOverwrite(true)
  }, [])

  const applyUnary = useCallback((fnKey) => {
    if (display === 'Error') return

    const value = parseFloat(display)
    if (Number.isNaN(value)) return

    let result = null
    let expr = ''

    switch (fnKey) {
      case '√':
        if (value < 0) {
          setDisplay('Error')
          setExpression('')
          setPrevious(null)
          setOperator(null)
          setOverwrite(true)
          return
        }
        result = Math.sqrt(value)
        expr = `√(${formatDisplay(display)})`
        break
      case '∛':
        result = Math.cbrt(value)
        expr = `∛(${formatDisplay(display)})`
        break
      case 'x²':
        result = value ** 2
        expr = `(${formatDisplay(display)})²`
        break
      case 'x³':
        result = value ** 3
        expr = `(${formatDisplay(display)})³`
        break
      default:
        return
    }

    const trimmed = trimResult(result)
    if (trimmed === null) {
      setDisplay('Error')
      setExpression('')
    } else {
      setDisplay(trimmed)
      setExpression(`${expr} =`)
      pushHistory(`${expr} =`, trimmed)
    }

    setPrevious(null)
    setOperator(null)
    setOverwrite(true)
  }, [display, pushHistory])

  const compute = useCallback((a, op, b) => {
    const result = OPERATORS[op](a, b)
    if (result === null) return null
    return trimResult(result)
  }, [])

  const chooseOperator = useCallback(
    (nextOp) => {
      if (display === 'Error') return

      const current = parseFloat(display)

      if (previous !== null && operator && !overwrite) {
        const result = compute(previous, operator, current)
        if (result === null) {
          setDisplay('Error')
          setPrevious(null)
          setOperator(null)
          setOverwrite(true)
          setExpression('')
          return
        }
        setDisplay(result)
        setPrevious(parseFloat(result))
        setExpression(`${formatDisplay(result)} ${nextOp}`)
      } else {
        setPrevious(current)
        setExpression(`${formatDisplay(display)} ${nextOp}`)
      }

      setOperator(nextOp)
      setOverwrite(true)
    },
    [compute, display, operator, overwrite, previous],
  )

  const equals = useCallback(() => {
    if (operator === null || previous === null || display === 'Error') return

    const current = parseFloat(display)
    const result = compute(previous, operator, current)
    const expr = `${formatDisplay(previous)} ${operator} ${formatDisplay(display)} =`

    if (result === null) {
      setDisplay('Error')
      setExpression('')
    } else {
      setDisplay(result)
      setExpression(expr)
      pushHistory(expr, result)
    }

    setPrevious(null)
    setOperator(null)
    setOverwrite(true)
  }, [compute, display, operator, previous, pushHistory])

  const handlePress = useCallback(
    (key) => {
      if (key >= '0' && key <= '9') {
        inputDigit(key)
        return
      }

      switch (key) {
        case '.':
          inputDecimal()
          break
        case 'AC':
          clearAll()
          break
        case '⌫':
          deleteLast()
          break
        case '±':
          toggleSign()
          break
        case '%':
          applyPercent()
          break
        case '√':
        case '∛':
        case 'x²':
        case 'x³':
          applyUnary(key)
          break
        case '+':
        case '−':
        case '×':
        case '÷':
          chooseOperator(key)
          break
        case '=':
          equals()
          break
        default:
          break
      }
    },
    [
      applyPercent,
      applyUnary,
      chooseOperator,
      clearAll,
      deleteLast,
      equals,
      inputDecimal,
      inputDigit,
      toggleSign,
    ],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      const mapped = KEY_MAP[event.key]
      if (!mapped) return
      event.preventDefault()
      handlePress(mapped)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePress])

  const buttons = [
    { label: '√', type: 'func', aria: 'Square root' },
    { label: '∛', type: 'func', aria: 'Cube root' },
    { label: 'x²', type: 'func', aria: 'Square' },
    { label: 'x³', type: 'func', aria: 'Cube' },
    { label: 'AC', type: 'func', aria: 'All clear' },
    { label: '±', type: 'func', aria: 'Toggle sign' },
    { label: '%', type: 'func', aria: 'Percent' },
    { label: '÷', type: 'op', aria: 'Divide' },
    { label: '7', type: 'num' },
    { label: '8', type: 'num' },
    { label: '9', type: 'num' },
    { label: '×', type: 'op', aria: 'Multiply' },
    { label: '4', type: 'num' },
    { label: '5', type: 'num' },
    { label: '6', type: 'num' },
    { label: '−', type: 'op', aria: 'Subtract' },
    { label: '1', type: 'num' },
    { label: '2', type: 'num' },
    { label: '3', type: 'num' },
    { label: '+', type: 'op', aria: 'Add' },
    { label: '⌫', type: 'func', aria: 'Backspace' },
    { label: '0', type: 'num' },
    { label: '.', type: 'num', aria: 'Decimal' },
    { label: '=', type: 'eq', aria: 'Equals' },
  ]

  const displayClass =
    display === 'Error'
      ? 'display__value display__value--error'
      : display.replace('-', '').replace('.', '').length > 9
        ? 'display__value display__value--compact'
        : 'display__value'

  return (
    <main className="app">
      <section className="calculator" aria-label="Calculator">
        <header className="calculator__brand">
          <span className="calculator__mark" aria-hidden="true" />
          <h1 className="calculator__title">Calc</h1>
          <div className="calculator__actions">
            <button
              type="button"
              className={`history-toggle${showHistory ? ' history-toggle--active' : ''}`}
              onClick={() => {
                setShowHistory((open) => !open)
                setShowProfile(false)
              }}
              aria-expanded={showHistory}
              aria-controls="calc-history"
            >
              History
            </button>
            <button
              type="button"
              className={`profile-button${showProfile ? ' profile-button--active' : ''}`}
              onClick={() => {
                setShowProfile((open) => !open)
                setShowHistory(false)
              }}
              aria-expanded={showProfile}
              aria-controls="calc-profile"
              aria-label="Open profile"
            >
              <span className="profile-button__avatar" aria-hidden="true">
                {profile.initials}
              </span>
            </button>
          </div>
        </header>

        <div className="calculator__main">
          <div className="display" aria-live="polite">
            <p className="display__expression">{expression || '\u00A0'}</p>
            <p className={displayClass}>{formatDisplay(display)}</p>
          </div>

          <div className="keypad" role="group" aria-label="Keypad">
            {buttons.map(({ label, type, aria }) => (
              <button
                key={label}
                type="button"
                className={`key key--${type}${operator === label && !overwrite ? ' key--active' : ''}`}
                onClick={() => handlePress(label)}
                aria-label={aria || label}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(showProfile || showHistory) && (
          <aside className="calculator__side">
            {showProfile && (
              <section className="profile" id="calc-profile" aria-label="User profile">
                <div className="profile__identity">
                  <span className="profile__avatar" aria-hidden="true">
                    {profile.initials}
                  </span>
                  <div>
                    <h2 className="profile__name">{profile.name}</h2>
                    <p className="profile__handle">{profile.handle}</p>
                  </div>
                </div>
                <dl className="profile__stats">
                  <div className="profile__stat">
                    <dt>Calculations</dt>
                    <dd>{history.length}</dd>
                  </div>
                  <div className="profile__stat">
                    <dt>Session</dt>
                    <dd>Local</dd>
                  </div>
                </dl>
              </section>
            )}

            {showHistory && (
              <section className="history" id="calc-history" aria-label="Calculation history">
                <div className="history__header">
                  <h2 className="history__title">Recent</h2>
                  <button
                    type="button"
                    className="history__clear"
                    onClick={clearHistory}
                    disabled={history.length === 0}
                  >
                    Clear
                  </button>
                </div>

                {history.length === 0 ? (
                  <p className="history__empty">No calculations yet</p>
                ) : (
                  <ul className="history__list">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="history__item"
                          onClick={() => recallHistory(entry)}
                          aria-label={`Recall ${entry.expr} ${formatDisplay(entry.result)}`}
                        >
                          <span className="history__expr">{entry.expr}</span>
                          <span className="history__result">{formatDisplay(entry.result)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </aside>
        )}
      </section>
    </main>
  )
}
