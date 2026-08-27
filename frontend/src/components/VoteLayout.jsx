import { NavLink } from 'react-router-dom'
import { theme } from '../styles/theme.js'
import { useVoteAuth } from '../context/VoteAuthContext.jsx'

export default function VoteLayout({ children }) {
  const { colors } = theme
  const { user, signOut } = useVoteAuth()
  const isAdmin = user?.role === 'ADMIN_VOTE'

  const linkStyle = ({ isActive }) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    color: isActive ? colors.greenDark : colors.gray500,
    background: isActive ? colors.greenLight : 'transparent',
    textDecoration: 'none',
  })

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50 }}>
      <div style={{ background: colors.white, borderBottom: `1px solid ${colors.gray100}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 800, color: colors.green, fontSize: 15 }}>Système de vote</div>
        <nav style={{ display: 'flex', gap: 6 }}>
          {isAdmin ? (
            <NavLink to="/admin" style={linkStyle} end>Sessions</NavLink>
          ) : (
            <NavLink to="/" style={linkStyle} end>Mes votes</NavLink>
          )}
        </nav>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: colors.gray500 }}>{user?.fullName}</span>
        <button onClick={signOut} className="btn btn-secondary btn-sm">Déconnexion</button>
      </div>
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  )
}
