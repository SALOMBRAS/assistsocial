# 08. Administradora Global, Restrição de Cadastro e Convites Administrativos

Este documento orienta a governança de acesso administrativo no **AssistSocial**, a auditoria da configuração remota do Supabase (`mnhzikgphdhohlhfsljz`), a restrição de cadastro e a operação da Edge Function `admin-invite-user`.

---

## 1. Auditoria e Estado da Conta de Janaína Lima (`janamendes055@gmail.com`)

### Verificação Real no Projeto Remoto (`mnhzikgphdhohlhfsljz`):
- **Identidade da Conta:** Janaína Lima (`janamendes055@gmail.com`).
- **UUID Verificado:** `0d8250e0-c0c8-4385-b129-24ef6ccd29e4`.
- **Status de Autenticação Remota:** **Ativa e Operacional** (Login efetuado com sucesso via endpoint de autenticação do Supabase).
- **Confirmação de E-mail:** Confirmado em `2026-10-27T21:10:23.203807Z`.
- **Papel em `public.profiles`:** **`global_admin`** (Consultado diretamente via token JWT autenticado da usuária).
- **Migração 06 (`20261027170006_global_admin_and_role_security.sql`):** **Aplicada** com sucesso no banco de dados remoto (o papel `global_admin` está restrito, com unicidade e auditoria ativas).

> **Garantia de Segurança:** Nenhuma senha ou segredo sensível é armazenado ou versionado no repositório. O vínculo administrativo baseia-se unicamente no UUID verificado e validado em `auth.users`.

---

## 2. Regras de Ouro do Papel `global_admin`

1. **Unicidade Estrita (Single Global Admin):**
   - Garantida por índice único parcial no banco de dados:
     ```sql
     CREATE UNIQUE INDEX idx_single_global_admin ON public.profiles (role) WHERE role = 'global_admin';
     ```
   - O banco de dados rejeita fisicamente qualquer tentativa de atribuir `role = 'global_admin'` a mais de uma conta simultaneamente.
2. **Prevenção de Auto-Elevação de Privilégios (Anti-Role Escalation):**
   - A trigger `trg_prevent_role_escalation` atua antes de qualquer `UPDATE` na coluna `role` da tabela `public.profiles`.
   - Se um usuário comum tentar enviar um payload modificando seu próprio papel para `global_admin`, a requisição é abortada com erro PostgreSQL `42501`.
3. **Não Recorrente:**
   - A promoção baseia-se em bootstrap controlado e auditado via `public.audit_logs` (`action = 'admin.bootstrap_completed'`).

---

## 3. Configuração Remota de URLs (Authentication $\rightarrow$ URL Configuration)

Para que a recuperação de senha e os convites de novos usuários redirecionem para as rotas corretas da aplicação publicada em produção:

- **URL Principal da Aplicação:** `https://assistsocial-app.vercel.app`
- **Aliases Ativos:** `https://assistsocial-gestao.vercel.app` e `https://assistsocial-br.vercel.app`

### Estado Auditado e Bloqueio de Acesso de Gerenciamento:
- **Status do Acesso Remoto:** O acesso à Supabase Management API via CLI requer a variável `SUPABASE_ACCESS_TOKEN` (não configurada no ambiente host por razões de segurança de credenciais).
- **Procedimento Manual Obrigatório no Dashboard do Supabase:**
  1. Acesse: **Authentication** $\rightarrow$ **URL Configuration**.
  2. Em **Site URL**, defina:
     ```text
     https://assistsocial-app.vercel.app
     ```
  3. Em **Redirect URLs**, inclua os seguintes padrões de redirecionamento permitidos:
     ```text
     https://assistsocial-app.vercel.app/**
     https://assistsocial-app.vercel.app/recuperar-senha
     https://assistsocial-app.vercel.app/login
     https://assistsocial-gestao.vercel.app/**
     https://assistsocial-br.vercel.app/**
     http://localhost:5173/**
     ```
  4. Salve as configurações.

> **Importante:** Se as URLs acima não forem cadastradas na lista de Redirect URLs permitidas no painel, o Supabase rejeita qualquer redirecionamento externo durante fluxos de `resetPasswordForEmail` ou convites por e-mail, redirecionando o usuário para o fallback padrão.

---

## 4. Bloqueio de Cadastro Público (Closed Registration)

O AssistSocial opera em modelo estritamente fechado: novos assistentes sociais somente podem entrar no sistema após convite emitido pela administradora global.

### Estado Local vs. Estado Remoto Auditado:
- **Configuração Local (`supabase/config.toml`):**
  ```toml
  [auth.email]
  enable_signup = false
  ```
  *(A configuração local é válida para ambientes de desenvolvimento via Supabase CLI, mas não se aplica automaticamente ao projeto remoto hospedado).*
- **Verificação via API Remota:** Chamada ao endpoint `auth/v1/signup` revelou que o cadastro público ainda necessita de desativação manual no painel da nuvem.

### Ação Necessária no Painel do Supabase:
1. Acesse: **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**.
2. Desmarque a opção **"Allow new users to sign up"** (Permitir novos cadastros).
3. Salve as configurações.
4. **Resultado:** Novas chamadas ao endpoint público de cadastro passarão a retornar `403 Forbidden` com código `signup_disabled`.

---

## 5. Edge Function `admin-invite-user`

A Edge Function [supabase/functions/admin-invite-user/index.ts](file:///C:/Users/Londres31/Documents/DEV/supabase/functions/admin-invite-user/index.ts) gerencia a emissão segura de convites administrativos.

### Auditoria da Função Remota:
- **Verificação Real via API:** A chamada a `https://mnhzikgphdhohlhfsljz.supabase.co/functions/v1/admin-invite-user` retornou `404 Not Found`.
- **Diagnóstico:** O código da função está 100% desenvolvido, tipado e testado localmente, porém o deploy da Edge Function para a infraestrutura de nuvem do Supabase requer autorização via `SUPABASE_ACCESS_TOKEN`.
- **Comando de Implantação (quando o token estiver disponível):**
  ```bash
  npx supabase functions deploy admin-invite-user --project-ref mnhzikgphdhohlhfsljz
  ```

### Garantias Implementadas no Código da Função:
1. **Autenticação:** Exige o token JWT do chamador no header `Authorization: Bearer <token>`.
2. **Autorização:** Consulta `public.profiles` com privilégios de serviço e confirma se `role === 'global_admin'`. Se o chamador for um usuário comum, retorna `403 Forbidden`.
3. **Higienização de Papel:** Novos usuários convidados recebem **obrigatoriamente o papel `social_worker`**.
4. **Disparo do Convite:** Invoca `auth.admin.inviteUserByEmail(email, { data: { full_name, phone, role: 'social_worker' } })`.
5. **Auditoria:** Grava evento forense `admin.user_invited` na tabela `public.audit_logs`.

---

## 6. Matriz de Auditoria: Local vs. Remoto

| Componente | Validação Local (Simulação / Testes) | Verificação Remota (Nuvem `mnhzikgphdhohlhfsljz`) | Status Consolidado |
| :--- | :--- | :--- | :--- |
| **Conta de Janaína Lima** | Validada via `sql_schema_validator.js` | Autenticação com sucesso (UUID `0d8250e0-c0c8-4385-b129-24ef6ccd29e4`) | **Concluído e Operacional** |
| **Papel `global_admin`** | Validada via `rls_simulation_suite.js` (Testes 13 e 14) | Confirmado `role = 'global_admin'` no perfil remoto | **Concluído e Operacional** |
| **Migrações 01 a 06** | 100% validadas via suíte automatizada | Tabelas criadas, RLS ativo, triggers de auditoria presentes | **Concluído e Operacional** |
| **Site URL & Redirects** | Documentada em contratos | Bloqueado na CLI (requer ajuste manual no Dashboard) | **Ação Manual Documentada** |
| **Cadastro Público** | `enable_signup = false` em `config.toml` | Requer desmarcação do toggle no painel Auth | **Ação Manual Documentada** |
| **Edge Function `admin-invite-user`** | 100% testada na suíte (Testes 15 e 16) | 404 (Aguardando deploy com `SUPABASE_ACCESS_TOKEN`) | **Código Pronto / Deploy Pendente** |
