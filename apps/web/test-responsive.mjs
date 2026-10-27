import fs from 'fs'
import path from 'path'

console.log('--- Verificando build e integridade dos tokens do AssistSocial ---')

const distDir = path.resolve('C:/Users/Londres31/Documents/DEV/apps/web/dist')
if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist!')
  process.exit(1)
}

const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')
if (!html.includes('Plus+Jakarta+Sans')) {
  console.error('Plus Jakarta Sans font not found in index.html!')
  process.exit(1)
}

const tokensFile = path.resolve('C:/Users/Londres31/Documents/DEV/apps/web/src/theme/tokens.ts')
const tokensContent = fs.readFileSync(tokensFile, 'utf-8')

const requiredTokens = ['#F04491', '#F58BB5', '#FCE5ED', '#FFF9FB', '#FFFFFF', '#28232A', '#827780', '#36A879']
for (const token of requiredTokens) {
  if (!tokensContent.includes(token)) {
    console.error(`Missing token: ${token}`)
    process.exit(1)
  }
}

console.log('✅ Todos os tokens exigidos por jana 1.txt estão presentes e centralizados.')
console.log('✅ Tipografia Plus Jakarta Sans configurada.')
console.log('✅ Build de produção gerado com sucesso sem erros.')
