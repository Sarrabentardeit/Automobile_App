import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { mockUsers } from '@/data/mock'
import { ROLE_CONFIG } from '@/types'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const result = login(email, password)
      if (result.success) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.error ?? 'Erreur de connexion')
      }
      setLoading(false)
    }, 400)
  }

  const demoAccounts = (() => {
    const actifs = mockUsers.filter(u => u.statut === 'actif')
    const roles = ['admin', 'responsable', 'technicien', 'financier'] as const
    return roles
      .map(role => actifs.find(u => u.role === role))
      .filter((u): u is NonNullable<typeof u> => u != null)
  })()

  const quickLogin = (em: string) => {
    setEmail(em)
    setPassword('demo')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-5 sm:mb-8">
          <img src="/logo.jpg" alt="El Mecano Garage" className="w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-2 sm:mb-3 drop-shadow-2xl" />
          <p className="text-gray-500 mt-0.5 text-xs sm:text-sm">Système de Gestion Interne</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-7">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1">Connexion</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">Accédez à votre espace de travail</p>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="votre@elmecano.tn" autoComplete="email" inputMode="email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 pr-12 text-sm"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPw ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 disabled:from-orange-300 disabled:to-orange-300 text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 text-sm"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2 sm:mb-3">Comptes de démonstration</p>
            <div className="space-y-1 sm:space-y-1.5">
              {demoAccounts.map(u => (
                <button key={u.id} onClick={() => quickLogin(u.email)}
                  className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg px-2.5 sm:px-3 py-2 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{u.nom_complet}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md flex-shrink-0 ml-2 ${ROLE_CONFIG[u.role].bg} ${ROLE_CONFIG[u.role].color}`}>
                    {ROLE_CONFIG[u.role].label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
