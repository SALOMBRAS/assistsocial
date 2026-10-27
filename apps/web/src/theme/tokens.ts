/**
 * AssistSocial Design Tokens
 * Conforme especificado em jana 1.txt:
 * Identidade visual SaaS moderna, delicada, acolhedora e minimalista.
 */

export const colors = {
  primary: '#F04491',         // Rosa principal vibrante
  primaryHover: '#DE3380',    // Hover de botões principais
  primaryActive: '#C42168',   // Pressionado
  secondary: '#F58BB5',       // Rosa secundário para detalhes e bordas suaves
  lightPink: '#FCE5ED',       // Rosa-claro para fundos de badges, tags e seleções
  lightPinkHover: '#FAD5E3',  // Hover em superfícies rosas suaves
  background: '#FFF9FB',      // Fundo geral do app (acolhedor e suave)
  surface: '#FFFFFF',         // Branco para cartões e modais
  surfaceHover: '#FCF8FA',    // Leve hover em cartões
  textPrimary: '#28232A',     // Texto principal escuro com alto contraste
  textSecondary: '#827780',   // Texto secundário legível
  borderSubtle: '#F6E4EC',    // Linhas e divisores sutis
  success: '#36A879',         // Verde de sucesso para status concluído
  successLight: '#EBF7F1',    // Fundo de badge de sucesso
  warning: '#E59B28',         // Aviso / Pendente
  warningLight: '#FEF8EC',    // Fundo de aviso
  info: '#4B7BFF',            // Informativo
  infoLight: '#EDF2FF',       // Fundo informativo
} as const

export const typography = {
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  fontAlt: "'Nunito Sans', sans-serif",
} as const

export const shadows = {
  card: '0 2px 10px rgba(240, 68, 145, 0.04), 0 1px 3px rgba(40, 35, 42, 0.03)',
  cardHover: '0 6px 18px rgba(240, 68, 145, 0.08), 0 2px 6px rgba(40, 35, 42, 0.04)',
  button: '0 4px 14px rgba(240, 68, 145, 0.25)',
  buttonHover: '0 6px 18px rgba(240, 68, 145, 0.35)',
  bottomNav: '0 -4px 20px rgba(240, 68, 145, 0.06)',
} as const

export const borderRadius = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '28px',
  full: '9999px',
} as const
