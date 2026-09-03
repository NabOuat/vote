import { useState, useEffect, useCallback } from 'react'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { getConnectionStats } from '../../api/vote.js'

const ROLE_LABELS = {
  SUPER_ADMIN: { label: 'Super Admin', badge: 'badge-purple' },
  ADMIN_VOTE:  { label: 'Admin', badge: 'badge-blue' },
  VOTER:       { label: 'Votant', badge: 'badge-gray' },
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminStats() {
  const { colors, radius } = theme
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await getConnectionStats())
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
  if (!stats) return <div style={{ color: colors.gray400, fontSize: 13 }}>Statistiques indisponibles.</div>

  const ratePct = Math.round(stats.rate * 100)

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Statistiques de connexion</div>
          <div className="page-sub">Taux de connexion des votants et historique des connexions</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 11.5, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.03em', fontWeight: 700 }}>Taux de connexion</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: colors.green, marginTop: 6 }}>{ratePct}%</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11.5, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.03em', fontWeight: 700 }}>Connectés</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: colors.gray900, marginTop: 6 }}>{stats.connected}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11.5, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.03em', fontWeight: 700 }}>Votants au total</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: colors.gray900, marginTop: 6 }}>{stats.total}</div>
        </div>
      </div>

      {stats.byCategory.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>Par catégorie</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.byCategory.map(c => {
              const pct = c.total > 0 ? Math.round((c.connected / c.total) * 100) : 0
              return (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: colors.gray700 }}>{c.category}</span>
                    <span style={{ color: colors.gray400 }}>{c.connected} / {c.total} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: colors.gray100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors.green, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, padding: '14px 14px 0' }}>Qui s'est connecté</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 10 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.gray100}` }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }} className="hide-mobile">Email</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Rôle</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase' }}>Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            {stats.users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${colors.gray50}` }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: colors.gray900 }}>{u.full_name}</td>
                <td style={{ padding: '10px 14px', color: colors.gray500 }} className="hide-mobile">{u.username}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span className={`badge ${ROLE_LABELS[u.role]?.badge ?? 'badge-gray'}`}>{ROLE_LABELS[u.role]?.label ?? u.role}</span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: u.last_login_at ? colors.gray700 : colors.gray300 }}>
                  {formatDate(u.last_login_at) ?? 'Jamais connecté'}
                </td>
              </tr>
            ))}
            {stats.users.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: colors.gray400 }}>Aucun compte.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
