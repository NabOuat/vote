import { useState } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { importVoters } from '../../api/vote.js'

/** Format attendu, une ligne par votant : identifiant;nom complet;mot de passe;poste (le poste est optionnel) */
function parseCsv(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [username, fullName, password, poste] = line.split(';').map(s => s?.trim())
    return { username, fullName, password, poste: poste || undefined }
  })
}

export default function VotersImport() {
  const { colors } = theme
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState(null)

  async function handleImport(e) {
    e.preventDefault()
    const voters = parseCsv(raw)
    if (voters.length === 0) {
      toast.warning('Aucun votant valide détecté.', 'Import')
      return
    }
    setSaving(true)
    try {
      const res = await importVoters(voters)
      setReport(res)
      toast.success(`${res.created.length} compte(s) créé(s).`, 'Import')
      if (res.errors.length === 0) setRaw('')
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <Link to="/admin" style={{ fontSize: 12, color: colors.gray400 }}>← Sessions</Link>
          <div className="page-title" style={{ marginTop: 4 }}>Importer des votants</div>
          <div className="page-sub">Un votant par ligne : identifiant;nom complet;mot de passe;poste (poste optionnel)</div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            className="form-control"
            rows={10}
            placeholder={'jdupont;Jean Dupont;MotDePasse123;Comptable\nmmartin;Marie Martin;MotDePasse456;Chef de projet'}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || !raw.trim()}>
              {saving ? 'Import…' : 'Importer'}
            </button>
          </div>
        </form>
      </div>

      {report && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>Résultat de l'import</div>
          {report.created.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: colors.greenDark,
              background: colors.greenLight, borderRadius: 10, padding: '10px 12px', marginBottom: report.errors.length ? 8 : 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6L9 17l-5-5" /></svg>
              <span><strong>{report.created.length}</strong> compte(s) créé(s) : {report.created.map(c => c.username).join(', ')}</span>
            </div>
          )}
          {report.errors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {report.errors.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: colors.errorText,
                  background: colors.errorBg, borderRadius: 10, padding: '8px 12px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <span><strong>{e.username ?? '?'}</strong> — {e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
