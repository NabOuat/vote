// @refresh reset
import { createContext, useContext, useState, useCallback } from 'react'
import { theme } from '../styles/theme.js'

const ToastCtx = createContext(null)

/* ── Icônes par type ─────────────────────────────── */
const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

const { colors } = theme
const STYLES = {
  success: { bg: colors.successBg,  border: colors.successBorder, icon: colors.successText, text: colors.successText },
  error:   { bg: colors.errorBg,    border: colors.errorBorder,   icon: colors.errorIcon,   text: colors.errorText },
  warning: { bg: colors.warningBg,  border: colors.warningBorder, icon: colors.warningIcon, text: colors.warningText },
  info:    { bg: colors.infoBg,     border: colors.infoBorder,    icon: colors.infoIcon,    text: colors.infoText },
}

/* ── Composant Toast individuel ─────────────────── */
function ToastItem({ toast, onRemove }) {
  const s = STYLES[toast.type] || STYLES.info
  const { radius, shadow } = theme

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: radius.lg,
      boxShadow: shadow.lg,
      minWidth: 280, maxWidth: 380,
      animation: 'toast-in .25s ease',
    }}>
      {/* Icône */}
      <span style={{ color: s.icon, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>

      {/* Message */}
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontWeight: 700, fontSize: 13, color: s.text, marginBottom: 2 }}>{toast.title}</div>
        )}
        <div style={{ fontSize: 13, color: s.text, lineHeight: 1.4 }}>{toast.message}</div>
      </div>

      {/* Fermer */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: s.icon, opacity: 0.6, padding: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

/* ── Conteneur global ───────────────────────────── */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}

/* ── Provider ───────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  const MAX_TOASTS = 4

  const show = useCallback((message, type = 'success', title = null, duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-(MAX_TOASTS - 1)), { id, message, type, title }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  /* Raccourcis */
  const toast = {
    success: (msg, title) => show(msg, 'success', title),
    error:   (msg, title) => show(msg, 'error',   title),
    warning: (msg, title) => show(msg, 'warning', title),
    info:    (msg, title) => show(msg, 'info',    title),
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
