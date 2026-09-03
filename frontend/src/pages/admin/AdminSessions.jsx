import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { listSessions, createSession, deleteSession } from '../../api/vote.js'

export default function AdminSessions() {
  const { colors } = theme
  const toast = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ label: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSessions(await listSessions()) } catch { setSessions([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.label.trim()) return
    setSaving(true)
    try {
      await createSession(form)
      toast.success('Élection créée.', 'Vote')
      setForm({ label: '', description: '' })
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e, session) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Supprimer l'élection "${session.label}" et tous ses votes ? Cette action est définitive.`)) return
    try {
      await deleteSession(session.id)
      toast.success('Élection supprimée.', 'Vote')
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Élections</div>
          <div className="page-sub">Organisez des élections comprenant un ou plusieurs votes</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Nouvelle élection</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 40 }}>Aucune élection pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => (
            <Link key={s.id} to={`/admin/sessions/${s.id}`} className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadow.lg; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: colors.greenLight, color: colors.greenDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: colors.gray900 }}>{s.label}</div>
                {s.description && <div style={{ fontSize: 12, color: colors.gray500, marginTop: 3 }}>{s.description}</div>}
              </div>
              <button
                type="button"
                onClick={e => handleDelete(e, s)}
                title="Supprimer l'élection"
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0, border: 'none',
                  background: 'transparent', color: colors.gray300, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.errorBg; e.currentTarget.style.color = colors.errorText }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.gray300 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nouvelle élection</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Libellé *</label>
                <input className="form-control" placeholder="ex : Élections du personnel 2026"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optionnel)</label>
                <textarea className="form-control" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.label.trim()}>
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
