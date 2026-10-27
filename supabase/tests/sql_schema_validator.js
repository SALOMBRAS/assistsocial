const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, '../migrations');
const files = fs.readdirSync(migrationsDir).sort();

console.log('--- Verificando Arquivos de Migração ---');
console.log('Arquivos encontrados:', files);

let allSql = '';
for (const file of files) {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    allSql += '\n' + content;
  }
}

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

// 4. Checa status permitidos em activities
const statusValues = ['pending', 'in_progress', 'completed', 'not_completed', 'rescheduled', 'cancelled'];
for (const s of statusValues) {
  if (!allSql.includes(`'${s}'`)) {
    errors.push(`Status ausente na constraint de activities: ${s}`);
  }
}

// 5. Checa ciclo de pastas
if (!allSql.includes('check_folder_hierarchy_cycle')) {
  errors.push('Função de validação de ciclo de pastas ausente');
}

// 6. Checa proteção contra alteração de owner_id
if (!allSql.includes('protect_resource_ownership')) {
  errors.push('Trigger de proteção de propriedade ausente');
}

// 7. Checa criação do bucket documents
if (!allSql.includes("'documents'")) {
  errors.push("Referência ao bucket 'documents' ausente");
}

// 8. Checa reconhecimento do papel global_admin e índice único de exclusividade
if (!allSql.includes("'global_admin'")) {
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

if (errors.length > 0) {
  console.error('Erros de validação SQL encontrados:', errors);
  process.exit(1);
} else {
  console.log('[PASS] Todas as 7 tabelas, constraints, RLS, triggers, storage, bootstrap e Edge Function validados com sucesso!');
}
