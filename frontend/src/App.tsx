import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-sky-400 mb-4">AgentCart MVP</h1>
      <p className="text-lg text-slate-300 mb-6">
        AI-Native Commerce Platform for TechNest
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-semibold transition"
      >
        Click count: {count}
      </button>
    </div>
  )
}

export default App
