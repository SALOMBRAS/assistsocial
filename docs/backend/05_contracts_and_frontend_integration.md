# 05. Contratos de Dados e Guia de Integração com o Frontend (Terminal 1)

Este documento orienta os desenvolvedores do **Terminal 1 (Frontend)** para a integração completa das telas de Login, Cadastro, Recuperação de Senha, Atividades, Documentos e Pastas com a camada Supabase.

---

## 1. Contrato da Tabela `public.profiles`

O perfil do assistente social é criado automaticamente na tabela `public.profiles` via trigger no banco de dados assim que o cadastro é efetuado no `auth.users`.

| Campo | Tipo TypeScript | Tipo SQL | Obrigatório | Descrição |
|---|---|---|:---:|---|
| `id` | `string` | `UUID` | Sim | Chave primária que corresponde exatamente ao `auth.users.id`. |
| `full_name` | `string` | `TEXT` | Sim | Nome completo do profissional (extraído de `raw_user_meta_data->>'full_name'`). |
| `email` | `string \| null` | `TEXT` | Não | E-mail institucional do usuário. |
| `phone` | `string \| null` | `TEXT` | Não | Telefone de contato (extraído de `raw_user_meta_data->>'phone'`). |
| `avatar_url` | `string \| null` | `TEXT` | Não | URL da foto de perfil. |
| `role` | `string` | `TEXT` | Sim | Papel no sistema (padrão: `'social_worker'`). |
| `created_at` | `string` | `TIMESTAMPTZ` | Sim | Timestamp UTC de criação. |
| `updated_at` | `string` | `TIMESTAMPTZ` | Sim | Timestamp UTC da última atualização. |

### Fluxo de Cadastro e Criação de Perfil no Frontend
Ao cadastrar um novo usuário na tela de criação de conta:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      phone: phone || '',
    },
  },
});
```
> **Nota do Backend:** A trigger `on_auth_user_created` captura automaticamente `full_name` e `phone` dos metadados e já popula a tabela `public.profiles`. O `upsert` manual realizado pelo `AuthContext` é suportado e permitido pelo RLS (`profiles_update_self`).

---

## 2. Contrato da Tabela `public.activities`

| Campo | Tipo TypeScript | Tipo SQL | Descrição |
|---|---|---|---|
| `id` | `string` | `UUID` | Identificador único (gerado via `gen_random_uuid()`). |
| `owner_id` | `string` | `UUID` | ID do assistente social proprietário (`auth.uid()`). |
| `title` | `string` | `TEXT` | Título da atividade/atendimento. |
| `description` | `string \| null` | `TEXT` | Descrição detalhada. |
| `starts_at` | `string` | `TIMESTAMPTZ` | Data e hora de início (ISO 8601). |
| `ends_at` | `string \| null` | `TIMESTAMPTZ` | Data e hora de término (ISO 8601). |
| `category` | `string` | `TEXT` | Categoria (`atendimento`, `visita_domiciliar`, `reuniao`, `elaboracao_relatorio`, `outros`). |
| `status` | `'pending' \| 'in_progress' \| 'completed' \| 'not_completed' \| 'rescheduled' \| 'cancelled'` | `TEXT` | Situação da atividade. |
| `failure_reason`| `string \| null` | `TEXT` | Motivo de não conclusão (se cancelada/não realizada). |
| `recurrence_rule`| `string \| null` | `TEXT` | Padrão RRULE (opcional). |
| `reminder_minutes`| `number \| null` | `INTEGER` | Minutos de antecedência do lembrete (padrão: 30). |
| `created_at` | `string` | `TIMESTAMPTZ` | Data de criação. |
| `updated_at` | `string` | `TIMESTAMPTZ` | Data da última alteração. |

---

## 3. Contratos de Pastas, Documentos e Storage

### Pastas (`public.folders`)
- `id`: UUID
- `owner_id`: UUID (`auth.uid()`)
- `name`: string
- `parent_folder_id`: UUID | null
> **Regra de Integridade:** Uma pasta não pode ser movida para dentro de si mesma nem de seus descendentes (trigger `trg_check_folder_cycle`).

### Documentos (`public.documents`)
- `storage_path`: `${user.id}/${timestamp}_${sanitizedFileName}` (convenção obrigatória de caminho para compatibilidade com o Storage).
- O download deve utilizar **URLs assinadas temporárias** geradas via:
  ```typescript
  const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 300);
  ```

---

## 4. Fluxo de Recuperação de Senha

Para que a recuperação de senha funcione de ponta a ponta na aplicação publicada (`https://assistsocial-app.vercel.app`):

1. **Chamada no Frontend:**
   ```typescript
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/recuperar-senha`,
   });
   ```
2. **Ao clicar no link do e-mail recebido:**
   O Supabase valida o token e redireciona o usuário para `${window.location.origin}/recuperar-senha#access_token=...&type=recovery`.
   > **Atenção:** As rotas `${window.location.origin}/**` e `${window.location.origin}/recuperar-senha` devem estar devidamente autorizadas nas **Redirect URLs** do Supabase Dashboard.
3. **Detecção no Frontend (`AuthContext.tsx`):**
   ```typescript
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event === 'PASSWORD_RECOVERY') {
       // Exibe o formulário de redefinição de senha
     }
   });
   ```
4. **Atualização da Senha:**
   ```typescript
   const { error } = await supabase.auth.updateUser({
     password: newPassword,
   });
   ```

---

## 5. Configurações Remotas de URLs e Produção (Supabase Dashboard)

Para garantir que o fluxo de autenticação, convites e recuperação de senha opere perfeitamente na aplicação publicada em produção:

1. **Configuração de URLs no Painel:**
   - Acesse: **Authentication** $\rightarrow$ **URL Configuration**
   - **Site URL:** `https://assistsocial-app.vercel.app`
   - **Redirect URLs (Allow List):**
     - `https://assistsocial-app.vercel.app/**`
     - `https://assistsocial-app.vercel.app/recuperar-senha`
     - `https://assistsocial-app.vercel.app/login`
     - `https://assistsocial-gestao.vercel.app/**`
     - `https://assistsocial-br.vercel.app/**`
     - `http://localhost:5173/**`
2. **Template de E-mail de Recuperação de Senha:**
   - Acesse: **Authentication** $\rightarrow$ **Email Templates** $\rightarrow$ **Reset Password**
   - Garanta que o link aponte para `{{ .ConfirmationURL }}`.
3. **Bloqueio de Novos Cadastros Públicos:**
   - Acesse: **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**
   - Desmarque **"Allow new users to sign up"** para manter o fluxo estritamente restrito a convites administrativos.

---

## 6. Integração com a Edge Function `admin-invite-user` (Painel Administrativo)

Na rota restrita `/admin/usuarios`, a administradora global pode convidar novas assistentes sociais.

### Contrato de Chamada:
```typescript
const { data, error } = await supabase.functions.invoke('admin-invite-user', {
  body: {
    email: 'novo.profissional@exemplo.com.br',
    fullName: 'Nome Completo',
    phone: '(11) 98765-4321'
  }
});
```

### Comportamento Remoto Auditado:
- Enquanto a Edge Function não estiver publicada na nuvem (`404 Not Found`), o frontend exibe aviso amigável ao usuário.
- Após a publicação via CLI com `SUPABASE_ACCESS_TOKEN` (`npx supabase functions deploy admin-invite-user --project-ref mnhzikgphdhohlhfsljz`), o convite emitirá e-mail com papel forçado `social_worker`.

---

## 7. Contrato de Indicadores Analíticos Seguros (RPC `get_dashboard_analytics`)

Para substituir o cálculo lento no cliente por agregações de alta performance e privacidade no servidor:

### Chamada no Frontend:
```typescript
const { data, error } = await supabase.rpc('get_dashboard_analytics', {
  p_period: 'month' // Opções: 'today' | 'week' | 'month' | 'all' (padrão: 'month')
});
```

### Contrato de Retorno JSON:
```typescript
interface DashboardAnalytics {
  period: 'today' | 'week' | 'month' | 'all';
  total_activities: number;
  completed_activities: number;
  pending_activities: number;
  overdue_activities: number; // Atividades pendentes com starts_at < now()
  not_completed_activities: number;
  rescheduled_activities: number;
  cancelled_activities: number;
  completion_rate_percent: number; // Ex: 66.7
  by_category: {
    atendimento: number;
    visita_domiciliar: number;
    elaboracao_relatorio: number;
    reuniao: number;
    outros: number;
  };
}
```

### Garantias de RLS e Sigilo Ético:
- A função executa como `SECURITY INVOKER`, herdando as políticas de RLS da tabela `activities`.
- O usuário logado só consegue visualizar números agregados de suas próprias atividades ou daquelas compartilhadas ativamente com ele (`can_access_resource`).
- Nenhum identificador, nome de família ou dado confidencial é exposto no payload analítico.


---

## 8. Contrato de Cadastro Administrativo sem E-mail e Troca Obrigatória de Senha

### 8.1. Chamada de Criação de Usuário pela Administradora Global:
```typescript
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'novo.profissional@cras.gov.br',
    full_name: 'Nome do Profissional',
    phone: '(11) 98765-4321'
  }
});

if (error) {
  // Trata erro (ex: 409 duplicado, 403 não autorizado)
} else {
  // Exibe a senha temporária na modal (retornada uma única vez pelo servidor)
  console.log('Senha temporária:', data.temporary_password);
}
```

### 8.2. Fluxo Obrigatório de Troca de Senha no Primeiro Acesso:
Quando o profissional faz login e `profile.must_change_password === true`:

```typescript
// 1. Atualiza a senha através do mecanismo nativo do Supabase Auth
const { error: authError } = await supabase.auth.updateUser({
  password: novaSenhaForte
});

if (authError) {
  throw authError;
}

// 2. Notifica o backend para desativar a pendência e registrar a auditoria
const { data: rpcData, error: rpcError } = await supabase.rpc('mark_first_password_changed');

if (rpcError) {
  throw rpcError;
}

// 3. Libera navegação normal da aplicação
```
