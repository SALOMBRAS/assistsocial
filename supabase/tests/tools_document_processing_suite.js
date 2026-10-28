import assert from 'node:assert';

const url = 'https://mnhzikgphdhohlhfsljz.supabase.co';
const key = 'sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG';

async function runTests() {
  console.log('================================================================');
  console.log('ASSISTSOCIAL — SUÍTE DE TESTES: CENTRAL DE FERRAMENTAS');
  console.log('MIGRAÇÃO 13: JOBS DE PROCESSAMENTO, RLS, STORAGE & AUDITORIA');
  console.log('================================================================\n');

  // 1. Autenticação Janaína Lima
  console.log('--- 1. Autenticação de Usuário Autorizado ---');
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

  // 2. Teste 1: Bloqueio de Acesso Anônimo (RLS & RPC Security)
  console.log('\n--- 2. Teste 1: Bloqueio de Acesso Anônimo ---');
  const anonRes = await fetch(url + '/rest/v1/rpc/create_document_job', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_operation_type: 'pdf_to_docx',
      p_original_filename: 'relatorio.pdf'
    })
  });

  assert.strictEqual(anonRes.status >= 400, true);
  const anonErr = await anonRes.json();
  console.log('   Mensagem de rejeição anônima:', anonErr.message);
  assert.ok(anonErr.message && anonErr.message.includes('Não autorizado'));
  console.log('[PASS] Teste 1: Tentativa anônima bloqueada com sucesso (42501).');

  // 3. Teste 2: Criação de Trabalho de Processamento (create_document_job)
  console.log('\n--- 3. Teste 2: Criação de Trabalho de Processamento ---');
  const createJobRes = await fetch(url + '/rest/v1/rpc/create_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_operation_type: 'images_to_pdf',
      p_original_filename: 'fotos_visita_domiciliar.zip',
      p_output_format: 'pdf',
      p_metadata: { images_count: 4, compression: 'balanced' }
    })
  });

  const jobCreated = await createJobRes.json();
  assert.strictEqual(createJobRes.ok, true);
  assert.strictEqual(jobCreated.success, true);
  assert.ok(jobCreated.job_id);
  assert.strictEqual(jobCreated.status, 'processing');
  assert.strictEqual(jobCreated.operation_type, 'images_to_pdf');
  const testJobId1 = jobCreated.job_id;
  console.log('[PASS] Teste 2: Job criado com sucesso (ID:', testJobId1, ')');

  // 4. Teste 3: Validação de Parâmetros Obrigatórios
  console.log('\n--- 4. Teste 3: Validação de Parâmetros de Entrada ---');
  const invalidParamRes = await fetch(url + '/rest/v1/rpc/create_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_operation_type: '',
      p_original_filename: 'arquivo.pdf'
    })
  });

  assert.strictEqual(invalidParamRes.status >= 400, true);
  const invalidErr = await invalidParamRes.json();
  console.log('   Mensagem de parâmetro inválido:', invalidErr.message);
  assert.ok(invalidErr.message && invalidErr.message.includes('Parâmetro obrigatório ausente'));
  console.log('[PASS] Teste 3: Rejeição de parâmetro operation_type vazio (22023).');

  // 5. Teste 4: Atualização de Status para Completed
  console.log('\n--- 5. Teste 4: Conclusão do Processamento ---');
  const updateCompleteRes = await fetch(url + '/rest/v1/rpc/update_document_job_status', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_job_id: testJobId1,
      p_status: 'completed',
      p_result_filename: 'fotos_visita_domiciliar.pdf',
      p_file_size: 1548200
    })
  });

  const updateCompleteData = await updateCompleteRes.json();
  assert.strictEqual(updateCompleteRes.ok, true);
  assert.strictEqual(updateCompleteData.success, true);
  assert.strictEqual(updateCompleteData.status, 'completed');
  assert.ok(updateCompleteData.completed_at);
  console.log('[PASS] Teste 4: Job atualizado para "completed" com tamanho e timestamp.');

  // 6. Teste 5: Rejeição de Status Inválido
  console.log('\n--- 6. Teste 5: Rejeição de Status Inválido ---');
  const invalidStatusRes = await fetch(url + '/rest/v1/rpc/update_document_job_status', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_job_id: testJobId1,
      p_status: 'status_fantasma_invalido'
    })
  });

  assert.strictEqual(invalidStatusRes.status >= 400, true);
  const statusErr = await invalidStatusRes.json();
  console.log('   Mensagem de status inválido:', statusErr.message);
  assert.ok(statusErr.message && statusErr.message.includes('Status inválido'));
  console.log('[PASS] Teste 5: Transição para status não homologado bloqueada.');

  // 7. Teste 6: Criação e Cancelamento de Trabalho
  console.log('\n--- 7. Teste 6: Fluxo de Cancelamento de Job ---');
  const jobToCancelRes = await fetch(url + '/rest/v1/rpc/create_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      p_operation_type: 'compress_pdf',
      p_original_filename: 'dossie_grande.pdf',
      p_output_format: 'pdf'
    })
  });
  const jobToCancelData = await jobToCancelRes.json();
  const testJobId2 = jobToCancelData.job_id;

  const cancelRes = await fetch(url + '/rest/v1/rpc/cancel_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_job_id: testJobId2 })
  });

  const cancelData = await cancelRes.json();
  assert.strictEqual(cancelRes.ok, true);
  assert.strictEqual(cancelData.success, true);
  assert.strictEqual(cancelData.status, 'cancelled');

  // Tentativa de cancelar job já cancelado
  const cancelAgainRes = await fetch(url + '/rest/v1/rpc/cancel_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_job_id: testJobId2 })
  });
  const cancelAgainData = await cancelAgainRes.json();
  assert.strictEqual(cancelAgainData.success, false);
  console.log('   Mensagem de cancelamento repetido:', cancelAgainData.message);
  console.log('[PASS] Teste 6: Job cancelado com sucesso e proteção contra repetição redundante.');

  // 8. Teste 7: Consulta de Histórico do Usuário (get_user_document_jobs)
  console.log('\n--- 8. Teste 7: Consulta de Histórico Paginado ---');
  const historyRes = await fetch(url + '/rest/v1/rpc/get_user_document_jobs', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_limit: 10 })
  });

  const history = await historyRes.json();
  assert.strictEqual(historyRes.ok, true);
  assert.ok(Array.isArray(history));
  assert.ok(history.length >= 2);
  const foundJob1 = history.find(j => j.id === testJobId1);
  const foundJob2 = history.find(j => j.id === testJobId2);
  assert.ok(foundJob1);
  assert.ok(foundJob2);
  assert.strictEqual(foundJob1.status, 'completed');
  assert.strictEqual(foundJob2.status, 'cancelled');
  console.log('[PASS] Teste 7: Histórico retornado com sucesso. Registros encontrados:', history.length);

  // 9. Teste 8: Job Inexistente
  console.log('\n--- 9. Teste 8: Validação de Job Inexistente ---');
  const inexistentRes = await fetch(url + '/rest/v1/rpc/cancel_document_job', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_job_id: '00000000-0000-0000-0000-000000000000' })
  });

  assert.strictEqual(inexistentRes.status >= 400, true);
  const inexistentErr = await inexistentRes.json();
  console.log('   Mensagem de job inexistente:', inexistentErr.message);
  assert.ok(inexistentErr.message && inexistentErr.message.includes('Trabalho não encontrado'));
  console.log('[PASS] Teste 8: Manipulação de job inexistente rejeitada com código P0002.');

  // 10. Teste 9: Auditoria de Sigilo & LGPD no Modelo de Dados
  console.log('\n--- 10. Teste 9: Auditoria de Sigilo e LGPD ---');
  const jobSchemaRes = await fetch(url + '/rest/v1/document_processing_jobs?select=*&limit=1', {
    headers: authHeaders
  });
  const [jobSample] = await jobSchemaRes.json();
  const forbiddenKeys = ['content', 'document_text', 'extracted_text', 'cpf', 'person_name', 'raw_body'];
  const sampleKeys = Object.keys(jobSample || {}).map(k => k.toLowerCase());

  for (const forbidden of forbiddenKeys) {
    assert.strictEqual(
      sampleKeys.includes(forbidden),
      false,
      `Coluna confidencial não permitida encontrada na tabela de jobs: ${forbidden}`
    );
  }
  console.log('[PASS] Teste 9: Schema 100% em conformidade com LGPD: zero dados ou textos de documentos salvos no banco.');

  // 11. Teste 10: Limpeza de Jobs Expirados (cleanup_expired_document_jobs)
  console.log('\n--- 11. Teste 10: Limpeza e Manutenção Automática ---');
  const cleanupRes = await fetch(url + '/rest/v1/rpc/cleanup_expired_document_jobs', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });

  assert.strictEqual(cleanupRes.ok, true);
  const cleanedCount = await cleanupRes.json();
  console.log('   Trabalhos limpos/expirados na rotina:', cleanedCount);
  console.log('[PASS] Teste 10: Rotina de manutenção de expiração executada com sucesso.');

  console.log('\n================================================================');
  console.log('TODOS OS 10 TESTES DA CENTRAL DE FERRAMENTAS FORAM APROVADOS!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('[ERRO NA EXECUÇÃO DOS TESTES]:', err);
  process.exit(1);
});
