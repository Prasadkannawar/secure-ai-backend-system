import { useState } from 'react'
import { analyzeSentiment, aiHealth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await analyzeSentiment(text)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleHealth() {
    try {
      setHealth(await aiHealth())
    } catch {
      setHealth({ status: 'error' })
    }
  }

  const isPositive = result?.label === 'POSITIVE'
  const pct = result ? Math.round(result.score * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-gray-400 mt-1">
            {user?.email} · <span className="capitalize text-indigo-400">{user?.role}</span>
          </p>
        </div>

        {/* Model Health */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Model Status</h3>
              <p className="text-gray-500 text-xs mt-0.5">DistilBERT · SST-2 · runs on-server</p>
            </div>
            <button
              onClick={handleHealth}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded-lg transition"
            >
              Check
            </button>
          </div>
          {health ? (
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-gray-300 text-sm">
                {health.status === 'ok' ? 'Model loaded & ready' : 'Model loading — try again in a few seconds'}
              </span>
              {health.model && (
                <span className="ml-auto text-xs text-gray-600 font-mono">{health.model}</span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Check" to ping the model endpoint.</p>
          )}
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-1">Sentiment Analysis</h3>
          <p className="text-gray-500 text-sm mb-5">
            Classify text as positive or negative using DistilBERT — no external API, runs fully on-server.
          </p>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <textarea
                rows={4}
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                placeholder="Type any text to analyze its sentiment… e.g. 'The product quality exceeded my expectations!'"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">{text.length} / 2000</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-2.5 transition"
            >
              {loading ? 'Analyzing…' : 'Analyze Sentiment'}
            </button>
          </form>

          {result && (
            <div className="mt-6 space-y-3">
              {/* Sentiment result card */}
              <div className={`rounded-xl p-5 border ${isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{isPositive ? '😊' : '😔'}</span>
                  <div>
                    <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.label}
                    </p>
                    <p className="text-gray-400 text-sm">{pct}% confidence</p>
                  </div>
                </div>
                {/* Confidence bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Confidence</span>
                    <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Auth info */}
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Authenticated as</span>
                <span className="text-gray-300 font-mono text-xs">{result.user_id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick examples */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Try these examples</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              'The new product launch was an incredible success — customers loved every detail.',
              'Terrible experience. The service was slow and the staff were unhelpful.',
              'I absolutely loved the film. The storyline and acting were both superb.',
              'Worst purchase I have ever made. Complete waste of money.',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setText(example)}
                className="text-left text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-2.5 transition"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
