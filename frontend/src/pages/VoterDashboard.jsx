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
            <span style={{ fontWeight: 600 }}>{r.full_name}</span>
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

export default function VoterDashboard() {
  const { colors, radius } = theme
  const toast = useToast()
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [ballotModal, setBallotModal] = useState(null) // { tourId, candidates }
  const [selectedCandidate, setSelectedCandidate] = useState(null)
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
    setBallotModal(tour)
  }

  async function submitBallot() {
    if (!selectedCandidate) return
    setSaving(true)
    try {
      await castBallot(ballotModal.tourId, selectedCandidate)
      toast.success('Votre vote a été enregistré.', 'Merci !')
      setBallotModal(null)
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
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: colors.gray800 }}>Tour {tour.tourNumber}</span>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setBallotModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Tour {ballotModal.tourNumber} — choisissez un candidat</div>
              <button className="modal-close" onClick={() => setBallotModal(null)} disabled={saving}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}>
              {ballotModal.candidates.map(c => {
                const selected = selectedCandidate === c.id
                return (
                  <button key={c.id} type="button" onClick={() => setSelectedCandidate(c.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '16px 12px',
                      borderRadius: radius.lg, cursor: 'pointer', fontFamily: 'inherit',
                      border: `2px solid ${selected ? colors.green : colors.gray200}`,
                      background: selected ? colors.greenLight : colors.white,
                      boxShadow: selected ? '0 4px 14px rgba(33,168,99,0.18)' : 'none',
                      transform: selected ? 'translateY(-1px)' : 'none',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}>
                    {selected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%',
                        background: colors.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                    )}
                    <img src={candidatePhotoUrl(c.photo_path)} alt={c.full_name}
                      style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', background: colors.gray100, border: `2px solid ${colors.white}`, boxShadow: theme.shadow.sm }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.gray900, textAlign: 'center', lineHeight: 1.3 }}>{c.full_name}</span>
                    {c.program && <span style={{ fontSize: 11, color: colors.gray500, textAlign: 'center' }}>{c.program}</span>}
                  </button>
                )
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBallotModal(null)} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" onClick={submitBallot} disabled={!selectedCandidate || saving}>
                {saving ? 'Envoi…' : 'Confirmer mon vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
