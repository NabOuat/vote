import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { voteTokenStore } from '../api/voteClient.js'

/** Point d'atterrissage après la redirection Microsoft (voir
 * server/src/routes/auth.routes.js, GET /auth/microsoft/callback) — reçoit
 * le JWT interne déjà émis par le backend en query string, l'enregistre
 * exactement comme le ferait un login classique, puis recharge l'app pour
 * que VoteAuthProvider reparte de zéro avec la session active. */
export default function MicrosoftCallback() {
  const [params] = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const id = params.get('id')
    const role = params.get('role')
    const fullName = params.get('fullName')
    const poste = params.get('poste') ?? ''
    const photoPath = params.get('photoPath') ?? ''
    const mobilePhone = params.get('mobilePhone') ?? ''
    if (token && role && fullName) {
      voteTokenStore.set(token)
      localStorage.setItem('vote_user', JSON.stringify({ id: id ? Number(id) : undefined, role, fullName, poste, photoPath, mobilePhone }))
      // Première connexion Microsoft de ce compte → WelcomePasswordModal se
      // charge de le proposer une fois arrivé dans l'app, puis nettoie ce
      // marqueur (voir set-password / skip-password-setup côté backend).
      if (params.get('needsPassword') === '1') localStorage.setItem('vote_needs_password', '1')
    }
    window.location.replace('/')
  }, [params])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e5e7eb', borderTopColor: '#21A863', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
