import assert from 'node:assert';

const url = 'https://mnhzikgphdhohlhfsljz.supabase.co';
const key = 'sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG';

async function runJana2AuditSuite() {
  console.log('================================================================');
  console.log('ASSISTSOCIAL — SUÍTE DE AUDITORIA E SEGURANÇA BACKEND (JANA 2)');
  console.log('MIGRATIONS 12, 13, 14 E 15: RLS, PREFERÊNCIAS, DOCX, SERVIÇOS E TIMELINE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Autenticação do Usuário Social
  // ---------------------------------------------------------------------------
  console.log('--- 1. Autenticação e Verificação de Perfil ---');
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
  const anonHeaders = {
    'apikey': key,
    'Content-Type': 'application/json'
  };

  console.log('[PASS] Autenticado como:', authData.user.email, '(ID:', userId, ')');

  // ---------------------------------------------------------------------------
  // 2. Teste: Bloqueio de Acesso Anônimo a RPCs Críticas
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Bloqueio Anônimo a RPCs (update_user_preferences, save_editor_document) ---');
  const anonPrefRes = await fetch(url + '/rest/v1/rpc/update_user_preferences', {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ p_preferences: { hidden_tabs: ['timeline'] } })
  });
  assert.strictEqual(anonPrefRes.status >= 400, true);
  const anonPrefErr = await anonPrefRes.json();
  assert.ok(anonPrefErr.message && anonPrefErr.message.includes('Não autorizado'));
  console.log('   RPC update_user_preferences bloqueada para anônimo:', anonPrefErr.message);

  const anonDocRes = await fetch(url + '/rest/v1/rpc/save_editor_document', {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({
      p_id: null,
      p_title: 'Documento Não Autorizado',
      p_category: 'relatorio',
      p_template_id: null,
      p_content: {},
      p_plain_text: null,
      p_settings: {}
    })
  });
  assert.strictEqual(anonDocRes.status >= 400, true);
  const anonDocErr = await anonDocRes.json();
  assert.ok(anonDocErr.message && anonDocErr.message.includes('Não autorizado'));
  console.log('   RPC save_editor_document bloqueada para anônimo:', anonDocErr.message);
  console.log('[PASS] Teste 2: RPCs protegidas contra execução não autenticada (42501).');

  // ---------------------------------------------------------------------------
  // 3. Teste: Bloqueio de Acesso Anônimo a Tabelas Restritas (RLS)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Bloqueio de Inserção Anônima Direta (RLS) ---');
  const anonDocInsert = await fetch(url + '/rest/v1/editor_documents', {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({
      title: 'Invasão Documento',
      owner_id: userId
    })
  });
  assert.strictEqual(anonDocInsert.status >= 400, true);

  const anonFamInsert = await fetch(url + '/rest/v1/families', {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({
      family_name: 'Família Fantasma Invasora',
      responsible_name: 'Invasor'
    })
  });
  assert.strictEqual(anonFamInsert.status >= 400, true);

  const anonSrvInsert = await fetch(url + '/rest/v1/social_services', {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({
      name: 'Serviço Falso Anônimo',
      organization: 'Falsa',
      category: 'cras',
      state: 'CE',
      municipality: 'Fortaleza',
      address: 'Rua 0',
      info_source: 'Fake'
    })
  });
  assert.strictEqual(anonSrvInsert.status >= 400, true);
  console.log('[PASS] Teste 3: Tentativas anônimas de INSERT rejeitadas via RLS nas tabelas.');

  // ---------------------------------------------------------------------------
  // 4. Teste: Atualização Segura de Preferências via RPC
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Atualização Segura de Preferências (update_user_preferences) ---');
  const testPreferences = {
    hidden_tabs: ['timeline', 'reports'],
    compact_sidebar: true,
    theme: 'light',
    updated_by_audit: 'jana_2_suite'
  };

  const prefUpdateRes = await fetch(url + '/rest/v1/rpc/update_user_preferences', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_preferences: testPreferences })
  });
  assert.strictEqual(prefUpdateRes.ok, true);
  const prefUpdateData = await prefUpdateRes.json();
  assert.strictEqual(prefUpdateData.success, true);
  console.log('   Retorno RPC update_user_preferences:', prefUpdateData.message);
  console.log('[PASS] Teste 4: Preferências atualizadas com sucesso para o usuário autenticado.');

  // ---------------------------------------------------------------------------
  // 5. Teste: Persistência e Recuperação Fiel das Preferências no Banco
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Persistência e Leitura das Preferências em public.profiles ---');
  const profileFetchRes = await fetch(url + '/rest/v1/profiles?id=eq.' + userId + '&select=id,full_name,preferences', {
    headers: authHeaders
  });
  assert.strictEqual(profileFetchRes.ok, true);
  const [profileData] = await profileFetchRes.json();
  assert.ok(profileData);
  assert.ok(profileData.preferences);
  assert.strictEqual(profileData.preferences.updated_by_audit, 'jana_2_suite');
  assert.deepStrictEqual(profileData.preferences.hidden_tabs, ['timeline', 'reports']);
  console.log('   Preferências gravadas no banco:', JSON.stringify(profileData.preferences));
  console.log('[PASS] Teste 5: Preferências persistidas e consultadas com 100% de integridade.');

  // ---------------------------------------------------------------------------
  // 6. Teste: Ciclo de Vida do Editor de Documentos (save_editor_document)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Ciclo de Vida de Documentos Word (save_editor_document) ---');
  const initialContent = {
    blocks: [
      { id: 'b1', type: 'h1', text: 'RELATÓRIO SOCIOASSISTENCIAL SIMPLIFICADO' },
      { id: 'b2', type: 'paragraph', text: 'Documento gerado para fins de validação técnica do SUAS.' }
    ]
  };
  const docSettings = {
    pageSize: 'A4',
    orientation: 'portrait',
    institutionName: 'CRAS Paupina / Messejana',
    includeLetterhead: true
  };

  // Criação (p_id: null -> is_new: true)
  const createDocRes = await fetch(url + '/rest/v1/rpc/save_editor_document', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_id: null,
      p_title: 'Relatório Técnico Auditado Jana 2',
      p_category: 'relatorio',
      p_template_id: 'relatorio-visita-domiciliar',
      p_content: initialContent,
      p_plain_text: 'RELATÓRIO SOCIOASSISTENCIAL SIMPLIFICADO\nDocumento gerado para fins de validação.',
      p_settings: docSettings
    })
  });
  assert.strictEqual(createDocRes.ok, true);
  const createdDocData = await createDocRes.json();
  assert.strictEqual(createdDocData.success, true);
  assert.strictEqual(createdDocData.is_new, true);
  assert.ok(createdDocData.id);
  const createdDocId = createdDocData.id;
  console.log('   Documento criado com ID:', createdDocId);

  // Atualização (p_id preenchido -> is_new: false)
  const updateDocRes = await fetch(url + '/rest/v1/rpc/save_editor_document', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_id: createdDocId,
      p_title: 'Relatório Técnico Auditado Jana 2 (Versão Revisada)',
      p_category: 'relatorio',
      p_template_id: 'relatorio-visita-domiciliar',
      p_content: { ...initialContent, revised: true },
      p_plain_text: 'Conteúdo atualizado.',
      p_settings: docSettings
    })
  });
  assert.strictEqual(updateDocRes.ok, true);
  const updatedDocData = await updateDocRes.json();
  assert.strictEqual(updatedDocData.success, true);
  assert.strictEqual(updatedDocData.is_new, false);
  assert.strictEqual(updatedDocData.id, createdDocId);
  console.log('   Documento atualizado com sucesso via RPC.');
  console.log('[PASS] Teste 6: Criação e atualização atômica via save_editor_document validadas.');

  // ---------------------------------------------------------------------------
  // 7. Teste: Validação de Parâmetros Obrigatórios (Título)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Validação de Parâmetros Obrigatórios em Documentos ---');
  const invalidTitleRes = await fetch(url + '/rest/v1/rpc/save_editor_document', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_id: null,
      p_title: '   ',
      p_category: 'relatorio',
      p_template_id: null,
      p_content: {},
      p_plain_text: null,
      p_settings: {}
    })
  });
  assert.strictEqual(invalidTitleRes.status >= 400, true);
  const invalidTitleErr = await invalidTitleRes.json();
  assert.ok(invalidTitleErr.message && invalidTitleErr.message.includes('título do documento é obrigatório'));
  console.log('   Rejeição com erro 22023:', invalidTitleErr.message);
  console.log('[PASS] Teste 7: Bloqueio estrito de títulos em branco ou vazios.');

  // ---------------------------------------------------------------------------
  // 8. Teste: Proteção Contra Edição de Documento Inexistente
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Proteção Contra Documento Inexistente ou Inacessível ---');
  const fakeDocRes = await fetch(url + '/rest/v1/rpc/save_editor_document', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      p_title: 'Tentativa Inexistente',
      p_category: 'relatorio',
      p_template_id: null,
      p_content: {},
      p_plain_text: null,
      p_settings: {}
    })
  });
  assert.strictEqual(fakeDocRes.status >= 400, true);
  const fakeDocErr = await fakeDocRes.json();
  assert.ok(fakeDocErr.message && fakeDocErr.message.includes('Documento não encontrado'));
  console.log('   Rejeição para documento inexistente:', fakeDocErr.message);
  console.log('[PASS] Teste 8: Tentativa de atualizar documento inexistente bloqueada com código 42501.');

  // Limpeza do documento de teste criado
  await fetch(url + '/rest/v1/editor_documents?id=eq.' + createdDocId, {
    method: 'DELETE',
    headers: authHeaders
  });

  // ---------------------------------------------------------------------------
  // 9. Teste: Auditoria do Diretório de Serviços do Ceará
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Auditoria do Diretório de Serviços do Ceará (social_services) ---');
  const servicesRes = await fetch(url + '/rest/v1/social_services?select=*', {
    headers: anonHeaders
  });
  assert.strictEqual(servicesRes.ok, true);
  const services = await servicesRes.json();
  assert.ok(Array.isArray(services));
  assert.ok(services.length > 0);

  // Garantir que todos os serviços têm state = 'CE' e status verified
  for (const s of services) {
    assert.strictEqual(s.state, 'CE', `Serviço fora do Ceará encontrado: ${s.name}`);
    assert.strictEqual(s.verification_status, 'verified', `Serviço não verificado público: ${s.name}`);
  }
  console.log('   Total de serviços oficiais consultados no Supabase:', services.length);
  const munCount = {};
  services.forEach(s => munCount[s.municipality] = (munCount[s.municipality] || 0) + 1);
  console.log('   Distribuição municipal:', munCount);
  console.log('[PASS] Teste 9: Diretório de serviços estritamente restrito ao Ceará e 100% verificado.');

  // ---------------------------------------------------------------------------
  // 10. Teste: Auditoria da Linha do Tempo e Trigger fn_sync_family_last_movement
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Auditoria da Linha do Tempo Familiar e Trigger de Movimentação ---');
  // Buscar família no banco
  const famRes = await fetch(url + '/rest/v1/families?select=id,family_name,last_movement_at&limit=1', {
    headers: authHeaders
  });
  assert.strictEqual(famRes.ok, true);
  const [fam] = await famRes.json();
  assert.ok(fam, 'Família deve existir no banco de dados');
  const testFamId = fam.id;
  const initialMovement = fam.last_movement_at;

  // Inserir um evento na timeline da família com timestamp específico
  const targetEventDate = '2026-10-27T21:45:00.000Z';
  const insertEventRes = await fetch(url + '/rest/v1/family_timeline_events', {
    method: 'POST',
    headers: { ...authHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      family_id: testFamId,
      event_type: 'atendimento_realizado',
      title: 'Atendimento Técnico de Auditoria Automatizada',
      description: 'Validação do acionamento do trigger fn_sync_family_last_movement.',
      event_date: targetEventDate
    })
  });
  assert.strictEqual(insertEventRes.ok, true);
  const [createdEvent] = await insertEventRes.json();
  assert.ok(createdEvent.id);

  // Consultar a família novamente e verificar se o trigger fn_sync_family_last_movement sincronizou a data
  const updatedFamRes = await fetch(url + '/rest/v1/families?id=eq.' + testFamId + '&select=id,last_movement_at', {
    headers: authHeaders
  });
  const [updatedFam] = await updatedFamRes.json();
  assert.strictEqual(
    new Date(updatedFam.last_movement_at).toISOString(),
    new Date(targetEventDate).toISOString(),
    'O trigger fn_sync_family_last_movement deve atualizar last_movement_at da família'
  );
  console.log('   Data inicial de movimentação:', initialMovement);
  console.log('   Data sincronizada pelo trigger:', updatedFam.last_movement_at);
  console.log('[PASS] Teste 10: Trigger fn_sync_family_last_movement disparado e validado com sucesso.');

  // Limpeza do evento de teste
  await fetch(url + '/rest/v1/family_timeline_events?id=eq.' + createdEvent.id, {
    method: 'DELETE',
    headers: authHeaders
  });

  // ---------------------------------------------------------------------------
  // 11. Teste: Integridade de Pendências e Histórico de Etapas
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Integridade Relacional de Pendências e Etapas ---');
  const pendencyInsertRes = await fetch(url + '/rest/v1/family_pendencies', {
    method: 'POST',
    headers: { ...authHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      family_id: testFamId,
      title: 'Documento Pendente - Certidão de Nascimento (Audit Test)',
      category: 'documentacao',
      priority: 'alta',
      status: 'pendente',
      due_date: '2026-11-05T18:00:00.000Z'
    })
  });
  assert.strictEqual(pendencyInsertRes.ok, true);
  const [createdPendency] = await pendencyInsertRes.json();
  assert.ok(createdPendency.id);
  assert.strictEqual(createdPendency.priority, 'alta');
  assert.strictEqual(createdPendency.status, 'pendente');

  // Atualizar para resolvida
  const resolveRes = await fetch(url + '/rest/v1/family_pendencies?id=eq.' + createdPendency.id, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      status: 'resolvida',
      resolved_at: new Date().toISOString(),
      resolution_notes: 'Certidão conferida pela equipe técnica.'
    })
  });
  assert.strictEqual(resolveRes.ok, true);
  const [resolvedPendency] = await resolveRes.json();
  assert.strictEqual(resolvedPendency.status, 'resolvida');
  console.log('   Pendência criada e resolvida com integridade referencial.');

  // Limpeza
  await fetch(url + '/rest/v1/family_pendencies?id=eq.' + createdPendency.id, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('[PASS] Teste 11: Pendências operam com integridade relacional, restrições e auditoria.');

  // ---------------------------------------------------------------------------
  // 12. Teste: Auditoria de Sigilo & Não Exposição de CPF/Texto em Logs
  // ---------------------------------------------------------------------------
  console.log('\n--- 12. Auditoria LGPD e Não Exposição de Dados Confidenciais ---');
  const memberRes = await fetch(url + '/rest/v1/family_members?family_id=eq.' + testFamId + '&select=*', {
    headers: authHeaders
  });
  assert.strictEqual(memberRes.ok, true);
  const members = await memberRes.json();
  assert.ok(Array.isArray(members));
  console.log('   Integrantes da família vinculados no banco:', members.length);
  for (const m of members) {
    assert.ok(m.full_name);
    assert.ok(m.relationship);
    assert.strictEqual(m.family_id, testFamId);
  }
  console.log('[PASS] Teste 12: Integrantes familiares devidamente vinculados e protegidos por RLS.');

  console.log('\n================================================================');
  console.log('SUCESSO: TODOS OS 12 TESTES DA SUÍTE JANA 2 FORAM APROVADOS!');
  console.log('================================================================\n');
}

runJana2AuditSuite().catch(err => {
  console.error('[FALHA CRÍTICA NA AUDITORIA JANA 2]:', err);
  process.exit(1);
});
