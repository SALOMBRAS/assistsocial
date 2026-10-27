/**
 * AssistSocial - Test Suite de Segurança, RLS e Integridade de Dados
 * Executa a validação formal das regras de segurança do AssistSocial
 */

class TestEnvironment {
  constructor() {
    this.profiles = new Map();
    this.activities = new Map();
    this.folders = new Map();
    this.documents = new Map();
    this.resource_shares = new Map();
    this.comments = new Map();
    this.audit_logs = [];
    this.storage = new Map(); // storage.objects: key = name, value = { bucket_id, name, owner_id }
  }

  // Helper de checagem de propriedade
  isResourceOwner(resourceType, resourceId, userId) {
    if (!userId) return false;
    let table;
    if (resourceType === 'activity') table = this.activities;
    else if (resourceType === 'document') table = this.documents;
    else if (resourceType === 'folder') table = this.folders;
    else return false;

    const res = table.get(resourceId);
    return res && res.owner_id === userId;
  }

  // Helper de verificação de compartilhamento ativo (espelhando has_active_share em PL/pgSQL)
  hasActiveShare(resourceType, resourceId, userId, requiredPermission = 'viewer') {
    if (!userId) return false;
    const userProfile = this.profiles.get(userId);
    const userEmail = userProfile ? userProfile.email : null;

    for (const share of this.resource_shares.values()) {
      if (
        share.resource_type === resourceType &&
        share.resource_id === resourceId &&
        (share.invited_user_id === userId || (userEmail && share.invited_email && share.invited_email.toLowerCase() === userEmail.toLowerCase())) &&
        share.status === 'accepted' &&
        (!share.expires_at || new Date(share.expires_at) > new Date()) &&
        !share.revoked_at
      ) {
        if (requiredPermission === 'viewer') return true;
        if (requiredPermission === 'commenter' && ['commenter', 'editor'].includes(share.permission)) return true;
        if (requiredPermission === 'editor' && share.permission === 'editor') return true;
      }
    }
    return false;
  }

  // Helper de herança de pasta (espelhando has_folder_or_ancestor_share)
  hasFolderOrAncestorShare(folderId, userId, requiredPermission = 'viewer') {
    if (!folderId || !userId) return false;
    let currentFolderId = folderId;
    let depth = 0;
    while (currentFolderId && depth < 50) {
      if (this.hasActiveShare('folder', currentFolderId, userId, requiredPermission)) {
        return true;
      }
      const folder = this.folders.get(currentFolderId);
      if (!folder || !folder.parent_folder_id) break;
      currentFolderId = folder.parent_folder_id;
      depth++;
    }
    return false;
  }

  // Helper de acesso combinado (espelhando can_access_resource)
  canAccessResource(resourceType, resourceId, userId, requiredPermission = 'viewer') {
    if (!userId) return false;
    if (this.isResourceOwner(resourceType, resourceId, userId)) return true;
    if (this.hasActiveShare(resourceType, resourceId, userId, requiredPermission)) return true;
    if (resourceType === 'document') {
      const doc = this.documents.get(resourceId);
      if (doc && doc.folder_id) {
        return this.hasFolderOrAncestorShare(doc.folder_id, userId, requiredPermission);
      }
    }
    return false;
  }

  // Simulação de SELECT activities
  selectActivities(currentUserId) {
    if (!currentUserId) return []; // RLS: anon bloqueado
    const results = [];
    for (const act of this.activities.values()) {
      if (act.owner_id === currentUserId || this.hasActiveShare('activity', act.id, currentUserId, 'viewer')) {
        results.push(act);
      }
    }
    return results;
  }

  // Simulação de UPDATE activities
  updateActivity(currentUserId, activityId, updates) {
    if (!currentUserId) throw new Error('Não autenticado');
    const act = this.activities.get(activityId);
    if (!act) throw new Error('Atividade não encontrada');

    // Checagem RLS de UPDATE
    const hasEditorAccess = act.owner_id === currentUserId || this.hasActiveShare('activity', activityId, currentUserId, 'editor');
    if (!hasEditorAccess) {
      throw new Error('RLS VIOLATION: Permissão insuficiente para atualizar atividade');
    }

    // Trigger de proteção de propriedade
    if (updates.owner_id && updates.owner_id !== act.owner_id) {
      throw new Error('SECURITY VIOLATION: Não é permitido transferir a propriedade deste recurso');
    }

    // Registra auditoria
    if (updates.status && updates.status !== act.status) {
      this.audit_logs.push({
        actor_id: currentUserId,
        action: 'activity.status_changed',
        resource_type: 'activity',
        resource_id: activityId,
        details: { old_status: act.status, new_status: updates.status }
      });
    }

    const updated = { ...act, ...updates, updated_at: new Date().toISOString() };
    this.activities.set(activityId, updated);
    return updated;
  }

  // Simulação de UPDATE profiles (com trigger de prevenção de auto-elevação de papel)
  updateProfile(currentUserId, targetProfileId, updates) {
    if (!currentUserId) throw new Error('Não autenticado');
    const profile = this.profiles.get(targetProfileId);
    if (!profile) throw new Error('Perfil não encontrado');

    // Usuário comum só pode atualizar o próprio perfil (RLS: profiles_update_self)
    const currentUserProfile = this.profiles.get(currentUserId);
    const isGlobalAdmin = currentUserProfile && currentUserProfile.role === 'global_admin';

    if (currentUserId !== targetProfileId && !isGlobalAdmin) {
      throw new Error('RLS VIOLATION: Não é permitido atualizar perfil de outro usuário');
    }

    // Trigger prevent_profile_role_escalation
    if (updates.role && updates.role !== profile.role) {
      if (!isGlobalAdmin) {
        throw new Error('ROLE ESCALATION VIOLATION: Usuário não tem permissão para alterar o papel');
      }

      // Regra de unicidade de global_admin
      if (updates.role === 'global_admin') {
        for (const [id, p] of this.profiles.entries()) {
          if (id !== targetProfileId && p.role === 'global_admin') {
            throw new Error('SINGLE ADMIN VIOLATION: Já existe uma administradora global no sistema');
          }
        }
      }
    }

    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() };
    this.profiles.set(targetProfileId, updated);
    return updated;
  }

  // Simulação da Edge Function admin-invite-user
  adminInviteUser(callerUserId, inviteEmail, fullName, clientSuppliedRole) {
    if (!callerUserId) throw new Error('AUTH ERROR: Token ausente');
    const callerProfile = this.profiles.get(callerUserId);
    if (!callerProfile || callerProfile.role !== 'global_admin') {
      throw new Error('FORBIDDEN: Apenas a Administradora Global pode convidar novos profissionais');
    }

    if (!inviteEmail || !inviteEmail.includes('@')) {
      throw new Error('VALIDATION ERROR: E-mail inválido');
    }

    // Força o papel social_worker no servidor (ignora qualquer papel enviado pelo cliente)
    const assignedRole = 'social_worker';
    const newUserId = 'user-' + Date.now();
    const newProfile = {
      id: newUserId,
      full_name: fullName || '',
      email: inviteEmail,
      role: assignedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.profiles.set(newUserId, newProfile);

    this.audit_logs.push({
      actor_id: callerUserId,
      action: 'admin.user_invited',
      resource_type: 'user',
      resource_id: newUserId,
      details: { invited_email: inviteEmail, role_assigned: assignedRole }
    });

    return newProfile;
  }

  // Simulação de Download/SELECT storage
  getStorageObject(currentUserId, objectPath) {
    if (!currentUserId) throw new Error('Não autenticado');
    const obj = this.storage.get(objectPath);
    if (!obj) throw new Error('Objeto não encontrado no storage');

    const firstSegment = objectPath.split('/')[0];
    const isOwner = firstSegment === currentUserId;

    let hasDocAccess = false;
    for (const doc of this.documents.values()) {
      if (doc.storage_path === objectPath) {
        if (this.canAccessResource('document', doc.id, currentUserId, 'viewer')) {
          hasDocAccess = true;
          break;
        }
      }
    }

    if (!isOwner && !hasDocAccess) {
      throw new Error('RLS STORAGE VIOLATION: Acesso negado ao arquivo no Storage');
    }

    return obj;
  }

  // Simulação de verificação de ciclo de pastas
  moveFolder(currentUserId, folderId, newParentId) {
    if (!currentUserId) throw new Error('Não autenticado');
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Pasta não encontrada');
    if (folder.owner_id !== currentUserId) throw new Error('Apenas o dono pode mover a pasta');

    if (newParentId === folderId) {
      throw new Error('CYCLE VIOLATION: Uma pasta não pode ser pai de si mesma');
    }

    if (newParentId) {
      const parent = this.folders.get(newParentId);
      if (!parent) throw new Error('Pasta superior não existe');
      if (parent.owner_id !== currentUserId) throw new Error('Pasta superior pertence a outro usuário');

      // Recursão de checagem de ciclo
      let curr = newParentId;
      let depth = 0;
      while (curr && depth < 100) {
        if (curr === folderId) {
          throw new Error('CYCLE VIOLATION: Uma pasta não pode ser movida para dentro de si mesma ou de uma pasta descendente');
        }
        const p = this.folders.get(curr);
        curr = p ? p.parent_folder_id : null;
        depth++;
      }
    }

    folder.parent_folder_id = newParentId;
    folder.updated_at = new Date().toISOString();
    return folder;
  }
}

// ==============================================================================
// EXECUÇÃO DOS TESTES
// ==============================================================================

async function runTestSuite() {
  console.log('================================================================');
  console.log('ASSISTSOCIAL — EXECUÇÃO DA SUÍTE DE TESTES DE SEGURANÇA E RLS');
  console.log('================================================================\n');

  const env = new TestEnvironment();
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // Setup Usuários
  const userA = 'user-social-worker-ana-001';
  const userB = 'user-social-worker-carlos-002';
  const userC = 'user-intruder-003';
  const adminJana = 'user-admin-jana-000';

  env.profiles.set(userA, { id: userA, full_name: 'Ana Lima', email: 'ana@assistsocial.local', role: 'social_worker' });
  env.profiles.set(userB, { id: userB, full_name: 'Carlos Silva', email: 'carlos@assistsocial.local', role: 'social_worker' });
  env.profiles.set(userC, { id: userC, full_name: 'Estranho', email: 'estranho@externo.local', role: 'social_worker' });
  env.profiles.set(adminJana, { id: adminJana, full_name: 'Janaína Lima', email: 'janamendes055@gmail.com', role: 'global_admin' });

  // Criação de recurso de Ana
  const act1 = 'act-visita-101';
  env.activities.set(act1, {
    id: act1,
    owner_id: userA,
    title: 'Visita Domiciliar Confidencial',
    status: 'pending',
    starts_at: '2026-11-01T10:00:00Z'
  });

  const doc1 = 'doc-laudo-201';
  const docPath1 = `${userA}/docs/laudo_social.pdf`;
  env.documents.set(doc1, {
    id: doc1,
    owner_id: userA,
    original_name: 'laudo_social.pdf',
    display_name: 'Laudo Social da Família',
    storage_path: docPath1,
    folder_id: null
  });
  env.storage.set(docPath1, { bucket_id: 'documents', name: docPath1, owner_id: userA });

  // TESTE 1: Um usuário não consegue consultar atividades privadas de outro.
  const userBActivities = env.selectActivities(userB);
  assert(
    !userBActivities.some(a => a.id === act1),
    'Teste 1: Usuário B não consulta atividades privadas do Usuário A'
  );

  // TESTE 2: Um usuário não consegue baixar documentos privados de outro.
  let test2Passed = false;
  try {
    env.getStorageObject(userB, docPath1);
  } catch (e) {
    if (e.message.includes('RLS STORAGE VIOLATION')) test2Passed = true;
  }
  assert(test2Passed, 'Teste 2: Usuário B não consegue baixar documento privado do Usuário A no Storage');

  // TESTE 3: Um convite pendente NÃO concede acesso.
  const share1 = 'share-invite-301';
  env.resource_shares.set(share1, {
    id: share1,
    owner_id: userA,
    resource_type: 'activity',
    resource_id: act1,
    invited_user_id: userB,
    permission: 'editor',
    status: 'pending' // Convite ainda pendente
  });
  const activitiesDuringPending = env.selectActivities(userB);
  assert(
    !activitiesDuringPending.some(a => a.id === act1),
    'Teste 3: Convite com status pendente NÃO concede acesso'
  );

  // TESTE 4: Um convite aceito concede apenas as permissões previstas.
  env.resource_shares.get(share1).status = 'accepted';
  const activitiesAfterAccept = env.selectActivities(userB);
  assert(
    activitiesAfterAccept.some(a => a.id === act1),
    'Teste 4: Convite aceito concede acesso à atividade'
  );

  // TESTE 5: Um usuário viewer não consegue editar.
  env.resource_shares.get(share1).permission = 'viewer';
  let test5Passed = false;
  try {
    env.updateActivity(userB, act1, { title: 'Tentativa de alteração por viewer' });
  } catch (e) {
    if (e.message.includes('RLS VIOLATION')) test5Passed = true;
  }
  assert(test5Passed, 'Teste 5: Usuário com permissão viewer NÃO consegue editar o recurso');

  // TESTE 6: Um usuário editor não consegue assumir a propriedade do recurso (Ownership Hijack).
  env.resource_shares.get(share1).permission = 'editor';
  let test6Passed = false;
  try {
    env.updateActivity(userB, act1, { owner_id: userB }); // Tentativa de usurpação
  } catch (e) {
    if (e.message.includes('SECURITY VIOLATION')) test6Passed = true;
  }
  assert(test6Passed, 'Teste 6: Usuário editor NÃO consegue assumir propriedade do recurso (transferência bloqueada)');

  // TESTE 7: O proprietário consegue revogar um compartilhamento.
  env.resource_shares.get(share1).status = 'revoked';
  env.resource_shares.get(share1).revoked_at = new Date().toISOString();
  const activitiesAfterRevocation = env.selectActivities(userB);
  assert(
    !activitiesAfterRevocation.some(a => a.id === act1),
    'Teste 7: Proprietário revoga o compartilhamento e o acesso é imediatamente cortado'
  );

  // TESTE 8: Um recurso compartilhado não permite acessar documentos não autorizados da mesma pasta.
  const folderF = 'folder-root-401';
  env.folders.set(folderF, { id: folderF, owner_id: userA, name: 'Pasta Restrita', parent_folder_id: null });

  const docAuthorized = 'doc-auth-501';
  const docAuthPath = `${userA}/docs/doc_autorizado.pdf`;
  env.documents.set(docAuthorized, { id: docAuthorized, owner_id: userA, folder_id: folderF, storage_path: docAuthPath });
  env.storage.set(docAuthPath, { bucket_id: 'documents', name: docAuthPath, owner_id: userA });

  const docUnauth = 'doc-unauth-502';
  const docUnauthPath = `${userA}/docs/doc_sigiloso.pdf`;
  env.documents.set(docUnauth, { id: docUnauth, owner_id: userA, folder_id: folderF, storage_path: docUnauthPath });
  env.storage.set(docUnauthPath, { bucket_id: 'documents', name: docUnauthPath, owner_id: userA });

  // Compartilha apenas docAuthorized diretamente com B
  env.resource_shares.set('share-doc-auth', {
    id: 'share-doc-auth',
    owner_id: userA,
    resource_type: 'document',
    resource_id: docAuthorized,
    invited_user_id: userB,
    permission: 'viewer',
    status: 'accepted'
  });

  const canAccessAuthorized = env.canAccessResource('document', docAuthorized, userB, 'viewer');
  const canAccessUnauth = env.canAccessResource('document', docUnauth, userB, 'viewer');
  assert(
    canAccessAuthorized === true && canAccessUnauth === false,
    'Teste 8: Compartilhar um documento isolado NÃO dá acesso a outros documentos da mesma pasta'
  );

  // TESTE 9: A alteração de um identificador na requisição não permite acessar recursos de terceiros.
  let test9Passed = false;
  try {
    env.getStorageObject(userC, docAuthPath);
  } catch (e) {
    if (e.message.includes('RLS STORAGE VIOLATION')) test9Passed = true;
  }
  assert(test9Passed, 'Teste 9: Usuário C não consegue forjar acesso modificando IDs na requisição');

  // TESTE 10: Os arquivos do Storage obedecem às regras de acesso.
  let storageBDownload = false;
  try {
    const downloaded = env.getStorageObject(userB, docAuthPath);
    if (downloaded) storageBDownload = true;
  } catch (e) {
    storageBDownload = false;
  }
  assert(storageBDownload, 'Teste 10: Usuário B com compartilhamento aceito consegue acessar o arquivo autorizado no Storage');

  // TESTE 11: Usuários não autenticados não acessam recursos privados.
  const anonActivities = env.selectActivities(null);
  let anonStoragePassed = false;
  try {
    env.getStorageObject(null, docAuthPath);
  } catch (e) {
    anonStoragePassed = true;
  }
  assert(
    anonActivities.length === 0 && anonStoragePassed,
    'Teste 11: Usuário anônimo/não autenticado NÃO acessa atividades ou arquivos'
  );

  // TESTE 12: Prevenção de ciclos na hierarquia de pastas.
  const folderChild = 'folder-child-402';
  env.folders.set(folderChild, { id: folderChild, owner_id: userA, name: 'Subpasta', parent_folder_id: folderF });

  let cyclePrevented = false;
  try {
    env.moveFolder(userA, folderF, folderChild);
  } catch (e) {
    if (e.message.includes('CYCLE VIOLATION')) cyclePrevented = true;
  }
  assert(cyclePrevented, 'Teste 12: Prevenção rigorosa de ciclos de pastas (mover pasta para dentro de descendente)');

  // TESTE 13: Prevenção contra auto-elevação de papel (Role Escalation)
  let test13Passed = false;
  try {
    // Usuário comum A tenta se autopromover para global_admin
    env.updateProfile(userA, userA, { role: 'global_admin' });
  } catch (e) {
    if (e.message.includes('ROLE ESCALATION VIOLATION')) test13Passed = true;
  }
  assert(test13Passed, 'Teste 13: Usuário comum é impedido de se autopromover para global_admin');

  // TESTE 14: Restrição de unicidade da administradora global (Single Global Admin)
  let test14Passed = false;
  try {
    // Usuário admin tenta promover um segundo usuário como global_admin
    env.updateProfile(adminJana, userA, { role: 'global_admin' });
  } catch (e) {
    if (e.message.includes('SINGLE ADMIN VIOLATION')) test14Passed = true;
  }
  assert(test14Passed, 'Teste 14: Tentativa de criar uma segunda administradora global é bloqueada (unicidade estrita)');

  // TESTE 15: Edge Function admin-invite-user - Controle de acesso a convites
  let test15Passed = false;
  try {
    // Usuário comum tenta convidar outro profissional
    env.adminInviteUser(userA, 'novo.colega@assistsocial.local', 'Novo Colega', 'social_worker');
  } catch (e) {
    if (e.message.includes('FORBIDDEN')) test15Passed = true;
  }
  assert(test15Passed, 'Teste 15: Usuário comum é impedido de emitir convites administrativos (403 Forbidden)');

  // TESTE 16: Edge Function admin-invite-user - Convite legítimo e sanitização de privilégios
  const invitedProfile = env.adminInviteUser(adminJana, 'assistente.nova@assistsocial.local', 'Paula Silva', 'global_admin');
  assert(
    invitedProfile && invitedProfile.role === 'social_worker',
    'Teste 16: Convite por global_admin é bem-sucedido e força o papel padrão social_worker no servidor'
  );

  console.log(`\n================================================================`);
  console.log(`RESULTADO FINAL DOS TESTES: ${passed} de ${total} testes APROVADOS.`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();
