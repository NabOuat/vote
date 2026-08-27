export const theme = {
  colors: {
    // Brand
    green:         '#21A863',
    greenDark:     '#1a8f54',
    greenLight:    '#e6f5ee',
    orange:        '#f38030',
    orangeDark:    '#d06520',
    orangeLight:   '#fef3eb',

    // Semantic leave types
    leaveGreen:    '#21A863',
    leaveBlue:     '#3b82f6',
    leaveBlueLight:'#dbeafe',
    leavePurple:   '#7c3aed',
    leavePurpleLight: '#f3e8ff',
    leaveGray:     '#9ca3af',

    // Status
    successText:   '#16a34a',
    successBg:     '#f0fdf4',
    successBorder: '#86efac',
    warningText:   '#92400e',
    warningBg:     '#fffbeb',
    warningBorder: '#fcd34d',
    warningIcon:   '#d97706',
    errorText:     '#b91c1c',
    errorBg:       '#fef2f2',
    errorBorder:   '#fca5a5',
    errorIcon:     '#dc2626',
    infoText:      '#1d4ed8',
    infoBg:        '#eff6ff',
    infoBorder:    '#93c5fd',
    infoIcon:      '#2563eb',
    neutralText:   '#4b5563',
    neutralBg:     '#e5e7eb',
    purpleText:    '#7c3aed',
    purpleBg:      '#f3e8ff',

    // Grays
    gray50:  '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    white:   '#ffffff',

    // Overlays
    overlay:    'rgba(0,0,0,0.4)',
    overlayLight: 'rgba(0,0,0,0.06)',

    // Social login providers
    google:    '#4285F4',
    microsoft: '#0078D4',
    linkedin:  '#0A66C2',
  },

  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '14px',
    lg:  '20px',
    xl:  '28px',
    xxl: '40px',
  },

  radius: {
    sm:    '6px',
    md:    '8px',
    lg:    '10px',
    xl:    '14px',
    round: '50%',
    pill:  '20px',
  },

  shadow: {
    sm:  '0 1px 2px rgba(0,0,0,0.06)',
    md:  '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    lg:  '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    xl:  '0 20px 60px rgba(0,0,0,0.15)',
    modal: '0 4px 12px rgba(0,0,0,0.2)',
  },

  font: {
    family: "'Inter', sans-serif",
    sizeXs:  '10px',
    sizeSm:  '11px',
    sizeMd:  '13px',
    sizeBase:'14px',
    sizeLg:  '16px',
    sizeXl:  '18px',
    size2xl: '22px',
    size3xl: '26px',
    size4xl: '32px',
    weightNormal:  '400',
    weightMedium:  '500',
    weightSemibold:'600',
    weightBold:    '700',
    weightExtrabold:'800',
  },

  sidebar: {
    width: '240px',
  },

  // Doit rester synchronisé avec le seuil @media (max-width: 768px) de src/index.css
  // (les media queries CSS ne peuvent pas lire les valeurs JS).
  breakpoints: {
    sm: 480,
    md: 768,
    lg: 1024,
  },
}

/** Map theme tokens to CSS custom property names (without --) */
export const cssVars = {
  '--color-green':          theme.colors.green,
  '--color-green-dark':     theme.colors.greenDark,
  '--color-green-light':    theme.colors.greenLight,
  '--color-orange':         theme.colors.orange,
  '--color-orange-dark':    theme.colors.orangeDark,
  '--color-orange-light':   theme.colors.orangeLight,

  '--color-leave-green':    theme.colors.leaveGreen,
  '--color-leave-blue':     theme.colors.leaveBlue,
  '--color-leave-blue-light': theme.colors.leaveBlueLight,
  '--color-leave-purple':   theme.colors.leavePurple,
  '--color-leave-purple-light': theme.colors.leavePurpleLight,
  '--color-leave-gray':     theme.colors.leaveGray,

  '--color-success-text':   theme.colors.successText,
  '--color-success-bg':     theme.colors.successBg,
  '--color-success-border': theme.colors.successBorder,
  '--color-warning-text':   theme.colors.warningText,
  '--color-warning-bg':     theme.colors.warningBg,
  '--color-warning-border': theme.colors.warningBorder,
  '--color-warning-icon':   theme.colors.warningIcon,
  '--color-error-text':     theme.colors.errorText,
  '--color-error-bg':       theme.colors.errorBg,
  '--color-error-border':   theme.colors.errorBorder,
  '--color-error-icon':     theme.colors.errorIcon,
  '--color-info-text':      theme.colors.infoText,
  '--color-info-bg':        theme.colors.infoBg,
  '--color-info-border':    theme.colors.infoBorder,
  '--color-info-icon':      theme.colors.infoIcon,
  '--color-neutral-text':   theme.colors.neutralText,
  '--color-neutral-bg':     theme.colors.neutralBg,
  '--color-purple-text':    theme.colors.purpleText,
  '--color-purple-bg':      theme.colors.purpleBg,

  '--color-gray-50':        theme.colors.gray50,
  '--color-gray-100':       theme.colors.gray100,
  '--color-gray-200':       theme.colors.gray200,
  '--color-gray-300':       theme.colors.gray300,
  '--color-gray-400':       theme.colors.gray400,
  '--color-gray-500':       theme.colors.gray500,
  '--color-gray-600':       theme.colors.gray600,
  '--color-gray-700':       theme.colors.gray700,
  '--color-gray-800':       theme.colors.gray800,
  '--color-gray-900':       theme.colors.gray900,
  '--color-white':          theme.colors.white,

  '--color-overlay':        theme.colors.overlay,

  '--radius-sm':   theme.radius.sm,
  '--radius-md':   theme.radius.md,
  '--radius-lg':   theme.radius.lg,
  '--radius-xl':   theme.radius.xl,
  '--radius-pill': theme.radius.pill,

  '--shadow-sm':  theme.shadow.sm,
  '--shadow-md':  theme.shadow.md,
  '--shadow-lg':  theme.shadow.lg,
  '--shadow-xl':  theme.shadow.xl,

  '--font-family': theme.font.family,
  '--sidebar-w':   theme.sidebar.width,
}

/** Call once at app init to inject all tokens as CSS variables on :root */
export function injectTheme() {
  const root = document.documentElement
  Object.entries(cssVars).forEach(([prop, val]) => root.style.setProperty(prop, val))
}
