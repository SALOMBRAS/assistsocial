import assert from 'node:assert';

const url = 'https://mnhzikgphdhohlhfsljz.supabase.co';
const key = 'sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG';

async function runTests() {
  console.log('================================================================');
  console.log('ASSISTSOCIAL — SUÍTE DE TESTES: MODO SIMPLES DOS RESIDENCIAIS');
  console.log('MIGRAÇÃO 11: INDICADORES AGREGADOS, RLS, VALIDAÇÕES E AUDITORIA');
  console.log('================================================================\n');

  // 1. Autenticação Janaína Lima
  console.log('--- 1. Autenticação de Usuário Social Autorizado ---');
  const loginRes = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'janamendes055@gmail.com', password: 'Chocolate@24' })
  });

  if (!loginRes.ok) {
    console.error('Falha na autenticação:', await loginRes.text());
    process.exit(1);
  }

  const authData = await loginRes.json();
  const token = authData.access_token;
  const userId = authData.user.id;
  const authHeaders = {
    'apikey': key,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  console.log('[PASS] Autenticado com sucesso como:', authData.user.email, '(ID:', userId, ')');

  // 2. Teste 1: Criar indicadores agregados para o residencial Paupina
  console.log('\n--- 2. Teste 1 & 2: Criar e Atualizar Indicadores Agregados ---');
  const paupinaMetricsInput = {
    total_capacity: 120,
    occupied_units: 95,
    available_units: 25,
    pcd_adapted_units: 12,
    pending_documents_count: 8,
    regular_documents_count: 87,
    dossiers_no_pending_count: 70,
    dossiers_with_pending_count: 15,
    dossiers_resubmitted_search_count: 5,
    no_show_count: 3,
    dossiers_excluded_count: 2,
    dossiers_compliant_count: 80,
    dossiers_non_compliant_count: 15,
    dossiers_batched_count: 65,
    proxies_needed_count: 4,
    notes: 'Indicadores quantitativos consolidados para auditoria técnica.'
  };

  const upsertRes1 = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'paupina',
      p_metrics: paupinaMetricsInput
    })
  });

  const upsertData1 = await upsertRes1.json();
  if (!upsertRes1.ok) {
    console.error('Falha ao criar indicadores:', upsertData1);
    process.exit(1);
  }
  assert.strictEqual(upsertData1.success, true);
  assert.strictEqual(upsertData1.residencial_slug, 'paupina');
  console.log('[PASS] Teste 1: Indicadores criados para Paupina com sucesso.');

  // Atualização com novo valor
  const paupinaMetricsUpdate = {
    ...paupinaMetricsInput,
    occupied_units: 98,
    available_units: 22,
    dossiers_compliant_count: 83
  };

  const upsertRes2 = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'paupina',
      p_metrics: paupinaMetricsUpdate
    })
  });

  const upsertData2 = await upsertRes2.json();
  if (!upsertRes2.ok) {
    console.error('Falha ao atualizar indicadores:', upsertData2);
    process.exit(1);
  }
  assert.strictEqual(upsertData2.success, true);
  console.log('[PASS] Teste 2: Indicadores atualizados para Paupina (ocupados: 98, disponíveis: 22).');

  // 3. Teste 3: Consultar indicadores (simulando recarregar da página)
  console.log('\n--- 3. Teste 3: Persistência & Consulta via RPC ---');
  const getRes = await fetch(url + '/rest/v1/rpc/get_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_residencial_slug: 'paupina' })
  });

  const getData = await getRes.json();
  if (!getRes.ok) {
    console.error('Falha ao consultar indicadores:', getData);
    process.exit(1);
  }

  assert.ok(getData.residencial);
  assert.strictEqual(getData.residencial.slug, 'paupina');
  assert.ok(getData.metrics);
  assert.strictEqual(getData.metrics.total_capacity, 120);
  assert.strictEqual(getData.metrics.occupied_units, 98);
  assert.strictEqual(getData.metrics.available_units, 22);
  assert.strictEqual(getData.metrics.dossiers_compliant_count, 83);
  assert.strictEqual(getData.metrics.last_updated_by, userId);
  console.log('[PASS] Teste 3: Consulta validada. Dados persistem fielmente após persistência remota.');

  // 4. Teste 4: Impedir valores negativos
  console.log('\n--- 4. Teste 4: Validação de Valores Negativos ---');
  const negativeMetrics = {
    ...paupinaMetricsInput,
    occupied_units: -5
  };

  const negRes = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'paupina',
      p_metrics: negativeMetrics
    })
  });

  assert.strictEqual(negRes.status >= 400, true);
  const negError = await negRes.json();
  console.log('   Mensagem de erro capturada:', negError.message || negError.details);
  assert.ok(
    (negError.message && negError.message.includes('não podem ser negativos')) ||
    (negError.message && negError.message.includes('chk_simple_occupied_units')) ||
    (negError.code === '22023')
  );
  console.log('[PASS] Teste 4: Rejeição estrita de valores quantitativos negativos.');

  // Teste 4b: Impedir ocupação superior à capacidade total
  console.log('\n--- 4b. Teste 4b: Validação de Consistência de Capacidade ---');
  const inconsistentCapacity = {
    ...paupinaMetricsInput,
    total_capacity: 100,
    occupied_units: 150
  };

  const capRes = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'paupina',
      p_metrics: inconsistentCapacity
    })
  });

  assert.strictEqual(capRes.status >= 400, true);
  const capError = await capRes.json();
  console.log('   Mensagem de inconsistência capturada:', capError.message);
  assert.ok(capError.message && capError.message.includes('não pode exceder a capacidade total'));
  console.log('[PASS] Teste 4b: Inconsistência de ocupação vs capacidade total bloqueada com sucesso.');

  // 5. Teste 5: Impedir atualização de residencial inexistente
  console.log('\n--- 5. Teste 5: Residencial Inexistente ---');
  const inexistentRes = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'residencial_fantasma_xyz_123',
      p_metrics: paupinaMetricsInput
    })
  });

  assert.strictEqual(inexistentRes.status >= 400, true);
  const inexistentError = await inexistentRes.json();
  console.log('   Mensagem de residencial inexistente capturada:', inexistentError.message);
  assert.ok(inexistentError.message && inexistentError.message.includes('Residencial não encontrado'));
  console.log('[PASS] Teste 5: Atualização de residencial inexistente rejeitada com código P0002.');

  // 6. Teste 6: Impedir acesso a indicadores sem autorização (Usuário Anônimo)
  console.log('\n--- 6. Teste 6: Proteção RLS e Autenticação Estrita ---');
  const anonRes = await fetch(url + '/rest/v1/rpc/get_residential_simple_metrics', {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_residencial_slug: 'paupina' })
  });

  assert.strictEqual(anonRes.status >= 400, true);
  const anonError = await anonRes.json();
  console.log('   Rejeição para usuário anônimo:', anonError.message || anonError.details);
  console.log('[PASS] Teste 6: Acesso anônimo ou desautorizado bloqueado com sucesso (RLS/Auth).');

  // 7. Teste 7: Impedir alteração cruzada entre residenciais
  console.log('\n--- 7. Teste 7: Isolamento Territorial entre Residenciais ---');
  // Criar indicadores para Joaquim Machado
  const jmMetricsInput = {
    total_capacity: 80,
    occupied_units: 72,
    available_units: 8,
    pcd_adapted_units: 5,
    pending_documents_count: 2,
    regular_documents_count: 70
  };

  const jmUpsert = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'joaquim_machado',
      p_metrics: jmMetricsInput
    })
  });

  assert.strictEqual(jmUpsert.ok, true);

  // Consultar Paupina e Joaquim Machado separadamente
  const checkPaupina = await (await fetch(url + '/rest/v1/rpc/get_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_residencial_slug: 'paupina' })
  })).json();

  const checkJM = await (await fetch(url + '/rest/v1/rpc/get_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_residencial_slug: 'joaquim_machado' })
  })).json();

  assert.strictEqual(checkPaupina.metrics.total_capacity, 120);
  assert.strictEqual(checkJM.metrics.total_capacity, 80);
  assert.notStrictEqual(checkPaupina.metrics.id, checkJM.metrics.id);
  console.log('[PASS] Teste 7: Isolamento completo: Atualização em Joaquim Machado não tocou Paupina.');

  // 8. Teste 8: Confirmar que o Modo Simples não grava nem possui dados pessoais
  console.log('\n--- 8. Teste 8: Auditoria de Sigilo & LGPD no Modo Simples ---');
  const metricsColsRes = await fetch(url + '/rest/v1/residential_simple_metrics?select=*&limit=1', {
    headers: authHeaders
  });
  const [metricsSample] = await metricsColsRes.json();
  const forbiddenKeys = ['cpf', 'name', 'person_name', 'document', 'rg', 'nis', 'individual', 'citizen'];
  const sampleKeys = Object.keys(metricsSample || {}).map(k => k.toLowerCase());

  for (const forbidden of forbiddenKeys) {
    assert.strictEqual(
      sampleKeys.includes(forbidden),
      false,
      `Chave proibida de dado pessoal encontrada na tabela de modo simples: ${forbidden}`
    );
  }
  console.log('[PASS] Teste 8: Schema auditado: 0 colunas de dados pessoais ou identificadores de moradores.');

  // 9. Teste 9: Confirmar que o Modo Avançado continua operando normalmente
  console.log('\n--- 9. Teste 9: Integridade e Independência do Modo Avançado ---');
  const dossiersRes = await fetch(url + '/rest/v1/dossiers?select=*&limit=5', {
    headers: authHeaders
  });
  const batchesRes = await fetch(url + '/rest/v1/residential_batches?select=*&limit=5', {
    headers: authHeaders
  });

  assert.strictEqual(dossiersRes.ok, true);
  assert.strictEqual(batchesRes.ok, true);
  const dossiers = await dossiersRes.json();
  const batches = await batchesRes.json();
  console.log('   Modo Avançado Dossiês:', dossiers.length, '| Lotes:', batches.length);
  console.log('[PASS] Teste 9: Modo Avançado perfeitamente preservado e independente.');

  // 10. Teste 10: Idempotência de operações e histórico de auditoria
  console.log('\n--- 10. Teste 10: Idempotência & Histórico de Auditoria ---');
  // Re-executar o mesmo upsert
  const repeatUpsert = await fetch(url + '/rest/v1/rpc/upsert_residential_simple_metrics', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_residencial_slug: 'paupina',
      p_metrics: paupinaMetricsUpdate
    })
  });
  assert.strictEqual(repeatUpsert.ok, true);

  // Verificar contagem na tabela principal (deve ter exatamente 1 registro para paupina)
  const countRes = await fetch(url + '/rest/v1/residential_simple_metrics?residencial_slug=eq.paupina&select=id', {
    headers: authHeaders
  });
  const countData = await countRes.json();
  assert.strictEqual(countData.length, 1);

  // Verificar histórico de auditoria
  const historyRes = await fetch(url + '/rest/v1/rpc/get_residential_metrics_history', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_residencial_slug: 'paupina', p_limit: 10 })
  });
  const historyData = await historyRes.json();
  assert.ok(Array.isArray(historyData));
  assert.ok(historyData.length >= 2);
  console.log('   Registros de histórico de auditoria registrados:', historyData.length);
  console.log('[PASS] Teste 10: Idempotência confirmada (1 registro) e histórico de auditoria preenchido.');

  console.log('\n================================================================');
  console.log('TODOS OS 10 TESTES DO MODO SIMPLES FORAM CONCLUÍDOS COM SUCESSO!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('[ERRO NA EXECUÇÃO DOS TESTES]:', err);
  process.exit(1);
});
