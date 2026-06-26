import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2}
        d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm px-3 py-1.5 rounded-lg transition font-medium
        ${location.pathname === to
          ? 'bg-brand-100 dark:bg-brand-600/20 text-brand-600 dark:text-brand-400'
          : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
        }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <BrainIcon />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Secure AI</span>
            <span className="hidden sm:block text-xs text-slate-400 dark:text-gray-500">Intelligence Platform</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {user && navLink('/dashboard', 'Analyze')}
          {user && navLink('/history', 'History')}
          {user?.role === 'admin' && navLink('/admin', 'Admin')}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="ml-1 p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User */}
          {user && (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200 dark:border-gray-700">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-900 dark:text-white leading-tight">{user.email}</p>
                <p className="text-xs text-brand-600 dark:text-brand-400 capitalize leading-tight">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
