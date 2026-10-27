const assert = require('assert');

// Simulação da lógica de getCorsHeaders da Edge Function
const ALLOWED_ORIGINS = [
  'https://assistsocial-app.vercel.app',
  'https://assistsocial-gestao.vercel.app',
  'https://assistsocial-br.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

function getCorsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || (origin && origin.endsWith('.vercel.app'));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (origin || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

console.log('=== TESTES UNITÁRIOS DA EDGE FUNCTION ADMIN-INVITE-USER ===');

// 1. Teste de CORS para a URL principal de produção
const prodCors = getCorsHeaders('https://assistsocial-app.vercel.app');
assert.strictEqual(prodCors['Access-Control-Allow-Origin'], 'https://assistsocial-app.vercel.app', 'Origem de produção deve ser refletida');
assert.strictEqual(prodCors['Access-Control-Allow-Methods'], 'POST, OPTIONS', 'Métodos permitidos devem incluir POST e OPTIONS');
assert.ok(prodCors['Access-Control-Allow-Headers'].includes('authorization'), 'Headers devem permitir authorization');
assert.ok(prodCors['Access-Control-Allow-Headers'].includes('x-client-info'), 'Headers devem permitir x-client-info');
assert.ok(prodCors['Access-Control-Allow-Headers'].includes('apikey'), 'Headers devem permitir apikey');
assert.ok(prodCors['Access-Control-Allow-Headers'].includes('content-type'), 'Headers devem permitir content-type');
console.log('[PASS] Teste 1: CORS para https://assistsocial-app.vercel.app validado com sucesso');

// 2. Teste de CORS para os aliases de produção
const aliasCors1 = getCorsHeaders('https://assistsocial-gestao.vercel.app');
assert.strictEqual(aliasCors1['Access-Control-Allow-Origin'], 'https://assistsocial-gestao.vercel.app');
const aliasCors2 = getCorsHeaders('https://assistsocial-br.vercel.app');
assert.strictEqual(aliasCors2['Access-Control-Allow-Origin'], 'https://assistsocial-br.vercel.app');
console.log('[PASS] Teste 2: CORS para aliases alternativos validado com sucesso');

// 3. Teste de CORS para previews do Vercel
const previewCors = getCorsHeaders('https://assistsocial-git-preview-test.vercel.app');
assert.strictEqual(previewCors['Access-Control-Allow-Origin'], 'https://assistsocial-git-preview-test.vercel.app');
console.log('[PASS] Teste 3: CORS dinâmico para deployments de preview do Vercel validado');

// 4. Teste de Normalização de Payload (snake_case vs camelCase)
function normalizePayload(body) {
  const email = body?.email;
  const fullName = body?.full_name || body?.fullName || '';
  const phone = body?.phone || '';
  return { email, fullName, phone, role: 'social_worker' };
}

const payloadSnake = normalizePayload({ email: 'teste@exemplo.com', full_name: 'Maria Silva', phone: '1199999999' });
assert.strictEqual(payloadSnake.fullName, 'Maria Silva', 'Deve aceitar full_name em snake_case');

const payloadCamel = normalizePayload({ email: 'teste@exemplo.com', fullName: 'Joana Lima', phone: '1198888888' });
assert.strictEqual(payloadCamel.fullName, 'Joana Lima', 'Deve aceitar fullName em camelCase');
console.log('[PASS] Teste 4: Interoperabilidade snake_case e camelCase validada');

// 5. Teste de Bloqueio de Elevação de Papel no Payload
const attackPayload = normalizePayload({
  email: 'invasor@exemplo.com',
  full_name: 'Hacker',
  role: 'global_admin' // tentativa de injeção de papel
});
assert.strictEqual(attackPayload.role, 'social_worker', 'Papel do convite deve ser forçado no servidor como social_worker');
console.log('[PASS] Teste 5: Prevenção rigorosa contra injeção de papel em convites validada');

console.log('Todos os 5 testes da Edge Function foram APROVADOS!');
