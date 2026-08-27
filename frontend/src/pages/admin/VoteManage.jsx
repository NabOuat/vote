import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { getVoteDetail, getVoteResultsAdmin, createCandidate, deleteCandidate, publishTourResults, candidatePhotoUrl, candidateSelfLink } from '../../api/vote.js'

export default function VoteManage() {
  const { voteId } = useParams()
  const { colors, radius } = theme
  const toast = useToast()
  const [vote, setVote] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [candidateModal, setCandidateModal] = useState(null) // tourId
  const [form, setForm] = useState({ fullName: '', program: '', photo: null })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [v, r] = await Promise.all([getVoteDetail(voteId), getVoteResultsAdmin(voteId)])
      setVote(v)
      setResults(r)
    } catch {
      setVote(null)
    } finally {
      setLoading(false)
    }
  }, [voteId])

  useEffect(() => { load() }, [load])

  async function handleAddCandidate(e) {
    e.preventDefault()
    if (!form.fullName.trim() || !form.photo) return
    setSaving(true)
    try {
      await createCandidate(candidateModal, form)
      toast.success('Candidat ajouté.', 'Vote')
      setForm({ fullName: '', program: '', photo: null })
      setCandidateModal(null)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyLink(candidate) {
    const link = candidateSelfLink(candidate.id, candidate.edit_token)
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Lien copié — à transmettre au candidat.', 'Vote')
    } catch {
      toast.warning(link, 'Copie impossible — lien affiché')
    }
  }

  async function handleDeleteCandidate(id) {
    try {
      await deleteCandidate(id)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    }
  }

  async function handlePublish(tourId) {
    try {
      await publishTourResults(tourId)
      toast.success('Résultats du tour publiés.', 'Vote')
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    }
  }

  if (loading) return <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
  if (!vote) return <div style={{ color: colors.gray400, fontSize: 13 }}>Vote introuvable.</div>

  const resultsByTour = new Map((results?.results ?? []).map(r => [r.tourId, r]))

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <Link to={`/admin/sessions/${vote.session_id}`} style={{ fontSize: 12, color: colors.gray400 }}>← Session</Link>
          <div className="page-title" style={{ marginTop: 4 }}>{vote.label}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vote.tours.map(tour => {
          const tourResult = resultsByTour.get(tour.id)
          return (
          <div key={tour.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Tour {tour.tour_number}</div>
              <span className="badge badge-gray">{tour.status}</span>
              <span style={{ fontSize: 11, color: colors.gray400 }}>
                {new Date(tour.starts_at).toLocaleString('fr-FR')} → {new Date(tour.ends_at).toLocaleString('fr-FR')}
              </span>
              <div style={{ flex: 1 }} />
              {tour.status === 'UPCOMING' && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ fullName: '', program: '', photo: null }); setCandidateModal(tour.id) }}>
                  + Candidat
                </button>
              )}
              {tour.status === 'CLOSED' && !tourResult?.publishedAt && (
                <button className="btn btn-primary btn-sm" onClick={() => handlePublish(tour.id)}>Publier les résultats</button>
              )}
              {tour.status === 'CLOSED' && tourResult?.publishedAt && (
                <span className="badge badge-green">Résultats publiés</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {tour.candidates.map(c => {
                const votes = tourResult?.ranking?.find(r => r.id === c.id)?.votes
                return (
                  <div key={c.id} style={{ padding: 10, borderRadius: radius.md, border: `1px solid ${colors.gray100}`, textAlign: 'center', position: 'relative' }}>
                    {tour.status === 'UPCOMING' && (
                      <button onClick={() => handleDeleteCandidate(c.id)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', border: 'none', background: colors.errorBg, color: colors.errorText, cursor: 'pointer', fontSize: 12 }}>×</button>
                    )}
                    <img src={candidatePhotoUrl(c.photo_path)} alt={c.full_name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', background: colors.gray100 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{c.full_name}</div>
                    {votes != null && <div style={{ fontSize: 11, color: colors.gray500 }}>{votes} voix</div>}
                    {tour.status === 'UPCOMING' && (
                      <>
                        <div style={{ fontSize: 10, color: c.program ? colors.greenDark : colors.gray400, marginTop: 4 }}>
                          {c.program ? '✓ Programme reçu' : 'Programme en attente'}
                        </div>
                        <button type="button" onClick={() => handleCopyLink(c)}
                          style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: colors.green, background: 'none', border: `1px solid ${colors.gray200}`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Copier le lien candidat
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              {tour.candidates.length === 0 && <div style={{ fontSize: 12, color: colors.gray400 }}>Aucun candidat.</div>}
            </div>
          </div>
          )
        })}
      </div>

      {candidateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCandidateModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Ajouter un candidat</div>
              <button className="modal-close" onClick={() => setCandidateModal(null)}>×</button>
            </div>
            <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-control" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Programme (optionnel)</label>
                <textarea className="form-control" rows={2} value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Photo * (jpeg, png, webp — 4 Mo max)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setForm(f => ({ ...f, photo: e.target.files?.[0] ?? null }))} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCandidateModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.fullName.trim() || !form.photo}>
                  {saving ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
