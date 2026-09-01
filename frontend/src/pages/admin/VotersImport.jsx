import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { read, utils } from 'xlsx'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { importVoters, clearVoters } from '../../api/vote.js'

/** Format attendu, une ligne par votant : identifiant;nom complet;mot de passe;poste (le poste est optionnel) */
function parseCsv(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [username, fullName, password, poste] = line.split(';').map(s => s?.trim())
    return { username, fullName, password, poste: poste || undefined }
  })
}

/** Colonnes attendues (insensibles à la casse) : Username, Role, Fullname,
 * Category, Password (en clair, obligatoire — c'est le mot de passe de
 * connexion du votant). Mêmes règles que scripts/import-employees.mjs. */
function parseXlsxRow(row) {
  const normalized = {}
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase()] = String(value ?? '').trim()
  }
  return {
    username: normalized.username ?? '',
    role: normalized.role ?? '',
    fullName: normalized.fullname ?? '',
    category: normalized.category ?? '',
    password: normalized.password ?? '',
  }
}

async function parseXlsxFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return utils.sheet_to_json(sheet, { defval: '' }).map(parseXlsxRow)
}

const XLSX_ROLES = new Set(['VOTER', 'ADMIN_VOTE'])
const XLSX_CATEGORIES = new Set(['Cadre', 'Agent'])

/** Une ligne Excel est valide si elle a tout ce qu'exige le backend (voir
 * adminRouter.post('/voters/import')) — vérif côté client pour prévisualiser
 * avant envoi, le serveur revalide de toute façon. */
function xlsxRowError(row) {
  if (!row.username) return 'username manquant.'
  if (!row.username.endsWith('@afor.ci')) return 'username doit se terminer par @afor.ci.'
  if (!row.fullName) return 'fullname manquant.'
  if (row.role && !XLSX_ROLES.has(row.role)) return 'role doit être VOTER ou ADMIN_VOTE.'
  if (row.category && !XLSX_CATEGORIES.has(row.category)) return 'category doit être Cadre ou Agent.'
  if (!row.password) return 'password manquant.'
  return null
}

export default function VotersImport() {
  const { colors } = theme
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState(null)

  const fileInputRef = useRef(null)
  const [xlsxFileName, setXlsxFileName] = useState('')
  const [xlsxRows, setXlsxRows] = useState([])
  const [xlsxError, setXlsxError] = useState('')
  const [xlsxSaving, setXlsxSaving] = useState(false)

  const [clearing, setClearing] = useState(false)

  async function handleClearVoters() {
    if (!window.confirm(
      "Vider la base des votants ? TOUS les comptes VOTER seront supprimés définitivement, " +
      "y compris ceux ayant déjà voté (leurs preuves de vote seront effacées). " +
      'Les comptes ADMIN_VOTE (admin_vote) sont conservés. Cette action est irréversible.'
    )) return
    setClearing(true)
    try {
      const res = await clearVoters()
      toast.success(`${res.deleted} compte(s) supprimé(s).`, 'Votants')
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setClearing(false)
    }
  }

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

  async function handleXlsxFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setXlsxError('')
    setXlsxRows([])
    setXlsxFileName(file.name)
    try {
      const rows = await parseXlsxFile(file)
      if (rows.length === 0) {
        setXlsxError('Le fichier ne contient aucune ligne.')
        return
      }
      setXlsxRows(rows)
    } catch (err) {
      setXlsxError(err.message ?? 'Fichier illisible.')
    }
  }

  const xlsxValidRows = xlsxRows.filter(r => !xlsxRowError(r))
  const xlsxInvalidCount = xlsxRows.length - xlsxValidRows.length

  async function handleXlsxImport() {
    if (xlsxValidRows.length === 0) return
    setXlsxSaving(true)
    try {
      const res = await importVoters(xlsxValidRows)
      setReport(res)
      toast.success(`${res.created.length} compte(s) créé(s).`, 'Import Excel')
      if (res.errors.length === 0) {
        setXlsxRows([])
        setXlsxFileName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
    } finally {
      setXlsxSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <Link to="/admin" style={{ fontSize: 12, color: colors.gray400 }}>← Sessions</Link>
          <div className="page-title" style={{ marginTop: 4 }}>Importer des votants</div>
          <div className="page-sub">Depuis un fichier Excel, ou en collant une liste ligne par ligne</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Depuis un fichier Excel (.xlsx)</div>
        <div style={{ fontSize: 12.5, color: colors.gray400, marginBottom: 12 }}>
          Colonnes attendues : <strong>Username</strong> (email, doit finir par @afor.ci), <strong>Role</strong> (VOTER ou ADMIN_VOTE), <strong>Fullname</strong>, <strong>Category</strong> (Cadre ou Agent), <strong>Password</strong> (en clair, obligatoire — c'est ce mot de passe que le votant utilisera pour se connecter).
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleXlsxFile}
          style={{ fontSize: 13 }}
        />

        {xlsxError && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10,
            fontSize: 12.5, color: colors.errorText, background: colors.errorBg,
          }}>
            {xlsxError}
          </div>
        )}

        {xlsxRows.length > 0 && (
          <>
            <div style={{ marginTop: 14, fontSize: 12.5, color: colors.gray400 }}>
              <strong>{xlsxFileName}</strong> — {xlsxRows.length} ligne(s) lue(s),{' '}
              <span style={{ color: colors.greenDark, fontWeight: 600 }}>{xlsxValidRows.length} valide(s)</span>
              {xlsxInvalidCount > 0 && (
                <> · <span style={{ color: colors.errorText, fontWeight: 600 }}>{xlsxInvalidCount} invalide(s)</span></>
              )}
            </div>

            <div style={{ marginTop: 8, maxHeight: 260, overflow: 'auto', border: `1px solid ${colors.gray200}`, borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: colors.gray50, textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Username</th>
                    <th style={{ padding: '6px 10px' }}>Role</th>
                    <th style={{ padding: '6px 10px' }}>Fullname</th>
                    <th style={{ padding: '6px 10px' }}>Category</th>
                    <th style={{ padding: '6px 10px' }}>Password</th>
                    <th style={{ padding: '6px 10px' }} />
                  </tr>
                </thead>
                <tbody>
                  {xlsxRows.map((row, i) => {
                    const err = xlsxRowError(row)
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${colors.gray200}` }}>
                        <td style={{ padding: '6px 10px' }}>{row.username || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{row.role || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{row.fullName || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{row.category || '—'}</td>
                        <td style={{ padding: '6px 10px', color: colors.gray400 }}>
                          {row.password ? '••••••' : '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: err ? colors.errorText : colors.greenDark, fontSize: 11.5 }}>
                          {err ?? 'OK'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={xlsxSaving || xlsxValidRows.length === 0}
                onClick={handleXlsxImport}
              >
                {xlsxSaving ? 'Import…' : `Importer ${xlsxValidRows.length} votant(s)`}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Ou en collant une liste</div>
        <div className="page-sub" style={{ marginBottom: 12 }}>Un votant par ligne : identifiant;nom complet;mot de passe;poste (poste optionnel)</div>
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

      <div className="card" style={{ marginTop: 16, border: `1px solid ${colors.errorBorder}` }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4, color: colors.errorText }}>Zone dangereuse</div>
        <div style={{ fontSize: 12.5, color: colors.gray400, marginBottom: 12 }}>
          Supprime tous les comptes votants (role VOTER) n'ayant jamais voté — utile pour repartir d'une base propre avant un nouvel import.
          Les comptes ADMIN_VOTE et les votants ayant déjà déposé un bulletin sont toujours conservés.
        </div>
        <button
          type="button"
          className="btn"
          disabled={clearing}
          onClick={handleClearVoters}
          style={{ background: colors.errorBg, color: colors.errorText, border: `1px solid ${colors.errorBorder}` }}
        >
          {clearing ? 'Suppression…' : 'Vider la base des votants'}
        </button>
      </div>
    </div>
  )
}
