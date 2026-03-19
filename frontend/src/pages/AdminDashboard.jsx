import { useEffect, useState } from 'react'
import { getStats, getUsers, blockUser, getBlockedIps, unblockIp } from '../api/client'
import Navbar from '../components/Navbar'

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [blockedIps, setBlockedIps] = useState([])
  const [loadingBlock, setLoadingBlock] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('stats') // 'stats' | 'users' | 'ips'

  async function loadStats() {
    try { setStats(await getStats()) } catch (e) { setError(e.message) }
  }
  async function loadUsers() {
    try { setUsers(await getUsers()) } catch (e) { setError(e.message) }
  }
  async function loadIps() {
    try {
      const data = await getBlockedIps()
      setBlockedIps(data.blocked_ips || [])
    } catch (e) { setError(e.message) }
  }

  useEffect(() => {
    loadStats()
    loadUsers()
    loadIps()
  }, [])

  async function handleBlock(id) {
    setLoadingBlock(id)
    try {
      await blockUser(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u))
    } catch (e) { setError(e.message) }
    finally { setLoadingBlock(null) }
  }

  async function handleUnblock(ip) {
    try {
      await unblockIp(ip)
      setBlockedIps(prev => prev.filter(i => i !== ip))
    } catch (e) { setError(e.message) }
  }

  const tabs = [
    { key: 'stats', label: 'Stats' },
    { key: 'users', label: `Users (${users.length})` },
    { key: 'ips',   label: `Blocked IPs (${blockedIps.length})` },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        <div>
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-gray-400 mt-1">Monitor usage, manage users, and control IP access</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-3 underline">dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 w-fit border border-gray-800">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Requests" value={stats?.total_requests} />
              <StatCard label="Last Hour" value={stats?.requests_last_hour} color="text-indigo-400" />
              <StatCard
                label="Error Rate"
                value={stats ? `${(stats.error_rate * 100).toFixed(1)}%` : null}
                color={stats?.error_rate > 0.1 ? 'text-red-400' : 'text-green-400'}
              />
              <StatCard label="Top Endpoints" value={stats?.top_endpoints?.length ?? 0} color="text-yellow-400" />
            </div>

            {stats?.top_endpoints?.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Endpoints</h3>
                <div className="space-y-3">
                  {stats.top_endpoints.map((ep, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-300">{ep.endpoint}</span>
                      <span className="text-xs bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-full font-medium">
                        {ep.count} hits
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={loadStats}
              className="text-sm text-gray-400 hover:text-white underline transition"
            >
              Refresh stats
            </button>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 text-gray-200 font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${
                        u.is_active ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <button
                          onClick={() => handleBlock(u.id)}
                          disabled={loadingBlock === u.id}
                          className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {loadingBlock === u.id ? 'Blocking...' : 'Block'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center text-gray-600 py-10">No users found</p>
            )}
          </div>
        )}

        {/* Blocked IPs Tab */}
        {tab === 'ips' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {blockedIps.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🛡️</div>
                <p className="text-gray-400 font-medium">No blocked IPs</p>
                <p className="text-gray-600 text-sm mt-1">IPs are auto-blocked after 50 req/min</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">IP Address</th>
                    <th className="px-6 py-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {blockedIps.map(ip => (
                    <tr key={ip} className="hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 font-mono text-gray-200">{ip}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUnblock(ip)}
                          className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg transition"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
