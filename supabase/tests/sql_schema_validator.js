/**
 * Validador estático do Schema SQL e Migrações
 * Executa sem dependências externas via Node.js
 */

const fs = require('fs');
const path = require('path');

console.log('--- Verificando Arquivos de Migração ---');

const migrationsDir = path.resolve(__dirname, '../migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log('Arquivos encontrados:', migrationFiles);

const allSql = migrationFiles.map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n');

const requiredTables = [
  'profiles',
  'activities',
  'folders',
  'documents',
  'resource_shares',
  'comments',
  'audit_logs'
];

let errors = [];

// 1. Checa tabelas
for (const table of requiredTables) {
  const regex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}`, 'i');
  if (!regex.test(allSql)) {
    errors.push(`Tabela ausente: public.${table}`);
  }
}

// 2. Checa RLS habilitado
for (const table of requiredTables) {
  const regex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i');
  if (!regex.test(allSql)) {
    errors.push(`RLS não habilitado para: public.${table}`);
  }
}

// 3. Checa campos essenciais de activities
const activityFields = ['id', 'owner_id', 'title', 'description', 'starts_at', 'ends_at', 'status', 'category', 'created_at', 'updated_at'];
for (const field of activityFields) {
  const regex = new RegExp(`\\b${field}\\b`, 'i');
  if (!regex.test(allSql)) {
    errors.push(`Campo ausente em activities: ${field}`);
  }
}

// 4. Checa campos essenciais de resource_shares
const shareFields = ['id', 'owner_id', 'resource_type', 'resource_id', 'invited_email', 'permission', 'status', 'expires_at', 'revoked_at'];
for (const field of shareFields) {
  const regex = new RegExp(`\\b${field}\\b`, 'i');
  if (!regex.test(allSql)) {
    errors.push(`Campo ausente em resource_shares: ${field}`);
  }
}

// 5. Checa trigger anti-ciclo de pastas
if (!allSql.includes('trg_check_folder_cycle')) {
  errors.push("Trigger anti-ciclo de pastas ausente (trg_check_folder_cycle)");
}

// 6. Checa trigger de auditoria forense
if (!allSql.includes('trg_audit_activities')) {
  errors.push("Trigger de auditoria forense em activities ausente (trg_audit_activities)");
}

// 7. Checa bucket de documents
if (!allSql.includes("'documents'")) {
  errors.push("Criação do bucket 'documents' ausente");
}

// 8. Checa regras de global_admin
if (!allSql.includes('global_admin')) {
  errors.push("Papel 'global_admin' ausente no esquema de profiles");
}
if (!allSql.includes('idx_single_global_admin')) {
  errors.push("Índice de unicidade de global_admin ausente (idx_single_global_admin)");
}

// 9. Checa trigger contra auto-elevação de papel
if (!allSql.includes('prevent_profile_role_escalation')) {
  errors.push("Trigger contra auto-elevação de papel ausente (prevent_profile_role_escalation)");
}

// 10. Checa existência do script de bootstrap
const bootstrapPath = path.resolve(__dirname, '../bootstrap_global_admin.sql');
if (!fs.existsSync(bootstrapPath)) {
  errors.push("Script de bootstrap ausente (supabase/bootstrap_global_admin.sql)");
}

// 11. Checa existência da Edge Function admin-invite-user
const edgeFunctionPath = path.resolve(__dirname, '../functions/admin-invite-user/index.ts');
if (!fs.existsSync(edgeFunctionPath)) {
  errors.push("Edge Function admin-invite-user ausente (supabase/functions/admin-invite-user/index.ts)");
}

// 12. Checa funções analíticas seguras
if (!allSql.includes('get_dashboard_analytics')) {
  errors.push("Função analítica get_dashboard_analytics ausente");
}
if (!allSql.includes('get_admin_system_metrics')) {
  errors.push("Função analítica get_admin_system_metrics ausente");
}

if (errors.length > 0) {
  console.error('Erros de validação SQL encontrados:', errors);
  process.exit(1);
} else {
  console.log('[PASS] Todas as 7 tabelas, constraints, RLS, triggers, storage, bootstrap, Edge Function e funções analíticas validados com sucesso!');
}
