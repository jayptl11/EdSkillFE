import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from './store/useAppStore'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

// A simple fake API fetch
const fetchFakeData = async () => {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

function App() {
  const [count, setCount] = useState(0)
  
  // Zustand State
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)

  // React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['fakeData'],
    queryFn: fetchFakeData,
  })

  return (
    <div className={`app-container ${theme}`}>
      <section id="center">
        <div className="hero">
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Vite + React 19 + TS</h1>
          <p>Setup includes React Query and Zustand</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0' }}>
          <button
            type="button"
            className="counter"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
          
          <button type="button" onClick={toggleTheme}>
            Toggle Theme ({theme})
          </button>
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
          <h3>React Query Demo</h3>
          {isLoading && <p>Loading data...</p>}
          {error && <p>Error loading data!</p>}
          {data && (
            <pre style={{ textAlign: 'left', background: '#222', color: '#fff', padding: '1rem', borderRadius: '4px' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
