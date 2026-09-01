import { useState } from 'react'
import { theme } from '../styles/theme.js'
import { useToast } from '../context/ToastContext.jsx'
import { setPassword, skipPasswordSetup } from '../api/vote.js'

const styleTag = `
@keyframes welcome-in {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes welcome-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes welcome-badge-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
`

/** Modal d'accueil déclenché une seule fois par compte, à la première
 * connexion Microsoft (voir MicrosoftCallback.jsx qui pose le marqueur
 * localStorage, et POST /auth/set-password / /auth/skip-password-setup côté
 * backend qui le lèvent définitivement). Optionnel : "Plus tard" ferme sans
 * rien définir, la personne continue avec Microsoft uniquement. */
export default function WelcomePasswordModal({ fullName, onDone }) {
  const { colors, radius } = theme
  const toast = useToast()
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const firstName = (fullName ?? '').trim().split(/\s+/)[0] ?? ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Au moins 8 caractères.')
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.')
    setSaving(true)
    try {
      await setPassword(password)
      localStorage.removeItem('vote_needs_password')
      toast.success('Tu peux maintenant te connecter avec ton email et ce mot de passe, ou avec Microsoft.', 'Mot de passe défini')
      onDone()
    } catch (err) {
      setError(err.message ?? 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    setSkipping(true)
    try {
      await skipPasswordSetup()
    } catch {
      // Même en cas d'erreur réseau, on ne bloque pas la personne — le
      // marqueur local est retiré, tant pis si le serveur le redemande.
    } finally {
      localStorage.removeItem('vote_needs_password')
      setSkipping(false)
      onDone()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,46,33,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'welcome-overlay-in 0.2s ease',
    }}>
      <style>{styleTag}</style>
      <div style={{
        width: '100%', maxWidth: 420,
        background: colors.white, borderRadius: 22, padding: '32px 30px 26px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        animation: 'welcome-in 0.4s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.green}, ${colors.orange})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 26px rgba(33,168,99,0.35)',
            animation: 'welcome-badge-pop 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s backwards',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: colors.gray900, letterSpacing: '-0.01em' }}>
              Bienvenue{firstName ? `, ${firstName}` : ''} !
            </div>
            <p style={{ fontSize: 13, color: colors.gray500, marginTop: 6, lineHeight: 1.5 }}>
              Ta connexion Microsoft fonctionne. Envie d'un accès de secours ?
              Définis un mot de passe personnel — tu pourras ensuite te connecter
              soit avec ton email, soit avec Microsoft.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={e => setPasswordValue(e.target.value)}
              placeholder="8 caractères minimum"
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirme-le</label>
            <input
              className="form-control"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 10,
              background: colors.errorBg, border: `1px solid ${colors.errorBorder}`,
              fontSize: 12.5, color: colors.errorText, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving || skipping} style={{ justifyContent: 'center', marginTop: 4 }}>
            {saving ? 'Enregistrement…' : 'Définir mon mot de passe'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving || skipping}
            style={{
              background: 'none', border: 'none', color: colors.gray400,
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 4,
            }}>
            {skipping ? 'Un instant…' : 'Plus tard'}
          </button>
        </form>
      </div>
    </div>
  )
}
