import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { theme } from '../styles/theme.js'
import { getCandidateSelf, updateCandidateSelf, candidatePhotoUrl } from '../api/vote.js'

/** Page publique, sans compte : un candidat accède ici via le lien unique que
 * l'admin lui a transmis (protégé par un jeton) pour renseigner lui-même son
 * programme — jamais rédigé à sa place. */
export default function CandidateSelf() {
  const { candidateId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { colors, radius } = theme

  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [program, setProgram] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) { setLoadError('Lien invalide : jeton manquant.'); setLoading(false); return }
    getCandidateSelf(candidateId, token)
      .then(c => { setCandidate(c); setProgram(c.program ?? '') })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [candidateId, token])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateCandidateSelf(candidateId, token, program)
      setSaved(true)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.gray50, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480, background: colors.white, borderRadius: radius.xl, padding: '32px', boxShadow: theme.shadow.xl }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.gray400, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
          Espace candidat
        </div>

        {loading ? (
          <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
        ) : loadError && !candidate ? (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: colors.errorBg, border: `1px solid ${colors.errorBorder}`, fontSize: 13, color: colors.errorText }}>
            {loadError}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <img src={candidatePhotoUrl(candidate.photoPath)} alt={candidate.fullName}
                style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', background: colors.gray100 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.gray900 }}>{candidate.fullName}</div>
                {candidate.poste && <div style={{ fontSize: 12.5, color: colors.gray500, marginTop: 2 }}>{candidate.poste}</div>}
              </div>
            </div>

            {!candidate.editable ? (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: colors.gray50, border: `1px solid ${colors.gray200}`, fontSize: 13, color: colors.gray500 }}>
                Le vote a déjà commencé — le programme ne peut plus être modifié.
                {candidate.program && (
                  <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: colors.gray700 }}>{candidate.program}</div>
                )}
              </div>
            ) : saved ? (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: colors.greenLight, border: `1px solid ${colors.successBorder}`, fontSize: 13, color: colors.greenDark, fontWeight: 600 }}>
                ✓ Votre programme a été enregistré. Vous pouvez revenir modifier ce texte tant que le vote n'a pas commencé.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Votre programme (visible par les électeurs)</label>
                  <textarea className="form-control" rows={7} value={program} onChange={e => setProgram(e.target.value)}
                    placeholder="Présentez-vous et exposez vos priorités si vous êtes élu(e)…" />
                </div>
                {loadError && (
                  <div style={{ fontSize: 12, color: colors.errorText }}>{loadError}</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer mon programme'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
