const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TESTES DA MIGRAÇÃO 07: FUNÇÕES ANALÍTICAS E INDICADORES COM RLS ===');

// 1. Validação estática da migração SQL
const migrationPath = path.resolve(__dirname, '../migrations/20261027170007_analytics_and_indicators.sql');
assert(fs.existsSync(migrationPath), 'Arquivo de migração 07 deve existir');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

assert(migrationContent.includes('CREATE OR REPLACE FUNCTION public.get_dashboard_analytics'), 'Deve definir get_dashboard_analytics');
assert(migrationContent.includes('SECURITY INVOKER'), 'get_dashboard_analytics deve usar SECURITY INVOKER para respeitar RLS');
assert(migrationContent.includes('CREATE OR REPLACE FUNCTION public.get_admin_system_metrics'), 'Deve definir get_admin_system_metrics');
assert(migrationContent.includes('role IS DISTINCT FROM \'global_admin\''), 'get_admin_system_metrics deve checar role global_admin');
console.log('[PASS] Teste 1: Validação estrutural do arquivo de migração 07 aprovada');

// 2. Simulação da Lógica de Agregação e RLS
class MockAnalyticsDatabase {
  constructor() {
    this.profiles = new Map();
    this.activities = [];
    this.shares = [];
  }

  getDashboardAnalytics(userId, period = 'month', referenceDate = new Date()) {
    if (!userId) throw new Error('AUTH ERROR: Usuário não autenticado');

    // RLS: Filtrar apenas atividades que o usuário possui acesso
    const accessibleActivities = this.activities.filter(act => {
      if (act.owner_id === userId) return true;
      const hasActiveShare = this.shares.some(s =>
        s.resource_type === 'activity' &&
        s.resource_id === act.id &&
        s.invited_user_id === userId &&
        s.status === 'accepted'
      );
      return hasActiveShare;
    });

    const nowTime = referenceDate.getTime();
    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let notCompleted = 0;
    let rescheduled = 0;
    let cancelled = 0;
    const byCategory = {
      atendimento: 0,
      visita_domiciliar: 0,
      elaboracao_relatorio: 0,
      reuniao: 0,
      outros: 0
    };

    for (const act of accessibleActivities) {
      total++;
      if (act.status === 'completed') completed++;
      if (act.status === 'pending') {
        pending++;
        if (new Date(act.starts_at).getTime() < nowTime) {
          overdue++;
        }
      }
      if (act.status === 'not_completed') notCompleted++;
      if (act.status === 'rescheduled') rescheduled++;
      if (act.status === 'cancelled') cancelled++;

      if (byCategory[act.category] !== undefined) {
        byCategory[act.category]++;
      } else {
        byCategory.outros++;
      }
    }

    const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0.0;

    return {
      period,
      total_activities: total,
      completed_activities: completed,
      pending_activities: pending,
      overdue_activities: overdue,
      not_completed_activities: notCompleted,
      rescheduled_activities: rescheduled,
      cancelled_activities: cancelled,
      completion_rate_percent: completionRate,
      by_category: byCategory
    };
  }

  getAdminMetrics(callerId) {
    const caller = this.profiles.get(callerId);
    if (!caller || caller.role !== 'global_admin') {
      throw new Error('FORBIDDEN: apenas administradora global pode consultar métricas do sistema');
    }

    return {
      total_professionals: this.profiles.size,
      total_activities: this.activities.length,
      total_shares: this.shares.filter(s => s.status === 'accepted').length
    };
  }
}

const db = new MockAnalyticsDatabase();
const userA = 'user-a-uuid';
const userB = 'user-b-uuid';
const adminJana = 'admin-jana-uuid';

db.profiles.set(userA, { id: userA, role: 'social_worker' });
db.profiles.set(userB, { id: userB, role: 'social_worker' });
db.profiles.set(adminJana, { id: adminJana, role: 'global_admin' });

// Cria atividades do Usuário A
const now = new Date();
const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

db.activities.push(
  { id: 'act-1', owner_id: userA, title: 'Atendimento 1', category: 'atendimento', status: 'completed', starts_at: pastDate },
  { id: 'act-2', owner_id: userA, title: 'Atendimento 2', category: 'atendimento', status: 'pending', starts_at: pastDate }, // Atrasada!
  { id: 'act-3', owner_id: userA, title: 'Visita 1', category: 'visita_domiciliar', status: 'pending', starts_at: futureDate }
);

// Cria atividades do Usuário B
db.activities.push(
  { id: 'act-4', owner_id: userB, title: 'Relatório B', category: 'elaboracao_relatorio', status: 'completed', starts_at: pastDate }
);

// 3. Teste do Usuário A calculando métricas
const metricsA = db.getDashboardAnalytics(userA, 'month', now);
assert.strictEqual(metricsA.total_activities, 3, 'Usuário A deve ter 3 atividades');
assert.strictEqual(metricsA.completed_activities, 1, '1 concluída');
assert.strictEqual(metricsA.pending_activities, 2, '2 pendentes');
assert.strictEqual(metricsA.overdue_activities, 1, '1 atrasada');
assert.strictEqual(metricsA.by_category.atendimento, 2, '2 atendimentos');
assert.strictEqual(metricsA.by_category.visita_domiciliar, 1, '1 visita');
assert.strictEqual(metricsA.completion_rate_percent, 33.3, 'Taxa de conclusão 33.3%');
console.log('[PASS] Teste 2: Agregação individual e cálculo de atrasos aprovados');

// 4. Teste de Isolamento RLS (Usuário B não vê métricas do Usuário A)
const metricsB = db.getDashboardAnalytics(userB, 'month', now);
assert.strictEqual(metricsB.total_activities, 1, 'Usuário B só deve ver suas próprias atividades');
assert.strictEqual(metricsB.by_category.atendimento, 0, 'Usuário B não deve ver categorias de A');
assert.strictEqual(metricsB.completion_rate_percent, 100.0, 'Taxa de conclusão de B deve ser 100%');
console.log('[PASS] Teste 3: Isolamento RLS entre profissionais validado com sucesso');

// 5. Teste de Chamada não autenticada
assert.throws(() => {
  db.getDashboardAnalytics(null);
}, /AUTH ERROR/, 'Chamada sem autenticação deve ser rejeitada');
console.log('[PASS] Teste 4: Rejeição de chamada não autenticada aprovada');

// 6. Teste de Acesso a Métricas de Administrador
assert.throws(() => {
  db.getAdminMetrics(userA);
}, /FORBIDDEN/, 'Usuário comum não pode acessar métricas de administração global');

const adminMetrics = db.getAdminMetrics(adminJana);
assert.strictEqual(adminMetrics.total_professionals, 3, 'Admin deve ver total agregado');
assert.strictEqual(adminMetrics.total_activities, 4, 'Admin deve ver volume total de atividades');
console.log('[PASS] Teste 5: Controle de acesso a métricas administrativas aprovado');

console.log('Todos os 5 testes da suíte de métricas e indicadores foram APROVADOS com sucesso!');
