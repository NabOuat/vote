import { useState, useEffect, useCallback } from 'react'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useVoteAuth } from '../../context/VoteAuthContext.jsx'
import { listAdmins, updateUserRole, searchUsers, deleteUserAccount, resetUserPassword } from '../../api/vote.js'

const ROLE_LABELS = {
  SUPER_ADMIN: { label: 'Super Admin', badge: 'badge-purple' },
  ADMIN_VOTE:  { label: 'Admin', badge: 'badge-blue' },
  VOTER:       { label: 'Votant', badge: 'badge-gray' },
}

function RoleSelect({ value, disabled, onChange }) {
  const { colors } = theme
  return (
    <select
      className="form-control"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{ width: 'auto', padding: '5px 10px', fontSize: 12.5, color: colors.gray700 }}>
      <option value="VOTER">Votant</option>
      <option value="ADMIN_VOTE">Admin</option>
      <option value="SUPER_ADMIN">Super Admin</option>
    </select>
  )
}

function SearchPicker({ onPick, colors, radius }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    const id = setTimeout(async () => {
      try { setResults(await searchUsers(q)) } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(id)
  }, [query])

  return (
    <div style={{ position: 'relative', maxWidth: 360 }}>
      <input
        className="form-control"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher un compte à promouvoir…"
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
          background: colors.white, border: `1px solid ${colors.gray200}`, borderRadius: radius.md,
          boxShadow: theme.shadow.lg, maxHeight: 260, overflowY: 'auto',
        }}>
          {results.map(u => (
            <button key={u.id} type="button"
              onMouseDown={() => { onPick(u); setQuery(''); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray800 }}>{u.full_name}</div>
                <div style={{ fontSize: 11, color: colors.gray400 }}>{u.username}</div>
              </div>
              <span className={`badge ${ROLE_LABELS[u.role]?.badge ?? 'badge-gray'}`}>{ROLE_LABELS[u.role]?.label ?? u.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Modal réservé à la réinitialisation de mot de passe — un super-admin
 * saisit un nouveau mot de passe pour un compte qui a perdu le sien. */
function ResetPasswordModal({ target, onClose, onConfirm, saving }) {
  const { colors, radius } = theme
  const [password, setPassword] = useState('')
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Réinitialiser le mot de passe</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ fontSize: 13, color: colors.gray500, marginBottom: 12 }}>
          Nouveau mot de passe pour <b style={{ color: colors.gray800 }}>{target.full_name}</b> ({target.username}).
        </div>
        <div className="form-group">
          <input
            className="form-control"
            type="text"
            placeholder="Au moins 8 caractères"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || password.length < 8}
            onClick={() => onConfirm(password)}>
            {saving ? 'Enregistrement…' : 'Réinitialiser'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminManagement() {
  const { colors, radius } = theme
  const toast = useToast()
  const { user: me } = useVoteAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null) // userId en cours de modification
  const [resetTarget, setResetTarget] = useState(null)
  const [resetSaving, setResetSaving] = useState(false)
  const [manageTarget, setManageTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAdmins(await listAdmins())
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRoleChange(user, role) {
    setUpdating(user.id)
    try {
      await updateUserRole(user.id, role)
      toast.success(`${user.full_name} → ${ROLE_LABELS[role].label}.`, 'Rôle mis à jour')
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Supprimer définitivement le compte de ${user.full_name} (${user.username}) ?`)) return
    setUpdating(user.id)
    try {
      await deleteUserAccount(user.id)
      toast.success(`Compte de ${user.full_name} supprimé.`, 'Compte supprimé')
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  async function handleResetPassword(password) {
    setResetSaving(true)
    try {
      await resetUserPassword(resetTarget.id, password)
      toast.success(`Mot de passe de ${resetTarget.full_name} réinitialisé.`, 'Mot de passe')
      setResetTarget(null)
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Administrateurs</div>
          <div className="page-sub">Réservé aux super-admins — promouvoir ou rétrograder des comptes</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Promouvoir un compte</div>
        <SearchPicker
          colors={colors}
          radius={radius}
          onPick={(u) => handleRoleChange(u, u.role === 'VOTER' ? 'ADMIN_VOTE' : u.role)}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Gérer un compte (tous les votants et admins)</div>
        <div style={{ fontSize: 11.5, color: colors.gray400, marginBottom: 10 }}>Réinitialiser un mot de passe ou supprimer un accès.</div>
        <SearchPicker
          colors={colors}
          radius={radius}
          onPick={(u) => setManageTarget(u)}
        />
        {manageTarget && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12,
            padding: '10px 14px', borderRadius: radius.md, background: colors.gray50, border: `1px solid ${colors.gray200}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.gray800 }}>{manageTarget.full_name}</div>
              <div style={{ fontSize: 11, color: colors.gray400 }}>{manageTarget.username}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5, padding: '6px 12px' }}
                onClick={() => { setResetTarget(manageTarget); setManageTarget(null) }}>
                Réinitialiser mot de passe
              </button>
              <button type="button" className="btn btn-danger" style={{ fontSize: 12.5, padding: '6px 12px' }}
                disabled={manageTarget.id === Number(me?.id)}
                onClick={() => { handleDelete(manageTarget); setManageTarget(null) }}>
                Supprimer le compte
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.gray100}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Nom</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }} className="hide-mobile">Email</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Rôle</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => {
                const isSelf = a.id === Number(me?.id)
                return (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${colors.gray50}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: colors.gray900 }}>
                      {a.full_name}{isSelf && <span style={{ color: colors.gray400, fontWeight: 500 }}> (toi)</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: colors.gray500 }} className="hide-mobile">{a.username}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <RoleSelect
                        value={a.role}
                        disabled={updating === a.id || (isSelf && a.role === 'SUPER_ADMIN')}
                        onChange={role => handleRoleChange(a, role)}
                      />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 10px' }}
                          onClick={() => setResetTarget(a)}>
                          Mot de passe
                        </button>
                        <button type="button" className="btn btn-danger" style={{ fontSize: 11.5, padding: '4px 10px' }}
                          disabled={isSelf}
                          onClick={() => handleDelete(a)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {admins.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: colors.gray400 }}>Aucun admin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          saving={resetSaving}
          onClose={() => setResetTarget(null)}
          onConfirm={handleResetPassword}
        />
      )}
    </div>
  )
}
