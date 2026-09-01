import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { theme } from '../styles/theme.js'
import { useVoteAuth } from '../context/VoteAuthContext.jsx'
import { candidatePhotoUrl } from '../api/vote.js'

function initialsOf(name) {
  const words = (name ?? '').trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

function Avatar({ user, size, colors }) {
  const photo = candidatePhotoUrl(user?.photoPath)
  if (photo) {
    return <img src={photo} alt={user.fullName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors.greenLight, color: colors.greenDark,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {initialsOf(user?.fullName) || '?'}
    </div>
  )
}

export default function VoteLayout({ children }) {
  const { colors, radius } = theme
  const { user, signOut } = useVoteAuth()
  const isAdmin = user?.role === 'ADMIN_VOTE'
  const [profileOpen, setProfileOpen] = useState(false)

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
                <NavLink to="/mon-vote" style={linkStyle} end>Mon vote</NavLink>
              </>
            ) : (
              <NavLink to="/" style={linkStyle} end>Mes votes</NavLink>
            )}
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setProfileOpen(o => !o)}
              onBlur={() => setTimeout(() => setProfileOpen(false), 150)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', padding: '4px 6px', borderRadius: 10,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <Avatar user={user} size={28} colors={colors} />
              <span className="vote-header-username" style={{ fontSize: 12.5, color: colors.gray600, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.gray400} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 260, zIndex: 30,
                background: colors.white, border: `1px solid ${colors.gray200}`, borderRadius: radius.lg,
                boxShadow: theme.shadow.lg, overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}>
                <div style={{
                  padding: '22px 18px 16px', textAlign: 'center',
                  background: `linear-gradient(180deg, ${colors.greenLight} 0%, ${colors.white} 100%)`,
                }}>
                  <div style={{ display: 'inline-flex', padding: 3, borderRadius: '50%', background: colors.white, boxShadow: theme.shadow.sm }}>
                    <Avatar user={user} size={60} colors={colors} />
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.gray900, marginTop: 10 }}>{user?.fullName}</div>
                  {user?.poste && <div style={{ fontSize: 12, color: colors.gray500, marginTop: 1 }}>{user.poste}</div>}
                  <span className={`badge ${isAdmin ? 'badge-purple' : 'badge-green'}`} style={{ marginTop: 8 }}>
                    {isAdmin ? 'Administrateur' : 'Votant'}
                  </span>
                </div>

                {user?.mobilePhone && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                    borderTop: `1px solid ${colors.gray100}`, fontSize: 12.5, color: colors.gray600,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gray400} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    {user.mobilePhone}
                  </div>
                )}

                <div style={{ padding: 14, borderTop: `1px solid ${colors.gray100}` }}>
                  <button
                    type="button"
                    onClick={signOut}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 24px 60px' }}>
        {children}
      </div>
    </div>
  )
}
