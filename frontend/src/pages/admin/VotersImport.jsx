import { useState } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { importVoters } from '../../api/vote.js'

/** Format attendu, une ligne par votant : identifiant;nom complet;mot de passe */
function parseCsv(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [username, fullName, password] = line.split(';').map(s => s?.trim())
    return { username, fullName, password }
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
          <div className="page-sub">Un votant par ligne : identifiant;nom complet;mot de passe</div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            className="form-control"
            rows={10}
            placeholder={'jdupont;Jean Dupont;MotDePasse123\nmmartin;Marie Martin;MotDePasse456'}
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
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Résultat de l'import</div>
          {report.created.length > 0 && (
            <div style={{ fontSize: 12, color: colors.greenDark, marginBottom: 8 }}>
              ✓ {report.created.length} compte(s) créé(s) : {report.created.map(c => c.username).join(', ')}
            </div>
          )}
          {report.errors.length > 0 && (
            <div style={{ fontSize: 12, color: colors.errorText }}>
              {report.errors.map((e, i) => <div key={i}>✗ {e.username ?? '?'} — {e.message}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
