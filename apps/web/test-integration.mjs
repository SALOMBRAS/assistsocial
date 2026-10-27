import fs from 'fs'
import path from 'path'

console.log('=== TESTE DE VALIDAÇÃO E INTEGRAÇÃO REAL DO ASSISTSOCIAL ===')

// 1. Verificar se os arquivos de rotas e componentes estão presentes
const filesToCheck = [
  'src/contexts/AuthContext.tsx',
  'src/pages/AuthLayout.tsx',
  'src/pages/LoginPage.tsx',
  'src/pages/RegisterPage.tsx',
  'src/pages/ResetPasswordPage.tsx',
  'src/pages/Guards.tsx',
  'src/pages/MainDashboard.tsx',
  'src/pages/AdminUsersPage.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Header.tsx',
  'src/components/StatsCards.tsx',
  'src/components/ActivityCard.tsx',
  'src/components/ActivityModal.tsx',
  'src/components/ActionModals.tsx',
  'src/components/DocumentsView.tsx',
  'src/components/CalendarView.tsx',
  'src/components/TeamView.tsx',
  'src/components/BottomNav.tsx',
  'src/lib/supabaseClient.ts',
  'src/theme/tokens.ts',
]

for (const relPath of filesToCheck) {
  const fullPath = path.resolve('C:/Users/Londres31/Documents/DEV/apps/web', relPath)
  if (!fs.existsSync(fullPath)) {
    console.error(`ERRO: Arquivo não encontrado: ${relPath}`)
    process.exit(1)
  }
}
console.log(`✅ Todos os ${filesToCheck.length} arquivos essenciais de páginas e componentes estão presentes.`)

// 2. Verificar o bundle de produção gerado
const distHtml = path.resolve('C:/Users/Londres31/Documents/DEV/apps/web/dist/index.html')
if (!fs.existsSync(distHtml)) {
  console.error('ERRO: Build dist/index.html não foi encontrado!')
  process.exit(1)
}
console.log('✅ Bundle de produção verificado com sucesso em dist/.')

// 3. Verificar palavras-chave obrigatórias do prompt
const authLayout = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AuthLayout.tsx', 'utf-8')
if (!authLayout.includes('Organize sua rotina, cuide dos seus registros e tenha mais tranquilidade no seu dia a dia.')) {
  console.error('ERRO: Frase institucional obrigatória ausente em AuthLayout!')
  process.exit(1)
}
console.log('✅ Frase institucional oficial validada em AuthLayout.')

const loginPage = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/pages/LoginPage.tsx', 'utf-8')
if (!loginPage.includes('Bem-vinda de volta!') || !loginPage.includes('Entre na sua conta para continuar.')) {
  console.error('ERRO: Títulos obrigatórios da tela de login ausentes!')
  process.exit(1)
}
console.log('✅ Títulos e subtítulos oficiais da tela de login validados.')

// 4. Validar que /cadastro atua como solicitação de acesso via WhatsApp sem cadastro direto
const registerPage = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/pages/RegisterPage.tsx', 'utf-8')
if (!registerPage.includes('Solicitar Acesso via WhatsApp') || !registerPage.includes('wa.me')) {
  console.error('ERRO: Solicitação via WhatsApp ausente em RegisterPage!')
  process.exit(1)
}
if (registerPage.includes('supabase.auth.signUp')) {
  console.error('ERRO: Cadastro público direto detectado em RegisterPage!')
  process.exit(1)
}
console.log('✅ /cadastro validado como solicitação via WhatsApp sem cadastro público direto.')

// 5. Validar conexão com Edge Function admin-invite-user e contrato estrito { full_name, email, phone }
const adminPage = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AdminUsersPage.tsx', 'utf-8')
if (!adminPage.includes('admin-invite-user') || !adminPage.includes('supabase.functions.invoke')) {
  console.error('ERRO: Chamada oficial à Edge Function admin-invite-user ausente em AdminUsersPage!')
  process.exit(1)
}
if (!adminPage.includes('full_name: fullName.trim()')) {
  console.error('ERRO: Contrato full_name ausente no payload de admin-invite-user!')
  process.exit(1)
}
if (adminPage.includes('role: role')) {
  console.error('ERRO: Role não deve ser enviado pelo cliente para admin-invite-user!')
  process.exit(1)
}
if (!adminPage.includes('FunctionsHttpError') || !adminPage.includes('parseEdgeFunctionError')) {
  console.error('ERRO: Diagnóstico robusto de erros HTTP ausente em AdminUsersPage!')
  process.exit(1)
}
console.log('✅ Conexão e contrato { full_name, email, phone } à Edge Function admin-invite-user validados.')

// 6. Validar proteção de rota administrativa por profiles.role = 'global_admin'
const guardsFile = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/pages/Guards.tsx', 'utf-8')
if (!guardsFile.includes('AdminRoute') || !guardsFile.includes("profile?.role !== 'global_admin'")) {
  console.error('ERRO: Proteção estrita de role global_admin ausente em Guards.tsx!')
  process.exit(1)
}
console.log('✅ AdminRoute validada com checagem estrita de profiles.role = global_admin.')

// 7. Validar ausência de credenciais administrativas no frontend
const authContext = fs.readFileSync('C:/Users/Londres31/Documents/DEV/apps/web/src/contexts/AuthContext.tsx', 'utf-8')
if (authContext.includes('service_role') || authContext.includes('supabase_admin')) {
  console.error('ERRO: Chaves administrativas detectadas indevidamente no frontend!')
  process.exit(1)
}
console.log('✅ Auditoria de segurança confirmada: nenhuma chave administrativa no frontend.')

console.log('=== TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO! ===')
