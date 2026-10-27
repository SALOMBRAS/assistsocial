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

Para que a recuperação de senha funcione de ponta a ponta:

1. **Chamada no Frontend:**
   ```typescript
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/recuperar-senha`,
   });
   ```
2. **Ao clicar no link do e-mail recebido:**
   O Supabase valida o token e redireciona o usuário para `${window.location.origin}/recuperar-senha#access_token=...&type=recovery`.
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

## 5. Configurações Manuais Necessárias no Painel do Supabase

Para garantir que o fluxo de autenticação e recuperação opere perfeitamente:

1. **Configuração de URLs no Painel:**
   - Acesse: **Authentication** $\rightarrow$ **URL Configuration**
   - **Site URL:** `http://localhost:5173` (ou a URL de produção do frontend)
   - **Redirect URLs (Allow List):**
     - `http://localhost:5173/**`
     - `http://localhost:5173/recuperar-senha`
     - `http://localhost:5173/login`
2. **Template de E-mail de Recuperação de Senha:**
   - Acesse: **Authentication** $\rightarrow$ **Email Templates** $\rightarrow$ **Reset Password**
   - Garanta que o link aponte para `{{ .ConfirmationURL }}`.
3. **Confirmação de E-mail para Novos Cadastros:**
   - Acesse: **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**
   - Se **Confirm email** estiver ativado, o usuário receberá um link de confirmação antes de poder fazer login.
   - Para agilizar testes locais, pode-se desativar temporariamente o "Confirm email" ou utilizar o SMTP próprio configurado.
