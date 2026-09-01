import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { getVoteDetail, getVoteResultsAdmin, createCandidate, deleteCandidate, updateCandidateInfo, deleteVote, publishTourResults, candidatePhotoUrl, candidateSelfLink, searchUsers } from '../../api/vote.js'

const STATUS = {
  UPCOMING: { label: 'À venir', badge: 'badge-gray' },
  ONGOING:  { label: 'En cours', badge: 'badge-green' },
  CLOSED:   { label: 'Clôturé', badge: 'badge-orange' },
}

function ResultsBars({ ranking, onView, colors }) {
  const max = Math.max(1, ...ranking.map(r => r.votes))
  const total = ranking.reduce((s, r) => s + r.votes, 0)
  const winnerVotes = ranking[0]?.votes ?? 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
      {ranking.map((r, i) => {
        const isWinner = r.votes === winnerVotes && winnerVotes > 0
        return (
          <div key={r.id} onClick={() => onView(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: isWinner ? colors.orange : colors.gray100,
              color: isWinner ? '#fff' : colors.gray500,
              fontSize: 10.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{i + 1}</span>
            <img src={candidatePhotoUrl(r.photo_path)} alt={r.full_name}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 700, color: colors.gray800 }}>{r.full_name}</span>
                  {r.poste && <span style={{ color: colors.gray400, fontWeight: 500 }}> · {r.poste}</span>}
                </span>
                <span style={{ color: colors.gray500, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                  {r.votes} voix{total > 0 && ` · ${Math.round((r.votes / total) * 100)}%`}
                </span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: colors.gray100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999, width: `${(r.votes / max) * 100}%`,
                  background: isWinner ? `linear-gradient(90deg, ${colors.orange}, ${colors.orangeDark})` : `linear-gradient(90deg, ${colors.green}, ${colors.greenDark})`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CandidateAdminCard({ candidate, votes, canEdit, onDelete, onCopyLink, onEditProgram, onView, colors, radius }) {
  return (
    <div
      onClick={onView}
      style={{
        padding: '14px 12px 12px', borderRadius: radius.lg, textAlign: 'center', position: 'relative',
        border: `1px solid ${colors.gray100}`, background: colors.white,
        transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadow.md; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
      {canEdit && (
        <button onClick={e => { e.stopPropagation(); onDelete() }} title="Supprimer ce candidat"
          style={{
            position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', border: 'none',
            background: colors.errorBg, color: colors.errorText, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
      )}
      <img src={candidatePhotoUrl(candidate.photo_path)} alt={candidate.full_name}
        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, boxShadow: theme.shadow.sm }} />
      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, color: colors.gray900 }}>{candidate.full_name}</div>
      {candidate.poste && <div style={{ fontSize: 11, color: colors.gray400, marginTop: 1 }}>{candidate.poste}</div>}
      {votes != null && <div style={{ fontSize: 11.5, color: colors.gray500, marginTop: 2 }}>{votes} voix</div>}
      {canEdit && (
        <>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, marginTop: 6,
            color: candidate.program ? colors.greenDark : colors.gray400,
          }}>
            {candidate.program ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            )}
            {candidate.program ? 'Programme reçu' : 'Programme en attente'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={e => { e.stopPropagation(); onEditProgram() }}
              style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: colors.gray700, background: colors.gray100, border: 'none', borderRadius: 20, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Poste / programme
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); onCopyLink() }} title="Copier le lien candidat"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.green,
                background: 'none', border: `1px solid ${colors.gray200}`, borderRadius: 20, padding: '4px 9px', cursor: 'pointer',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Détail d'un candidat en lecture seule — ouvert en cliquant sur sa carte
 * (grille admin ou barre de résultats), même contenu que ce qu'un votant
 * verrait via "Voir le programme". */
function CandidateDetailModal({ candidate, votes, onClose, colors, radius }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Fiche candidat</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <img src={candidatePhotoUrl(candidate.photo_path)} alt={candidate.full_name}
            style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, border: `3px solid ${colors.white}`, boxShadow: theme.shadow.md, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.gray900 }}>{candidate.full_name}</div>
            <div style={{ fontSize: 12, color: colors.gray400, marginTop: 2 }}>{candidate.poste || 'Candidat'}</div>
            {votes != null && <div style={{ fontSize: 12, color: colors.greenDark, fontWeight: 700, marginTop: 3 }}>{votes} voix</div>}
          </div>
        </div>
        <div style={{
          background: colors.gray50, border: `1px solid ${colors.gray100}`, borderRadius: radius.lg,
          padding: '16px 18px', fontSize: 13.5, color: colors.gray700, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          minHeight: 80,
        }}>
          {candidate.program?.trim() ? candidate.program : (
            <span style={{ color: colors.gray400, fontStyle: 'italic' }}>Ce candidat n'a pas encore renseigné de programme.</span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Recherche parmi les employés déjà importés (comptes existants) pour
 * pré-remplir nom + poste au lieu de ressaisir à la main — reste modifiable
 * ensuite si le candidat n'est pas trouvé dans la liste. */
function EmployeePicker({ value, onChange, colors, radius }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) { setResults([]); return }
    const id = setTimeout(async () => {
      try { setResults(await searchUsers(q)) } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(id)
  }, [value])

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-control"
        value={value}
        onChange={e => { onChange({ fullName: e.target.value }); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher un employé…"
        autoFocus
        required
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
          background: colors.white, border: `1px solid ${colors.gray200}`, borderRadius: radius.md,
          boxShadow: theme.shadow.lg, maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map(u => (
            <button key={u.id} type="button"
              onMouseDown={() => {
                onChange({ fullName: u.full_name, poste: u.poste ?? '', photoUrl: u.photo_path ?? '', photo: null })
                setOpen(false)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {u.photo_path
                ? <img src={u.photo_path} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.gray100, flexShrink: 0 }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray800 }}>{u.full_name}</div>
                {u.poste && <div style={{ fontSize: 11, color: colors.gray400 }}>{u.poste}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VoteManage() {
  const { voteId } = useParams()
  const navigate = useNavigate()
  const { colors, radius } = theme
  const toast = useToast()
  const [vote, setVote] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [candidateModal, setCandidateModal] = useState(null) // tourId
  const [form, setForm] = useState({ fullName: '', poste: '', program: '', photo: null, photoUrl: '' })
  const [saving, setSaving] = useState(false)
  const [programModal, setProgramModal] = useState(null) // candidate
  const [programText, setProgramText] = useState('')
  const [posteText, setPosteText] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)
  const [viewCandidate, setViewCandidate] = useState(null) // { candidate, votes }

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
    if (!form.fullName.trim() || (!form.photo && !form.photoUrl)) return
    setSaving(true)
    try {
      await createCandidate(candidateModal, form)
      toast.success('Candidat ajouté.', 'Vote')
      setForm({ fullName: '', poste: '', program: '', photo: null, photoUrl: '' })
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

  function openProgramModal(candidate) {
    setProgramText(candidate.program ?? '')
    setPosteText(candidate.poste ?? '')
    setProgramModal(candidate)
  }

  async function handleSaveProgram(e) {
    e.preventDefault()
    setSavingProgram(true)
    try {
      await updateCandidateInfo(programModal.id, { program: programText, poste: posteText })
      toast.success('Informations enregistrées.', 'Vote')
      setProgramModal(null)
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSavingProgram(false)
    }
  }

  async function handleDeleteVote() {
    if (!window.confirm(`Supprimer le vote "${vote.label}" et tous ses tours/candidats ? Cette action est définitive.`)) return
    try {
      await deleteVote(vote.id)
      toast.success('Vote supprimé.', 'Vote')
      navigate(`/admin/sessions/${vote.session_id}`)
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
        <button className="btn btn-secondary btn-sm" onClick={handleDeleteVote} style={{ color: colors.errorText }}>
          Supprimer ce vote
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {vote.tours.map(tour => {
          const tourResult = resultsByTour.get(tour.id)
          const st = STATUS[tour.status] ?? { label: tour.status, badge: 'badge-gray' }
          const ranking = [...(tourResult?.ranking ?? [])].sort((a, b) => b.votes - a.votes)
          return (
          <div key={tour.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: colors.gray900 }}>Tour {tour.tour_number}</div>
              <span className={`badge ${st.badge}`}>{st.label}</span>
              <span style={{ fontSize: 11.5, color: colors.gray400 }}>
                {new Date(tour.starts_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(tour.ends_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <div style={{ flex: 1 }} />
              {tour.status === 'UPCOMING' && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ fullName: '', poste: '', program: '', photo: null, photoUrl: '' }); setCandidateModal(tour.id) }}>
                  + Candidat
                </button>
              )}
              {tour.status !== 'UPCOMING' && (
                <span style={{ fontSize: 11.5, color: colors.gray400, fontStyle: 'italic' }}>
                  Candidats verrouillés — le tour est {tour.status === 'ONGOING' ? 'ouvert' : 'clôturé'}
                </span>
              )}
              {tour.status === 'CLOSED' && !tourResult?.publishedAt && (
                <button className="btn btn-primary btn-sm" onClick={() => handlePublish(tour.id)}>Publier les résultats</button>
              )}
              {tour.status === 'CLOSED' && tourResult?.publishedAt && (
                <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  Résultats publiés
                </span>
              )}
            </div>

            {tour.status === 'CLOSED' && ranking.length > 0 ? (
              <ResultsBars ranking={ranking} onView={r => setViewCandidate({ candidate: r, votes: r.votes })} colors={colors} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {tour.candidates.map(c => (
                  <CandidateAdminCard
                    key={c.id}
                    candidate={c}
                    votes={ranking.find(r => r.id === c.id)?.votes}
                    canEdit={tour.status === 'UPCOMING'}
                    onDelete={() => handleDeleteCandidate(c.id)}
                    onCopyLink={() => handleCopyLink(c)}
                    onEditProgram={() => openProgramModal(c)}
                    onView={() => setViewCandidate({ candidate: c, votes: ranking.find(r => r.id === c.id)?.votes })}
                    colors={colors}
                    radius={radius}
                  />
                ))}
                {tour.candidates.length === 0 && (
                  <div style={{ fontSize: 12.5, color: colors.gray400, gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                    Aucun candidat pour l'instant.
                  </div>
                )}
              </div>
            )}
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
                <EmployeePicker
                  value={form.fullName}
                  onChange={patch => setForm(f => ({ ...f, ...patch }))}
                  colors={colors}
                  radius={radius}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Poste (optionnel)</label>
                <input className="form-control" placeholder="ex : Comptable" value={form.poste} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Programme (optionnel)</label>
                <textarea className="form-control" rows={2} value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Photo {!form.photoUrl && '*'} (jpeg, png, webp — 4 Mo max)</label>
                {form.photoUrl && !form.photo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={form.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: 12, color: colors.greenDark, fontWeight: 600 }}>Récupérée depuis Microsoft</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, photoUrl: '' }))}
                      style={{ fontSize: 11.5, color: colors.gray500, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                      Changer
                    </button>
                  </div>
                ) : (
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setForm(f => ({ ...f, photo: e.target.files?.[0] ?? null, photoUrl: e.target.files?.[0] ? '' : f.photoUrl }))} required={!form.photoUrl} />
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCandidateModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.fullName.trim() || (!form.photo && !form.photoUrl)}>
                  {saving ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {programModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !savingProgram && setProgramModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">{programModal.full_name}</div>
              <button className="modal-close" onClick={() => setProgramModal(null)} disabled={savingProgram}>×</button>
            </div>
            <form onSubmit={handleSaveProgram} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={candidatePhotoUrl(programModal.photo_path)} alt={programModal.full_name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, flexShrink: 0 }} />
                <div style={{ fontSize: 11.5, color: colors.gray500 }}>
                  Le candidat peut aussi le saisir lui-même via son lien personnel — cette saisie écrase la sienne.
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Poste</label>
                <input className="form-control" placeholder="ex : Comptable" value={posteText} onChange={e => setPosteText(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Programme</label>
                <textarea className="form-control" rows={6} value={programText} onChange={e => setProgramText(e.target.value)}
                  placeholder="Présentation et priorités du candidat…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProgramModal(null)} disabled={savingProgram}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingProgram}>
                  {savingProgram ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewCandidate && (
        <CandidateDetailModal
          candidate={viewCandidate.candidate}
          votes={viewCandidate.votes}
          onClose={() => setViewCandidate(null)}
          colors={colors}
          radius={radius}
        />
      )}
    </div>
  )
}
