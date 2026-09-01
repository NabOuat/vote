import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useVoteAuth } from '../../context/VoteAuthContext.jsx'
import { listVoters, listMyVoters } from '../../api/vote.js'

const CATEGORY_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'Cadre', label: 'Cadre' },
  { value: 'Agent', label: 'Agent' },
]

const PAGE_SIZE = 25

function Pagination({ page, pageCount, onChange, colors }) {
  if (pageCount <= 1) return null
  const pages = []
  const add = (n) => { if (!pages.includes(n) && n >= 1 && n <= pageCount) pages.push(n) }
  add(1); add(page - 1); add(page); add(page + 1); add(pageCount)
  const sorted = [...new Set(pages)].sort((a, b) => a - b)

  const btnStyle = (active) => ({
    minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8,
    border: `1px solid ${active ? colors.green : colors.gray200}`,
    background: active ? colors.green : colors.white,
    color: active ? colors.white : colors.gray600,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} style={{ ...btnStyle(false), opacity: page === 1 ? 0.4 : 1 }}>
        ‹
      </button>
      {sorted.map((n, i) => (
        <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && sorted[i - 1] !== n - 1 && <span style={{ color: colors.gray300, fontSize: 12 }}>…</span>}
          <button type="button" onClick={() => onChange(n)} style={btnStyle(n === page)}>{n}</button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount} style={{ ...btnStyle(false), opacity: page === pageCount ? 0.4 : 1 }}>
        ›
      </button>
    </div>
  )
}

export default function VotersList() {
  const { colors } = theme
  const toast = useToast()
  const { user } = useVoteAuth()
  const isAdmin = user?.role === 'ADMIN_VOTE'
  const [voters, setVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // L'admin voit tous les votants (avec filtre catégorie) ; le votant
      // ne voit que les votants de sa propre catégorie (son collège).
      const data = isAdmin ? await listVoters(filter || undefined) : await listMyVoters()
      setVoters(data)
    } catch (err) {
      toast.error(err.message ?? 'Erreur.', 'Erreur')
      setVoters([])
    } finally {
      setLoading(false)
    }
  }, [filter, isAdmin])

  useEffect(() => { load() }, [load])

  const filtered = voters.filter(v => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (v.full_name ?? '').toLowerCase().includes(q)
      || (v.username ?? '').toLowerCase().includes(q)
  })

  useEffect(() => { setPage(1) }, [filter, search, isAdmin])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const counts = {
    total: voters.length,
    Cadre: voters.filter(v => v.category === 'Cadre').length,
    Agent: voters.filter(v => v.category === 'Agent').length,
  }

  const title = isAdmin ? 'Liste des votants' : 'Liste'

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{counts.total} compte{counts.total > 1 ? 's' : ''}{isAdmin && ` · ${counts.Cadre} Cadre · ${counts.Agent} Agent`}</div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/voters" className="btn btn-secondary">Importer des votants</Link>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            {CATEGORY_FILTERS.map(c => {
              const selected = filter === c.value
              return (
                <button key={c.value} type="button" onClick={() => setFilter(c.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${selected ? colors.green : colors.gray200}`,
                    background: selected ? colors.greenLight : colors.white,
                    color: selected ? colors.greenDark : colors.gray500,
                  }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
        <input
          className="form-control"
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
          placeholder="Rechercher (nom, email, poste)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ color: colors.gray400, fontSize: 13 }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: colors.gray400, padding: 40 }}>
          Aucun votant trouvé.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.gray100}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Nom complet</th>
                {isAdmin && <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }} className="hide-mobile">Email</th>}
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Catégorie</th>
                {isAdmin && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: colors.gray700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Statut</th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v, i) => (
                <tr key={v.id} style={{
                  borderBottom: i < pageItems.length - 1 ? `1px solid ${colors.gray50}` : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = colors.gray50 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: colors.gray900 }}>{v.full_name}</td>
                  {isAdmin && <td style={{ padding: '10px 14px', color: colors.gray500 }} className="hide-mobile">{v.username}</td>}
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {v.category ? (
                      <span className="badge badge-gray">{v.category}</span>
                    ) : (
                      <span style={{ color: colors.gray300, fontSize: 12 }}>—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {v.active ? (
                        <span className="badge badge-green">Actif</span>
                      ) : (
                        <span className="badge badge-orange">Inactif</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: colors.gray400, marginTop: 10 }}>
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </div>
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} colors={colors} />
        </>
      )}
    </div>
  )
}
