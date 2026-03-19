import { useState } from 'react'
import { predict, aiHealth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user } = useAuth()
  const [input, setInput] = useState('1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0')
  const [result, setResult] = useState(null)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePredict(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const parsed = input.split(',').map(v => {
        const n = parseFloat(v.trim())
        if (isNaN(n)) throw new Error(`"${v.trim()}" is not a valid number`)
        return n
      })
      const data = await predict(parsed)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleHealth() {
    try {
      const data = await aiHealth()
      setHealth(data)
    } catch (err) {
      setHealth({ status: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-gray-400 mt-1">{user?.email} · <span className="capitalize text-indigo-400">{user?.role}</span></p>
        </div>

        {/* Model Health */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Model Status</h3>
            <button
              onClick={handleHealth}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded-lg transition"
            >
              Check
            </button>
          </div>
          {health ? (
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-300 text-sm">
                Status: <span className="font-medium text-white">{health.status}</span>
                {health.model && <> · Model: <span className="font-medium text-white">{health.model}</span></>}
              </span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Check" to ping the model endpoint.</p>
          )}
        </div>

        {/* Predict */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-1">Run Inference</h3>
          <p className="text-gray-500 text-sm mb-5">Enter comma-separated float values (max 512)</p>

          <form onSubmit={handlePredict} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Input Data</label>
              <textarea
                rows={3}
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                placeholder="1.0, 2.0, 3.0, ..."
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-2.5 transition"
            >
              {loading ? 'Running...' : 'Run Prediction'}
            </button>
          </form>

          {result && (
            <div className="mt-6 space-y-3">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Prediction Output</p>
                <p className="text-green-400 font-mono text-sm break-all">
                  [{result.prediction.map(v => v.toFixed(6)).join(', ')}]
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
                <p className="text-gray-300 font-mono text-sm">{result.user_id}</p>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
