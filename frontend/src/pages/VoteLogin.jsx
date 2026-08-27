import { useState, useEffect } from 'react'
import { theme } from '../styles/theme.js'
import { useVoteAuth } from '../context/VoteAuthContext.jsx'
import { checkVoteBackendHealth } from '../api/vote.js'

function BackendBadge() {
  const { colors } = theme
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      const ok = await checkVoteBackendHealth()
      if (!cancelled) setStatus(ok ? 'up' : 'down')
    }
    ping()
    const id = setInterval(ping, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const cfg = {
    checking: { dot: colors.gray300, text: colors.gray500, bg: colors.gray50, border: colors.gray200, label: 'Vérification du backend…' },
    up:       { dot: '#22c55e', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Backend en ligne' },
    down:     { dot: '#ef4444', text: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Backend hors ligne' },
  }[status]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 12px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11.5, fontWeight: 600, color: cfg.text,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </div>
  )
}

export default function VoteLogin() {
  const { colors, radius } = theme
  const { signIn } = useVoteAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await signIn(username.trim(), password)
    } catch (err) {
      setError(err.message ?? 'Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.gray50, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: colors.white, borderRadius: radius.xl, padding: '32px 32px 28px', boxShadow: theme.shadow.xl, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: colors.green }}>Système de vote</div>
          <p style={{ fontSize: 13, color: colors.gray500, marginTop: 6 }}>Connectez-vous pour accéder au vote</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Identifiant</label>
            <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
          </div>

          {error && (
            <div style={{ padding: '9px 13px', borderRadius: 8, background: colors.errorBg, border: `1px solid ${colors.errorBorder}`, fontSize: 13, color: colors.errorText, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BackendBadge />
        </div>
      </div>
    </div>
  )
}
