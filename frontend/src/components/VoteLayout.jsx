import { NavLink } from 'react-router-dom'
import { theme } from '../styles/theme.js'
import { useVoteAuth } from '../context/VoteAuthContext.jsx'

function initialsOf(name) {
  const words = (name ?? '').trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

export default function VoteLayout({ children }) {
  const { colors } = theme
  const { user, signOut } = useVoteAuth()
  const isAdmin = user?.role === 'ADMIN_VOTE'

  const linkStyle = ({ isActive }) => ({
    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    color: isActive ? colors.greenDark : colors.gray500,
    background: isActive ? colors.greenLight : 'transparent',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.gray100}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div className="vote-header" style={{
          maxWidth: 1040, margin: '0 auto',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `linear-gradient(135deg, ${colors.green}, ${colors.orange})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.91.37 4.15 1.02" />
              </svg>
            </div>
            <div className="vote-header-title" style={{ fontWeight: 800, color: colors.gray900, fontSize: 14.5, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Système de vote</div>
          </div>

          <nav style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {isAdmin ? (
              <>
                <NavLink to="/admin" style={linkStyle} end>Sessions</NavLink>
                <NavLink to="/admin/voters/list" style={linkStyle} end>Liste</NavLink>
                <NavLink to="/mon-vote" style={linkStyle} end>Mon vote</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" style={linkStyle} end>Mes votes</NavLink>
                <NavLink to="/ma-liste" style={linkStyle} end>Liste</NavLink>
              </>
            )}
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: colors.greenLight, color: colors.greenDark,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {initialsOf(user?.fullName) || '?'}
            </div>
            <span className="vote-header-username" style={{ fontSize: 12.5, color: colors.gray600, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName}
            </span>
            <button onClick={signOut} className="btn btn-secondary btn-sm vote-header-logout">
              <span className="vote-header-logout-text">Déconnexion</span>
              <svg className="vote-header-logout-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'none' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 24px 60px' }}>
        {children}
      </div>
    </div>
  )
}
