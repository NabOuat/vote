import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { getSessionDetail, createVote } from '../../api/vote.js'

const EMPTY_FORM = { label: '', roundsCount: 1, tour1Start: '', tour1End: '', tour2Start: '', tour2End: '' }

export default function SessionDetail() {
  const { sessionId } = useParams()
  const { colors } = theme
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSession(await getSessionDetail(sessionId)) } catch { setSession(null) } finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.label.trim() || !form.tour1Start || !form.tour1End) return
    if (form.roundsCount === 2 && (!form.tour2Start || !form.tour2End)) return
    setSaving(true)
    try {
      await createVote(sessionId, {
        label: form.label.trim(),
        roundsCount: form.roundsCount,
        tour1: { startsAt: new Date(form.tour1Start).toISOString(), endsAt: new Date(form.tour1End).toISOString() },
        ...(form.roundsCount === 2 ? { tour2: { startsAt: new Date(form.tour2Start).toISOString(), endsAt: new Date(form.tour2End).toISOString() } } : {}),
      })
      toast.success('Vote créé.', 'Vote')
      setForm(EMPTY_FORM)
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
  if (!session) return <div style={{ color: colors.gray400, fontSize: 13 }}>Session introuvable.</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <Link to="/admin" style={{ fontSize: 12, color: colors.gray400 }}>← Sessions</Link>
          <div className="page-title" style={{ marginTop: 4 }}>{session.label}</div>
          {session.description && <div className="page-sub">{session.description}</div>}
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Nouveau vote</button>
      </div>

      {session.votes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 40 }}>Aucun vote dans cette session.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {session.votes.map(v => (
            <Link key={v.id} to={`/admin/votes/${v.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{v.label}</span>
              <span style={{ fontSize: 12, color: colors.gray400 }}>{v.rounds_count} tour{v.rounds_count > 1 ? 's' : ''}</span>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Nouveau vote</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Libellé *</label>
                <input className="form-control" placeholder="ex : Délégué du personnel"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de tours *</label>
                <select className="form-control" value={form.roundsCount}
                  onChange={e => setForm(f => ({ ...f, roundsCount: Number(e.target.value) }))}>
                  <option value={1}>1 tour</option>
                  <option value={2}>2 tours</option>
                </select>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tour 1</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Début *</label>
                  <input type="datetime-local" className="form-control" value={form.tour1Start}
                    onChange={e => setForm(f => ({ ...f, tour1Start: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fin *</label>
                  <input type="datetime-local" className="form-control" value={form.tour1End}
                    onChange={e => setForm(f => ({ ...f, tour1End: e.target.value }))} required />
                </div>
              </div>

              {form.roundsCount === 2 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Tour 2 <span style={{ fontWeight: 400, textTransform: 'none', color: colors.gray400 }}>(déclenché automatiquement)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Début *</label>
                      <input type="datetime-local" className="form-control" value={form.tour2Start}
                        onChange={e => setForm(f => ({ ...f, tour2Start: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fin *</label>
                      <input type="datetime-local" className="form-control" value={form.tour2End}
                        onChange={e => setForm(f => ({ ...f, tour2End: e.target.value }))} required />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Création…' : 'Créer le vote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
