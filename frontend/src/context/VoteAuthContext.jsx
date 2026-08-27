import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { voteLogin, voteLogout } from '../api/vote.js'
import { voteTokenStore } from '../api/voteClient.js'

const VoteAuthContext = createContext(null)

const initial = { user: null, isLoading: true }

function reducer(state, action) {
  switch (action.type) {
    case 'LOADED':    return { user: action.user, isLoading: false }
    case 'SIGNED_IN': return { user: action.user, isLoading: false }
    case 'SIGNED_OUT':return { user: null, isLoading: false }
    default:          return state
  }
}

export function VoteAuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  useEffect(() => {
    const token = voteTokenStore.get()
    const stored = localStorage.getItem('vote_user')
    const user = token && stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
    dispatch({ type: 'LOADED', user })
  }, [])

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('vote_user')
      dispatch({ type: 'SIGNED_OUT' })
    }
    window.addEventListener('vote:session-expired', handler)
    return () => window.removeEventListener('vote:session-expired', handler)
  }, [])

  const signIn = useCallback(async (username, password) => {
    const data = await voteLogin({ username, password })
    const profile = { role: data.role, fullName: data.fullName }
    localStorage.setItem('vote_user', JSON.stringify(profile))
    dispatch({ type: 'SIGNED_IN', user: profile })
    return profile
  }, [])

  const signOut = useCallback(() => {
    voteLogout()
    localStorage.removeItem('vote_user')
    dispatch({ type: 'SIGNED_OUT' })
  }, [])

  return (
    <VoteAuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </VoteAuthContext.Provider>
  )
}

export function useVoteAuth() {
  const ctx = useContext(VoteAuthContext)
  if (!ctx) throw new Error('useVoteAuth doit être utilisé à l\'intérieur de <VoteAuthProvider>')
  return ctx
}
