import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext.jsx'
import { VoteAuthProvider, useVoteAuth } from './context/VoteAuthContext.jsx'
import VoteLayout from './components/VoteLayout.jsx'
import VoteLogin from './pages/VoteLogin.jsx'
import VoterDashboard from './pages/VoterDashboard.jsx'
import CandidateSelf from './pages/CandidateSelf.jsx'
import AdminSessions from './pages/admin/AdminSessions.jsx'
import SessionDetail from './pages/admin/SessionDetail.jsx'
import VoteManage from './pages/admin/VoteManage.jsx'
import VotersImport from './pages/admin/VotersImport.jsx'

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#21A863', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function AuthedApp() {
  const { user } = useVoteAuth()
  const isAdmin = user.role === 'ADMIN_VOTE'

  return (
    <VoteLayout>
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/admin"                     element={<AdminSessions />} />
            <Route path="/admin/voters"               element={<VotersImport />} />
            <Route path="/admin/sessions/:sessionId"  element={<SessionDetail />} />
            <Route path="/admin/votes/:voteId"        element={<VoteManage />} />
            <Route path="*"                           element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<VoterDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </VoteLayout>
  )
}

function Root() {
  const location = useLocation()

  // Espace candidat : lien public protégé par jeton, accessible sans compte.
  if (location.pathname.startsWith('/candidat/')) {
    return (
      <Routes>
        <Route path="/candidat/:candidateId" element={<CandidateSelf />} />
      </Routes>
    )
  }

  return <AuthGate />
}

function AuthGate() {
  const { user, isLoading } = useVoteAuth()
  if (isLoading) return <Spinner />
  if (!user) return <VoteLogin />
  return <AuthedApp />
}

export default function App() {
  return (
    <ToastProvider>
      <VoteAuthProvider>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </VoteAuthProvider>
    </ToastProvider>
  )
}
