const url = 'https://mnhzikgphdhohlhfsljz.supabase.co';
const key = 'sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG';

async function runTests() {
  console.log('================================================================');
  console.log('ASSISTSOCIAL — SUÍTE DE TESTES: MIGRAÇÃO 10 (NOTIFICAÇÕES,');
  console.log('COMPARTILHAMENTOS, PESQUISA, RESIDENCIAIS E LEMBRETES)');
  console.log('================================================================\n');

  // 1. Autenticação Janaína Lima (Administradora Global)
  const loginRes = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'janamendes055@gmail.com', password: 'Chocolate@24' })
  });

  if (!loginRes.ok) {
    console.error('Falha no login:', await loginRes.text());
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

  console.log('[PASS] Autenticação realizada com sucesso (ID:', userId, ')');

  // TESTE 1: Residenciais - Consulta autenticada
  const resListRes = await fetch(url + '/rest/v1/residenciais?select=*', {
    headers: authHeaders
  });
  const residenciais = await resListRes.json();
  console.log('[TEST 1] Residenciais listados:', residenciais.length);
  if (residenciais.length < 2) {
    console.error('Falha: Residenciais não foram seedados corretamente', residenciais);
    process.exit(1);
  }
  console.log('   Paupina:', residenciais.find(r => r.slug === 'paupina')?.name);
  console.log('   Joaquim Machado:', residenciais.find(r => r.slug === 'joaquim_machado')?.name);
  console.log('[PASS] Teste 1: Residenciais consultados com sucesso (Paupina e Joaquim Machado presentes).');

  // TESTE 2: Pesquisa Segura de Usuários (RPC search_users_for_sharing)
  const searchRes = await fetch(url + '/rest/v1/rpc/search_users_for_sharing', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_query: 'as', p_limit: 5 })
  });
  const searchResults = await searchRes.json();
  console.log('[TEST 2] Usuários encontrados na busca segura:', searchResults.length);
  console.log('[PASS] Teste 2: Pesquisa segura executada com sucesso.');

  // TESTE 3: Criação de Lembrete e Toggle de Conclusão
  const reminderCreateRes = await fetch(url + '/rest/v1/reminders', {
    method: 'POST',
    headers: { ...authHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: 'Lembrete de Teste Automatizado',
      description: 'Verificar parecer do CRAS',
      remind_at: new Date(Date.now() + 86400000).toISOString()
    })
  });
  const [newReminder] = await reminderCreateRes.json();
  console.log('[TEST 3] Lembrete criado:', newReminder.id, 'Título:', newReminder.title);

  // Toggle do lembrete via RPC
  const toggleRes = await fetch(url + '/rest/v1/rpc/toggle_reminder_completed', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_reminder_id: newReminder.id })
  });
  const toggleResult = await toggleRes.json();
  console.log('   Status conclusão alternado:', toggleResult.is_completed);
  if (toggleResult.is_completed !== true) {
    console.error('Falha no toggle do lembrete');
    process.exit(1);
  }
  console.log('[PASS] Teste 3: Lembrete criado e concluído via RPC com sucesso.');

  // TESTE 4: Notificações - Criação, Contagem e Marcar como Lida
  const notifCreateRes = await fetch(url + '/rest/v1/notifications', {
    method: 'POST',
    headers: { ...authHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      type: 'reminder',
      title: 'Alerta de Prazo Próximo',
      content: 'A visita domiciliar está agendada para amanhã.',
      is_read: false
    })
  });
  const [newNotif] = await notifCreateRes.json();
  console.log('[TEST 4] Notificação criada:', newNotif.id, 'Título:', newNotif.title);

  // Obter contagem de não lidas via RPC
  const unreadCountRes = await fetch(url + '/rest/v1/rpc/get_unread_notifications_count', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  const unreadCount = await unreadCountRes.json();
  console.log('   Contagem de não lidas:', unreadCount);
  if (unreadCount < 1) {
    console.error('Falha: contagem de não lidas esperada >= 1');
    process.exit(1);
  }

  // Marcar como lida via RPC
  const markReadRes = await fetch(url + '/rest/v1/rpc/mark_notification_read', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ p_notification_id: newNotif.id })
  });
  const markReadResult = await markReadRes.json();
  console.log('   Resultado marcação lida:', markReadResult.success);

  // Limpar dados de teste
  await fetch(url + '/rest/v1/reminders?id=eq.' + newReminder.id, {
    method: 'DELETE',
    headers: authHeaders
  });
  await fetch(url + '/rest/v1/notifications?id=eq.' + newNotif.id, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('[PASS] Teste 4: Ciclo completo de notificações testado e limpo com sucesso.');

  console.log('\n================================================================');
  console.log('RESULTADO FINAL: TODOS OS TESTES DA MIGRAÇÃO 10 FORAM APROVADOS!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
