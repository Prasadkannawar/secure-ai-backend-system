const BASE = ''  // Vite proxy forwards /auth, /ai, /admin to localhost:8000

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, message: data.error || data.detail || 'Request failed' }
  return data
}

// Auth
export const register = (email, password) =>
  request('POST', '/auth/register', { email, password })

export const login = async (email, password) => {
  const data = await request('POST', '/auth/login', { email, password })
  localStorage.setItem('token', data.access_token)
  return data
}

export const logout = () => localStorage.removeItem('token')

export const getMe = () => request('GET', '/auth/me')

// AI
export const predict = (input_data) =>
  request('POST', '/ai/predict', { input_data })

export const aiHealth = () => request('GET', '/ai/health')

// Admin
export const getStats = () => request('GET', '/admin/stats')
export const getUsers = () => request('GET', '/admin/users')
export const blockUser = (id) => request('PATCH', `/admin/users/${id}/block`)
export const getBlockedIps = () => request('GET', '/admin/blocked-ips')
export const unblockIp = (ip) => request('POST', `/admin/unblock/${ip}`)
