import { useEffect, useState } from 'react'
import { getHistory } from '../api/client'
import Navbar from '../components/Navbar'

const MODE_META = {
  sentiment: { label: 'Sentiment',      color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',    border: 'border-l-blue-400' },
  emotion:   { label: 'Emotion',        color: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400', border: 'border-l-purple-400' },
  full:      { label: 'Full Analysis',  color: 'bg-brand-100 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400', border: 'border-l-brand-500' },
  batch:     { label: 'Batch',          color: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400', border: 'border-l-slate-400' },
}

const RISK_TEXT = {
  LOW:      'text-emerald-600 dark:text-emerald-400',
  MEDIUM:   'text-amber-600 dark:text-amber-400',
  HIGH:     'text-orange-600 dark:text-orange-400',
  CRITICAL: 'text-red-600 dark:text-red-400',
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ResultSummary({ mode, result }) {
  if (mode === 'sentiment') {
    const isPos = result.label === 'POSITIVE'
    return (
      <span className={`font-medium ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPos ? '↑' : '↓'} {result.label} ({Math.round(result.score * 100)}%)
      </span>
    )
  }
  if (mode === 'emotion') {
    return (
      <span className="text-slate-600 dark:text-gray-400 capitalize">
        Primary: <strong>{result.primary_emotion}</strong>
      </span>
    )
  }
  if (mode === 'full') {
    const r = RISK_TEXT[result.risk_level] || ''
    return (
      <span className="flex items-center gap-2">
        <span className={`font-bold ${r}`}>{result.risk_level} RISK</span>
        <span className="text-slate-500 dark:text-gray-500">· Health {result.health_score}/100</span>
      </span>
    )
  }
  if (mode === 'batch') {
    return (
      <span className="text-slate-500 dark:text-gray-400">
        {result.results?.length ?? 0} texts analyzed
      </span>
    )
  }
  return null
}

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getHistory()
      .then(setRecords)
      .catch(e => setError(e.message || 'Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  const modes = ['all', 'sentiment', 'emotion', 'full', 'batch']
  const filtered = filter === 'all' ? records : records.filter(r => r.mode === filter)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analysis History</h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Your past content intelligence runs — newest first</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-xl p-1 border border-slate-200 dark:border-gray-800 w-fit">
          {modes.map(m => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                filter === m
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m === 'all' ? `All (${records.length})` : m}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 animate-pulse">
                <div className="h-4 bg-slate-100 dark:bg-gray-800 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-500 dark:text-gray-400 font-medium">No analyses yet</p>
            <p className="text-slate-400 dark:text-gray-600 text-sm mt-1">
              Go to <a href="/dashboard" className="text-brand-600 dark:text-brand-400 hover:underline">Analyze</a> to run your first analysis
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(rec => {
            const meta = MODE_META[rec.mode] || MODE_META.full
            const isExpanded = expanded === rec.id
            return (
              <div
                key={rec.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 border-l-4 ${meta.border} overflow-hidden`}
              >
                <button
                  className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-gray-800/50 transition"
                  onClick={() => setExpanded(isExpanded ? null : rec.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-gray-500">{formatTime(rec.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-gray-400 truncate">
                        {rec.input_text}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                      <ResultSummary mode={rec.mode} result={rec.result} />
                      <span className="text-slate-300 dark:text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-gray-800">
                    <pre className="mt-3 text-xs bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(rec.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
