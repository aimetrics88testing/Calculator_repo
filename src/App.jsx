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

    if (result === null) {
      setDisplay('Error')
      setExpression('')
    } else {
      setDisplay(result)
      setExpression(`${formatDisplay(previous)} ${operator} ${formatDisplay(display)} =`)
    }

    setPrevious(null)
    setOperator(null)
    setOverwrite(true)
  }, [compute, display, operator, previous])

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
        </header>

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
      </section>
    </main>
  )
}
