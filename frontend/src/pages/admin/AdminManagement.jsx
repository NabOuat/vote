import { useState, useEffect, useCallback } from 'react'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useVoteAuth } from '../../context/VoteAuthContext.jsx'
import { listAdmins, updateUserRole, searchUsers } from '../../api/vote.js'

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

export default function AdminManagement() {
  const { colors, radius } = theme
  const toast = useToast()
  const { user: me } = useVoteAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null) // userId en cours de modification

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
                  </tr>
                )
              })}
              {admins.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: colors.gray400 }}>Aucun admin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
