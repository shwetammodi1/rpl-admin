import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button type="button" className="counter" onClick={() => setCount((c) => c + 1)}>
      Count is {count}
    </button>
  )
}
