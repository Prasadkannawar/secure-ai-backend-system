import { useState } from 'react'
import { analyzeSentiment, analyzeEmotion, analyzeFull, analyzeBatch, aiHealth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

// ── Emotion config ─────────────────────────────────────────────────────────
const EMOTION_META = {
  joy:      { color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', emoji: '😊' },
  anger:    { color: '#ef4444', bg: 'bg-red-100 dark:bg-red-500/10',     text: 'text-red-700 dark:text-red-400',     emoji: '😠' },
  sadness:  { color: '#6366f1', bg: 'bg-indigo-100 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', emoji: '😢' },
  fear:     { color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-500/10',  text: 'text-amber-700 dark:text-amber-400',  emoji: '😨' },
  disgust:  { color: '#84cc16', bg: 'bg-lime-100 dark:bg-lime-500/10',   text: 'text-lime-700 dark:text-lime-400',   emoji: '🤢' },
  surprise: { color: '#a855f7', bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', emoji: '😮' },
  neutral:  { color: '#94a3b8', bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', emoji: '😐' },
}

const RISK_META = {
  LOW:      { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-400', bar: '#10b981' },
  MEDIUM:   { bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/30',   text: 'text-amber-700 dark:text-amber-400',   bar: '#f59e0b' },
  HIGH:     { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-400', bar: '#f97316' },
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/30',       text: 'text-red-700 dark:text-red-400',       bar: '#ef4444' },
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  )
}

function EmotionBars({ emotions }) {
  const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2.5">
      {sorted.map(([label, score]) => {
        const meta = EMOTION_META[label] || EMOTION_META.neutral
        const pct = Math.round(score * 100)
        return (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-medium capitalize flex items-center gap-1 ${meta.text}`}>
                {meta.emoji} {label}
              </span>
              <span className="text-slate-500 dark:text-gray-500">{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full emotion-bar"
                style={{ width: `${pct}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SentimentBadge({ label, score }) {
  const isPos = label === 'POSITIVE'
  return (
    <div className={`rounded-xl p-5 border ${isPos
      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
      : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{isPos ? '😊' : '😔'}</span>
        <div>
          <p className={`text-xl font-bold ${isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {label}
          </p>
          <p className="text-slate-500 dark:text-gray-400 text-sm">{Math.round(score * 100)}% confidence</p>
        </div>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full emotion-bar"
          style={{ width: `${Math.round(score * 100)}%`, backgroundColor: isPos ? '#10b981' : '#ef4444' }}
        />
      </div>
    </div>
  )
}

function HealthGauge({ score, riskLevel }) {
  const meta = RISK_META[riskLevel] || RISK_META.LOW
  return (
    <div className={`rounded-xl p-5 border ${meta.bg} ${meta.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-0.5">Content Health Score</p>
          <p className={`text-4xl font-black ${meta.text}`}>{score}<span className="text-lg font-normal">/100</span></p>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-full ${meta.bg} ${meta.text} border ${meta.border}`}>
          {riskLevel} RISK
        </div>
      </div>
      <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full emotion-bar"
          style={{ width: `${score}%`, backgroundColor: meta.bar }}
        />
      </div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder, rows = 4, maxLength = 2000 }) {
  return (
    <div>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <p className="text-xs text-slate-400 dark:text-gray-600 text-right mt-1">{value.length}/{maxLength}</p>
    </div>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
      {msg}
    </div>
  )
}

function SubmitBtn({ loading, label = 'Analyze', disabled }) {
  return (
    <button
      type="submit" disabled={loading || disabled}
      className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-2.5 transition text-sm"
    >
      {loading ? 'Analyzing…' : label}
    </button>
  )
}

const EXAMPLES = [
  'The new product launch exceeded all expectations — customers are absolutely thrilled!',
  'I am extremely frustrated with the service. Nothing works and support is useless.',
  'I feel anxious about the upcoming changes — not sure what to expect from management.',
  'Incredible team effort! We shipped on time and the client was delighted with results.',
]

// ── Tabs ───────────────────────────────────────────────────────────────────

function SentimentTab() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setResult(null); setLoading(true)
    try { setResult(await analyzeSentiment(text)) }
    catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500 dark:text-gray-400">
        Binary classification: <strong className="text-emerald-600 dark:text-emerald-400">POSITIVE</strong> or <strong className="text-red-600 dark:text-red-400">NEGATIVE</strong> with confidence score.
        Powered by DistilBERT fine-tuned on SST-2 (97% GLUE accuracy).
      </div>
      <form onSubmit={submit} className="space-y-4">
        <TextInput value={text} onChange={setText} placeholder="Enter any text to classify its sentiment…" />
        <div className="flex items-center gap-3 flex-wrap">
          <SubmitBtn loading={loading} disabled={!text.trim()} label="Run Sentiment" />
          <span className="text-xs text-slate-400 dark:text-gray-600">or try an example:</span>
          {EXAMPLES.slice(0, 2).map((ex, i) => (
            <button key={i} type="button" onClick={() => setText(ex)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Example {i + 1}
            </button>
          ))}
        </div>
        <ErrorBox msg={error} />
      </form>
      {result && <SentimentBadge label={result.label} score={result.score} />}
    </div>
  )
}

function EmotionTab() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setResult(null); setLoading(true)
    try { setResult(await analyzeEmotion(text)) }
    catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500 dark:text-gray-400">
        7-class emotion detection: anger, disgust, fear, joy, neutral, sadness, surprise.
        Model: <code className="text-xs bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-400">j-hartmann/emotion-english-distilroberta-base</code>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <TextInput value={text} onChange={setText} placeholder="Enter text to detect emotions…" />
        <div className="flex items-center gap-3 flex-wrap">
          <SubmitBtn loading={loading} disabled={!text.trim()} label="Detect Emotions" />
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setText(ex)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Example {i + 1}
            </button>
          ))}
        </div>
        <ErrorBox msg={error} />
      </form>
      {result && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 border ${EMOTION_META[result.primary_emotion]?.bg || ''} border-slate-200 dark:border-gray-700`}>
            <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1">Primary Emotion</p>
            <p className={`text-2xl font-bold capitalize ${EMOTION_META[result.primary_emotion]?.text || ''}`}>
              {EMOTION_META[result.primary_emotion]?.emoji} {result.primary_emotion}
            </p>
          </div>
          <Card className="p-5">
            <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-4">All Emotions</p>
            <EmotionBars emotions={result.emotions} />
          </Card>
        </div>
      )}
    </div>
  )
}

function FullTab() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setResult(null); setLoading(true)
    try { setResult(await analyzeFull(text)) }
    catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500 dark:text-gray-400">
        <strong className="text-slate-700 dark:text-slate-200">ContentIntelligenceEngine</strong> — our custom multi-model pipeline.
        Combines sentiment + emotion into a health score (0–100) + risk level + actionable business insights.
      </div>
      <form onSubmit={submit} className="space-y-4">
        <TextInput value={text} onChange={setText} placeholder="Enter text for full content intelligence analysis…" />
        <div className="flex items-center gap-3 flex-wrap">
          <SubmitBtn loading={loading} disabled={!text.trim()} label="Full Analysis" />
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setText(ex)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Example {i + 1}
            </button>
          ))}
        </div>
        <ErrorBox msg={error} />
      </form>

      {result && (
        <div className="space-y-4">
          <HealthGauge score={result.health_score} riskLevel={result.risk_level} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">Sentiment</p>
              <SentimentBadge label={result.sentiment.label} score={result.sentiment.score} />
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">Emotion Breakdown</p>
              <EmotionBars emotions={result.emotion.emotions} />
            </Card>
          </div>

          <Card className="p-5">
            <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">Business Insights</p>
            <ul className="space-y-2">
              {result.insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-gray-300">
                  <span className="mt-0.5 text-brand-500 flex-shrink-0">→</span>
                  {ins}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}

function BatchTab() {
  const [texts, setTexts] = useState(EXAMPLES.join('\n'))
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lines = texts.split('\n').map(t => t.trim()).filter(Boolean)

  async function submit(e) {
    e.preventDefault()
    if (lines.length < 1 || lines.length > 10) {
      setError('Enter 1–10 lines of text (one per line)')
      return
    }
    setError(''); setResult(null); setLoading(true)
    try { setResult(await analyzeBatch(lines)) }
    catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500 dark:text-gray-400">
        Analyze up to <strong className="text-slate-700 dark:text-slate-200">10 texts at once</strong> — ideal for product reviews, survey responses, or social media comments.
        One text per line. Each gets full analysis: sentiment + emotion + health score.
      </div>
      <form onSubmit={submit} className="space-y-4">
        <TextInput value={texts} onChange={setTexts} rows={6} placeholder="Paste texts here, one per line…" maxLength={10000} />
        <div className="flex items-center gap-3">
          <SubmitBtn loading={loading} disabled={lines.length === 0 || lines.length > 10} label={`Analyze ${lines.length} text${lines.length !== 1 ? 's' : ''}`} />
          <span className="text-xs text-slate-400 dark:text-gray-600">{lines.length}/10 texts</span>
        </div>
        <ErrorBox msg={error} />
      </form>

      {result && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider">{result.count} Results</p>
          {result.results.map((r, i) => {
            const meta = RISK_META[r.risk_level] || RISK_META.LOW
            return (
              <Card key={i} className={`p-4 border-l-4 ${meta.border.split(' ')[0]}`} style={{ borderLeftColor: meta.bar }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed flex-1">
                    <span className="text-xs text-slate-400 dark:text-gray-500 font-mono mr-2">#{i + 1}</span>
                    {r.text_preview}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                      {r.risk_level}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-gray-400">
                      {r.health_score}/100
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-500">
                  <span className={r.sentiment.label === 'POSITIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {r.sentiment.label === 'POSITIVE' ? '↑' : '↓'} {r.sentiment.label}
                  </span>
                  <span>·</span>
                  <span className="capitalize">
                    {EMOTION_META[r.emotion.primary_emotion]?.emoji} {r.emotion.primary_emotion}
                  </span>
                  <span>·</span>
                  <span>{Math.round(r.sentiment.score * 100)}% conf</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'sentiment', label: 'Sentiment',  desc: 'POSITIVE / NEGATIVE' },
  { key: 'emotion',   label: 'Emotion',    desc: '7 emotions' },
  { key: 'full',      label: 'Full Analysis', desc: 'Our model' },
  { key: 'batch',     label: 'Batch',      desc: 'Up to 10 texts' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('full')
  const [health, setHealth] = useState(null)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Intelligence</h1>
            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
              {user?.email} · <span className="text-brand-600 dark:text-brand-400 capitalize">{user?.role}</span>
            </p>
          </div>
          <button
            onClick={async () => { try { setHealth(await aiHealth()) } catch { setHealth({ status: 'error' }) } }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
              health?.status === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400'
            }`}
          >
            {health ? (health.status === 'ok' ? '● Models ready' : '● Loading…') : 'Check model'}
          </button>
        </div>

        {/* Industry use-case strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🎧', label: 'Customer Service', desc: 'Auto-route by emotion' },
            { icon: '🛡️', label: 'Moderation',       desc: 'Flag critical content' },
            { icon: '📊', label: 'Review Analytics', desc: 'Batch score feedback' },
            { icon: '👥', label: 'HR Analytics',     desc: 'Survey sentiment' },
          ].map(u => (
            <Card key={u.label} className="p-4">
              <div className="text-2xl mb-1">{u.icon}</div>
              <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">{u.label}</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{u.desc}</p>
            </Card>
          ))}
        </div>

        {/* Tab bar */}
        <Card className="p-1 flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition text-center ${
                tab === t.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t.label}</span>
              <span className={`hidden sm:block text-xs font-normal mt-0.5 ${tab === t.key ? 'text-brand-100' : 'text-slate-400 dark:text-gray-600'}`}>
                {t.desc}
              </span>
            </button>
          ))}
        </Card>

        {/* Tab content */}
        <Card className="p-6">
          {tab === 'sentiment' && <SentimentTab />}
          {tab === 'emotion'   && <EmotionTab />}
          {tab === 'full'      && <FullTab />}
          {tab === 'batch'     && <BatchTab />}
        </Card>

      </main>
    </div>
  )
}
