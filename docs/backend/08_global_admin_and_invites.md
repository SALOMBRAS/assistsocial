# 08. Administradora Global, Restrição de Cadastro e Convites Administrativos

Este documento orienta a governança de acesso administrativo no **AssistSocial**, a restrição do cadastro público e a operação da Edge Function `admin-invite-user`.

---

## 1. Estado da Conta Indicada (`janamendes055@gmail.com` — Janaína Lima)

- **Identidade Indicada:** Janaína Lima (`janamendes055@gmail.com`).
- **Verificação via Conexão Remota:**
  - A API pública de dados (`public.profiles`) não expõe registros a consultas anônimas ou não autorizadas (bloqueada pelo RLS).
  - O catálogo `auth.users` é uma tabela interna do Supabase Auth e exige privilégios de superusuário (`postgres` / `service_role`).
  - **Status Atual:** A conta precisa estar criada e confirmada no Supabase Auth para que o script de bootstrap consiga localizá-la e vinculá-la com segurança ao papel de administradora global.
  - **Nenhum UUID fictício foi gerado ou atribuído.**

> **Aviso Fundamental de Segurança:**  
> Nenhuma senha foi solicitada, registrada, manipulada ou exposta no código. A promoção baseia-se unicamente na identidade verificada em `auth.users` e no UUID correspondente.

---

## 2. Regras do Papel `global_admin`

1. **Unicidade Estrita (Single Global Admin):**
   - Implementado através de um índice único parcial no PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX idx_single_global_admin ON public.profiles (role) WHERE role = 'global_admin';
     ```
   - O banco de dados rejeita fisicamente qualquer tentativa de atribuir `role = 'global_admin'` a mais de uma conta simultaneamente.
2. **Prevenção de Auto-Elevação de Privilégios (Role Escalation):**
   - A trigger `trg_prevent_role_escalation` atua antes de qualquer `UPDATE` na coluna `role` da tabela `public.profiles`.
   - Se um usuário comum tentar enviar um payload modificando seu próprio papel para `global_admin`, a requisição é abortada com exceção de segurança.
3. **Não Recorrente:**
   - A promoção não foi embutida como lógica automática em migrações normais. Trata-se de um bootstrap controlado, executado uma única vez após validação da conta.

---

## 3. Procedimento Seguro de Bootstrap

O arquivo [supabase/bootstrap_global_admin.sql](file:///C:/Users/Londres31/Documents/DEV/supabase/bootstrap_global_admin.sql) foi preparado para execução controlada no painel do Supabase.

### Passos de Execução:
1. Certifique-se de que a usuária criou a conta no AssistSocial com o e-mail `janamendes055@gmail.com` e que o e-mail está com status confirmado no Supabase Auth.
2. Acesse o [SQL Editor do Supabase](https://supabase.com/dashboard/project/mnhzikgphdhohlhfsljz/sql).
3. Abra o script `supabase/bootstrap_global_admin.sql`, copie o conteúdo e execute no SQL Editor.
4. **Validações realizadas pelo script durante a execução:**
   - Verifica se já existe outra administradora global (se houver, gera erro e aborta sem sobrescrever).
   - Verifica se a conta existe em `auth.users` (se não existir, alerta que o cadastro precisa ser feito primeiro).
   - Verifica se `email_confirmed_at` não é nulo.
   - Atualiza o perfil para `role = 'global_admin'` associado estritamente ao UUID real do usuário.
   - Registra o evento na tabela `public.audit_logs`.

---

## 4. Desativação do Cadastro Público

Para garantir que apenas assistentes sociais convidadas pela administradora global tenham acesso ao sistema:

### No Painel do Supabase:
1. Acesse: **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**.
2. Desmarque a opção **Allow new users to sign up** (Permitir cadastro de novos usuários).
3. Salve as alterações.
4. **Efeito:**
   - Tentativas de cadastro público (`signUp`) serão rejeitadas pelo Supabase Auth.
   - O login (`signInWithPassword`) e a recuperação de senha (`resetPasswordForEmail`) de usuários existentes continuam funcionando normalmente.
   - Novos usuários só poderão ser criados via convite administrativo.

### Na Configuração Local CLI (`supabase/config.toml`):
Configurado:
```toml
[auth.email]
enable_signup = false
```

---

## 5. Edge Function `admin-invite-user`

A Edge Function [supabase/functions/admin-invite-user/index.ts](file:///C:/Users/Londres31/Documents/DEV/supabase/functions/admin-invite-user/index.ts) gerencia o envio de convites controlados pela administradora global.

### Fluxo de Execução da Função:
1. **Autenticação:** Exige o token JWT do chamador no header `Authorization: Bearer <token>`.
2. **Autorização:** Consulta `public.profiles` com privilégios de serviço e confirma se `role === 'global_admin'`. Se o chamador for um usuário comum, a função retorna `403 Forbidden`.
3. **Higienização de Papel:** Novos usuários convidados recebem **obrigatoriamente o papel `social_worker`**. Parâmetros de papel enviados pelo cliente são sumariamente ignorados pelo servidor.
4. **Disparo do Convite:** Invoca `auth.admin.inviteUserByEmail(email, { data: { full_name, phone, role: 'social_worker' } })`.
5. **Auditoria:** Grava evento forense `admin.user_invited` na tabela `public.audit_logs`.

### Como Invocar a Função a partir do Frontend:
```typescript
const { data, error } = await supabase.functions.invoke('admin-invite-user', {
  body: {
    email: 'novo.profissional@assistsocial.com.br',
    fullName: 'Maria da Silva',
    phone: '(11) 98765-4321'
  }
});
```
