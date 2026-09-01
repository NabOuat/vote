import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { theme } from '../styles/theme.js'
import { useVoteAuth } from '../context/VoteAuthContext.jsx'
import { checkVoteBackendHealth } from '../api/vote.js'

function BackendBadge() {
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
    checking: { dot: 'rgba(255,255,255,0.6)', text: 'rgba(255,255,255,0.75)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.16)', label: 'Vérification du backend…' },
    up:       { dot: '#4ade80', text: '#dcfce7', bg: 'rgba(74,222,128,0.14)', border: 'rgba(74,222,128,0.3)', label: 'Backend en ligne' },
    down:     { dot: '#f87171', text: '#fee2e2', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.3)', label: 'Backend hors ligne' },
  }[status]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 12px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11.5, fontWeight: 600, color: cfg.text, backdropFilter: 'blur(6px)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0,
        boxShadow: status === 'up' ? '0 0 6px #4ade80' : status === 'down' ? '0 0 6px #f87171' : 'none',
      }} />
      {cfg.label}
    </div>
  )
}

const styleTag = `
@keyframes vote-blob-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, -30px) scale(1.08); }
}
@keyframes vote-blob-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-35px, 25px) scale(1.1); }
}
@keyframes vote-card-in {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes vote-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
.vote-login-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.vote-login-input::placeholder { color: rgba(255,255,255,0.35); }
.vote-login-input:focus {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.1);
}
.vote-login-input:disabled { opacity: 0.6; }
`

const MS_REMEMBER_KEY = 'vote_ms_remember'

export default function VoteLogin() {
  const { signIn } = useVoteAuth()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(searchParams.get('msError') ?? '')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [rememberMs, setRememberMs] = useState(() => localStorage.getItem(MS_REMEMBER_KEY) === '1')

  // "Se souvenir de moi" coché la fois précédente + pas de retour d'échec
  // silencieux (sinon boucle infinie de redirections) → retente la connexion
  // Microsoft automatiquement, sans montrer le formulaire.
  const silentFailed = searchParams.get('msSilentFailed') === '1'
  const [autoAttempting, setAutoAttempting] = useState(rememberMs && !silentFailed && !searchParams.get('msError'))

  useEffect(() => {
    if (autoAttempting) window.location.href = '/api/auth/microsoft/login?silent=1'
  }, [autoAttempting])

  function handleRememberChange(e) {
    const checked = e.target.checked
    setRememberMs(checked)
    localStorage.setItem(MS_REMEMBER_KEY, checked ? '1' : '0')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      // Identifiant normalisé : c'est l'email pro, saisi indifféremment en
      // majuscules ou minuscules, et stocké en minuscules à l'import.
      await signIn(username.trim().toLowerCase(), password)
    } catch (err) {
      setError(err.message ?? 'Identifiants incorrects.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  if (autoAttempting) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        background: `linear-gradient(155deg, #0f2e21 0%, #123a29 35%, ${theme.colors.greenDark} 75%, #0d2c1f 100%)`,
        fontFamily: theme.font.family,
      }}>
        <style>{'@keyframes vote-spin { to { transform: rotate(360deg) } }'}</style>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'vote-spin 0.8s linear infinite' }} />
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5 }}>Connexion Microsoft en cours…</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      background: `linear-gradient(155deg, #0f2e21 0%, #123a29 35%, ${theme.colors.greenDark} 75%, #0d2c1f 100%)`,
      fontFamily: theme.font.family,
    }}>
      <style>{styleTag}</style>

      {/* Blobs décoratifs en arrière-plan */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-8%', width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(33,168,99,0.45) 0%, rgba(33,168,99,0) 70%)',
        animation: 'vote-blob-1 14s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%', width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(243,128,48,0.28) 0%, rgba(243,128,48,0) 70%)',
        animation: 'vote-blob-2 16s ease-in-out infinite', pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: '36px 32px 28px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', gap: 22,
        animation: `vote-card-in 0.5s cubic-bezier(0.16,1,0.3,1)${shake ? ', vote-shake 0.5s ease-in-out' : ''}`,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${theme.colors.green}, ${theme.colors.orange})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(33,168,99,0.4)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.91.37 4.15 1.02" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Système de vote</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Élections internes AFOR — connectez-vous</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Identifiant</label>
            <input
              className="vote-login-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              placeholder="prenom.nom@afor.ci"
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Mot de passe</label>
            <input
              className="vote-login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 13px', borderRadius: 10,
              background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.3)',
              fontSize: 13, color: '#fecaca', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: loading ? 'rgba(255,255,255,0.15)' : `linear-gradient(135deg, ${theme.colors.green}, ${theme.colors.greenDark})`,
              color: '#fff',
              fontSize: 14.5, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 8px 20px rgba(33,168,99,0.35)',
              transition: 'transform 0.1s, box-shadow 0.15s',
            }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 11.5 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          ou
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        <a
          href="/api/auth/microsoft/login"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.95)', color: '#1f2937',
            fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
          }}>
          <svg width="17" height="17" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Se connecter avec Microsoft
        </a>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          fontSize: 12, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={rememberMs}
            onChange={handleRememberChange}
            style={{ accentColor: theme.colors.green, width: 14, height: 14 }}
          />
          Se souvenir de moi (Microsoft)
        </label>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BackendBadge />
        </div>
      </div>
    </div>
  )
}
