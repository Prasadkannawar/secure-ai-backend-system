import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm">Secure AI</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <>
              <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Dashboard
              </Link>
              <Link to="/admin" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Admin
              </Link>
            </>
          )}

          {/* User chip */}
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-700">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-white font-medium leading-tight">{user?.email}</p>
              <p className="text-xs text-indigo-400 capitalize leading-tight">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
