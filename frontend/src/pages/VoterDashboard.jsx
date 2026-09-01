import { useState, useEffect, useCallback } from 'react'
import { theme } from '../styles/theme.js'
import { useToast } from '../context/ToastContext.jsx'
import { listMyVotes, castBallot, candidatePhotoUrl } from '../api/vote.js'

const STATUS_LABELS = {
  UPCOMING: { label: 'À venir', badge: 'badge-gray' },
  ONGOING:  { label: 'En cours', badge: 'badge-green' },
  CLOSED:   { label: 'Clôturé', badge: 'badge-orange' },
}

function TourResults({ results, colors }) {
  const max = Math.max(1, ...results.map(r => r.votes))
  return (
    <div style={{ width: '100%', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {results.map(r => (
        <div key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: colors.gray700, marginBottom: 3 }}>
            <span>
              <span style={{ fontWeight: 600 }}>{r.full_name}</span>
              {r.poste && <span style={{ color: colors.gray400 }}> · {r.poste}</span>}
            </span>
            <strong>{r.votes} voix</strong>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: colors.gray100, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999, width: `${(r.votes / max) * 100}%`,
              background: `linear-gradient(90deg, ${colors.green}, ${colors.greenDark})`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CandidateCard({ candidate, selected, onSelect, onViewProgram }) {
  const { colors, radius } = theme
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 14px 14px',
        borderRadius: radius.lg, cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${selected ? colors.green : colors.gray200}`,
        background: selected ? colors.greenLight : colors.white,
        boxShadow: selected ? '0 6px 18px rgba(33,168,99,0.2)' : theme.shadow.sm,
        transform: selected ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s',
        position: 'relative',
      }}>
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%',
          background: colors.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(33,168,99,0.4)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
      )}
      <img src={candidatePhotoUrl(candidate.photo_path)} alt={candidate.full_name}
        style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, border: `3px solid ${colors.white}`, boxShadow: theme.shadow.md }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.gray900, lineHeight: 1.35 }}>{candidate.full_name}</div>
        {candidate.poste && <div style={{ fontSize: 10.5, color: colors.gray400, marginTop: 1 }}>{candidate.poste}</div>}
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onViewProgram() }}
        style={{
          fontSize: 11, fontWeight: 600, color: colors.greenDark,
          background: 'rgba(33,168,99,0.1)', border: 'none', borderRadius: 999,
          padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
        </svg>
        Voir le programme
      </button>
    </div>
  )
}

function CandidateDetail({ candidate, selected, onBack, onSelect }) {
  const { colors, radius } = theme
  return (
    <div style={{ animation: 'fadeIn 0.15s ease' }}>
      <button type="button" onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600,
        color: colors.gray500, background: 'none', border: 'none', padding: 0, marginBottom: 16,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Retour à la liste des candidats
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <img src={candidatePhotoUrl(candidate.photo_path)} alt={candidate.full_name}
          style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, border: `3px solid ${colors.white}`, boxShadow: theme.shadow.md, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.gray900 }}>{candidate.full_name}</div>
          <div style={{ fontSize: 12, color: colors.gray400, marginTop: 2 }}>{candidate.poste || 'Candidat'}</div>
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

      <button
        type="button"
        onClick={onSelect}
        className={selected ? 'btn btn-primary' : 'btn btn-secondary'}
        style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
        {selected ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            Candidat sélectionné
          </>
        ) : 'Choisir ce candidat'}
      </button>
    </div>
  )
}

export default function VoterDashboard() {
  const { colors, radius } = theme
  const toast = useToast()
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [ballotModal, setBallotModal] = useState(null) // { tourId, candidates }
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [viewingCandidate, setViewingCandidate] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVotes(await listMyVotes())
    } catch {
      setVotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openBallot(tour) {
    setSelectedCandidate(null)
    setViewingCandidate(null)
    setBallotModal(tour)
  }

  function closeBallot() {
    setBallotModal(null)
    setViewingCandidate(null)
  }

  async function submitBallot() {
    if (!selectedCandidate) return
    setSaving(true)
    try {
      await castBallot(ballotModal.tourId, selectedCandidate)
      toast.success('Votre vote a été enregistré.', 'Merci !')
      closeBallot()
      await load()
    } catch (err) {
      toast.error(err.message ?? 'Erreur lors du vote.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        {[1, 2].map(i => (
          <div key={i} className="card" style={{ height: 92 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.gray900, margin: 0, letterSpacing: '-0.01em' }}>Mes votes</h1>
        <p style={{ fontSize: 13, color: colors.gray500, margin: '4px 0 0' }}>Les élections auxquelles vous participez</p>
      </div>

      {votes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 48 }}>
          Aucun vote pour l'instant.
        </div>
      )}

      {votes.map(vote => (
        <div key={vote.voteId} className="card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{vote.sessionLabel}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: colors.gray900, marginTop: 3, marginBottom: 16 }}>{vote.label}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vote.tours.map(tour => {
              const st = STATUS_LABELS[tour.status] ?? { label: tour.status, badge: 'badge-gray' }
              const isOngoing = tour.status === 'ONGOING'
              return (
                <div key={tour.tourId} style={{
                  padding: '14px 16px', borderRadius: radius.lg,
                  background: isOngoing ? colors.greenLight : colors.gray50,
                  border: `1px solid ${isOngoing ? 'rgba(33,168,99,0.25)' : colors.gray100}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: colors.gray800 }}>Candidats</span>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                    <span style={{ fontSize: 11.5, color: colors.gray400 }}>{tour.candidates.length} candidat{tour.candidates.length > 1 ? 's' : ''}</span>
                    <div style={{ flex: 1 }} />
                    {isOngoing && !tour.hasVoted && (
                      <button className="btn btn-primary btn-sm" onClick={() => openBallot(tour)}>Voter maintenant</button>
                    )}
                    {isOngoing && tour.hasVoted && (
                      <span style={{ fontSize: 12.5, color: colors.greenDark, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        Vous avez voté
                      </span>
                    )}
                  </div>
                  {tour.results && <TourResults results={tour.results} colors={colors} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {ballotModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && closeBallot()}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div className="modal-title">
                {viewingCandidate ? 'Programme du candidat' : 'Choisissez un candidat'}
              </div>
              <button className="modal-close" onClick={closeBallot} disabled={saving}>×</button>
            </div>

            {viewingCandidate ? (
              <CandidateDetail
                candidate={viewingCandidate}
                selected={selectedCandidate === viewingCandidate.id}
                onBack={() => setViewingCandidate(null)}
                onSelect={() => { setSelectedCandidate(viewingCandidate.id); setViewingCandidate(null) }}
              />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                  {ballotModal.candidates.map(c => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={selectedCandidate === c.id}
                      onSelect={() => setSelectedCandidate(c.id)}
                      onViewProgram={() => setViewingCandidate(c)}
                    />
                  ))}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeBallot} disabled={saving}>Annuler</button>
                  <button className="btn btn-primary" onClick={submitBallot} disabled={!selectedCandidate || saving}>
                    {saving ? 'Envoi…' : 'Confirmer mon vote'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
