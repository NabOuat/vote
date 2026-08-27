import { useState, useEffect, useCallback } from 'react'
import { theme } from '../styles/theme.js'
import { useToast } from '../context/ToastContext.jsx'
import { listMyVotes, castBallot, candidatePhotoUrl } from '../api/vote.js'

const STATUS_LABELS = {
  UPCOMING: { label: 'À venir', badge: 'badge-gray' },
  ONGOING:  { label: 'En cours', badge: 'badge-green' },
  CLOSED:   { label: 'Clôturé', badge: 'badge-orange' },
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

  if (loading) return <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      {votes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 40 }}>
          Aucun vote pour l'instant.
        </div>
      )}

      {votes.map(vote => (
        <div key={vote.voteId} className="card">
          <div style={{ fontSize: 11, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>{vote.sessionLabel}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.gray900, marginTop: 2, marginBottom: 14 }}>{vote.label}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vote.tours.map(tour => {
              const st = STATUS_LABELS[tour.status] ?? { label: tour.status, badge: 'badge-gray' }
              return (
                <div key={tour.tourId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: radius.md, background: colors.gray50, border: `1px solid ${colors.gray100}`, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: colors.gray700 }}>Tour {tour.tourNumber}</span>
                  <span className={`badge ${st.badge}`}>{st.label}</span>
                  <span style={{ fontSize: 11, color: colors.gray400 }}>{tour.candidates.length} candidat{tour.candidates.length > 1 ? 's' : ''}</span>
                  <div style={{ flex: 1 }} />
                  {tour.status === 'ONGOING' && !tour.hasVoted && (
                    <button className="btn btn-primary btn-sm" onClick={() => openBallot(tour)}>Voter</button>
                  )}
                  {tour.status === 'ONGOING' && tour.hasVoted && (
                    <span style={{ fontSize: 12, color: colors.greenDark, fontWeight: 600 }}>✓ Vous avez voté</span>
                  )}
                  {tour.results && (
                    <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tour.results.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.gray600 }}>
                          <span>{r.full_name}</span>
                          <strong>{r.votes} voix</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {ballotModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setBallotModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Tour {ballotModal.tourNumber} — choisissez un candidat</div>
              <button className="modal-close" onClick={() => setBallotModal(null)} disabled={saving}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {ballotModal.candidates.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedCandidate(c.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12,
                    borderRadius: radius.md, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${selectedCandidate === c.id ? colors.green : colors.gray200}`,
                    background: selectedCandidate === c.id ? colors.greenLight : colors.white,
                  }}>
                  <img src={candidatePhotoUrl(c.photo_path)} alt={c.full_name}
                    style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', background: colors.gray100 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.gray900, textAlign: 'center' }}>{c.full_name}</span>
                  {c.program && <span style={{ fontSize: 11, color: colors.gray500, textAlign: 'center' }}>{c.program}</span>}
                </button>
              ))}
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
