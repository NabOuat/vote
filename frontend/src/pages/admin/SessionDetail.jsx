import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { getSessionDetail, createVote } from '../../api/vote.js'

const EMPTY_FORM = { label: '', roundsCount: 1, tour1Start: '', tour1End: '', tour2Start: '', tour2End: '' }

function RoundsPicker({ value, onChange, colors, radius }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[1, 2].map(n => {
        const selected = value === n
        return (
          <button key={n} type="button" onClick={() => onChange(n)}
            style={{
              padding: '12px 14px', borderRadius: radius.md, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${selected ? colors.green : colors.gray200}`,
              background: selected ? colors.greenLight : colors.white,
            }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: selected ? colors.greenDark : colors.gray800 }}>{n} tour{n > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 11, color: colors.gray500, marginTop: 2 }}>
              {n === 1 ? 'Le plus de voix gagne' : 'Ballottage automatique si besoin'}
            </div>
          </button>
        )
      })}
    </div>
  )
}

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
            <Link key={v.id} to={`/admin/votes/${v.id}`} className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadow.lg; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: colors.orangeLight, color: colors.orangeDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: colors.gray900, flex: 1 }}>{v.label}</span>
              <span className="badge badge-gray">{v.rounds_count} tour{v.rounds_count > 1 ? 's' : ''}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">Nouveau vote</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Libellé *</label>
                <input className="form-control" placeholder="ex : Délégué du personnel"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus required />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre de tours *</label>
                <RoundsPicker value={form.roundsCount} onChange={n => setForm(f => ({ ...f, roundsCount: n }))} colors={colors} radius={theme.radius} />
              </div>

              <div style={{ background: colors.gray50, borderRadius: theme.radius.lg, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: colors.green, color: '#fff',
                    fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>1</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.gray700, textTransform: 'uppercase', letterSpacing: '.03em' }}>Tour 1</span>
                </div>
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
                <div style={{ fontSize: 11, color: colors.gray400 }}>
                  Doit démarrer au moins 5 minutes dans le futur, le temps d'ajouter les candidats.
                </div>
              </div>

              {form.roundsCount === 2 && (
                <div style={{ background: colors.orangeLight, borderRadius: theme.radius.lg, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', background: colors.orange, color: '#fff',
                      fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>2</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.orangeDark, textTransform: 'uppercase', letterSpacing: '.03em' }}>Tour 2</span>
                    <span style={{ fontSize: 11, color: colors.gray500 }}>(déclenché automatiquement)</span>
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
                </div>
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
