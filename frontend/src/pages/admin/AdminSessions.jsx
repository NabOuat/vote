import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { listSessions, createSession } from '../../api/vote.js'

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
      toast.success('Session créée.', 'Vote')
      setForm({ label: '', description: '' })
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Sessions de vote</div>
          <div className="page-sub">Organisez des élections comprenant un ou plusieurs votes</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/admin/voters" className="btn btn-secondary">Importer des votants</Link>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Nouvelle session</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 40 }}>Aucune session pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => (
            <Link key={s.id} to={`/admin/sessions/${s.id}`} className="card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: colors.gray900 }}>{s.label}</div>
              {s.description && <div style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{s.description}</div>}
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nouvelle session de vote</div>
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
