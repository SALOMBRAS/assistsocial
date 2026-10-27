# Relatório de Implementação e Auditoria de Produção — AssistSocial

> **Conforme diretrizes oficiais de [jana 1.txt](file:///C:/Users/Londres31/Downloads/prompt/jana%201.txt)**  
> **Status:** Concluído e Auditado em Produção  
> **Data:** 27 de Outubro de 2026  
> **Módulo:** `apps/web` (Frontend - Terminal 1)

---

## 1. Arquivos Criados e Modificados

### Contextos e Estado Global:
- [`src/contexts/AuthContext.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/contexts/AuthContext.tsx): Gerenciamento de sessão Supabase, hooks `signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword`, propriedade `isAdmin` (derivada estritamente de `profiles.role === 'global_admin'` com base nos dados reais do Supabase, sem verificação manual por e-mail), detecção do evento `PASSWORD_RECOVERY` e sincronização do perfil (`profiles`).

### Páginas e Rotas:
- [`src/pages/AuthLayout.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AuthLayout.tsx): Layout responsivo em duas colunas no desktop (marca, boas-vindas, frase institucional oficial, selos de segurança e sigilo SUAS/LGPD) e coluna única no mobile.
- [`src/pages/LoginPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/LoginPage.tsx): Tela de login com validações, botão para mostrar/ocultar senha, "Lembrar de mim", mensagens amigáveis em português e link para solicitação de acesso via WhatsApp.
- [`src/pages/RegisterPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/RegisterPage.tsx): Painel oficial de **solicitação de acesso via WhatsApp**. O cadastro público direto foi desativado; a página gera a mensagem estruturada com nome, órgão, município e contatos institucionais para validação pela administradora global.
- [`src/pages/ResetPasswordPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/ResetPasswordPage.tsx): Fluxo completo de recuperação em duas fases: solicitação de link por e-mail com `redirectTo` e formulário de redefinição de nova senha ao acessar pelo token de recuperação.
- [`src/pages/Guards.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/Guards.tsx): Protetores de rota `ProtectedRoute`, `PublicOnlyRoute` e `AdminRoute` (bloqueia o acesso a usuários sem o papel `global_admin` comprovado pelo backend).
- [`src/pages/AdminUsersPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AdminUsersPage.tsx): Painel exclusivo da Administradora Global para convidar novos profissionais via Edge Function `admin-invite-user` (com tratamento de erro real e sem simulação de sucesso) e listar as contas registradas em `public.profiles`.
- [`src/pages/MainDashboard.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/MainDashboard.tsx): Painel principal protegido, integrado com dados reais do Supabase, alternância de abas, filtros e modais de ação.
- [`src/App.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/App.tsx): Configuração de rotas via `react-router-dom`, com rota protegida `/admin/usuarios`.

### Componentes de Interface e Ações:
- [`src/components/Sidebar.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/Sidebar.tsx): Exibição do menu principal, perfil do usuário autenticado e link condicional para "Gestão de Usuários", visível exclusivamente quando `isAdmin === true`.
- [`src/components/Header.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/Header.tsx): Saudação personalizada com o nome real do usuário autenticado.
- [`src/components/StatsCards.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/StatsCards.tsx): Métricas calculadas com base em atividades reais.
- [`src/components/ActivityCard.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ActivityCard.tsx): Menu contextual com reagendamento, justificativa de não realização (`failure_reason`), compartilhamento e exclusão.
- [`src/components/ActionModals.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ActionModals.tsx): Modais para justificativa de não realização, reagendamento e confirmação de exclusão.
- [`src/components/ShareModal.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ShareModal.tsx): Modal de compartilhamento granular de atividades e documentos via `public.resource_shares`.
- [`src/components/DocumentsView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/DocumentsView.tsx): Módulo de pastas, upload para o bucket `documents` e geração de links assinados temporários.
- [`src/components/CalendarView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/CalendarView.tsx): Agenda e cronograma de visitas mensais com contagem de atividades por dia.
- [`src/components/TeamView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/TeamView.tsx): Painel de convites recebidos com ação de aceitar e gerenciamento de compartilhamentos ativos.
- [`src/components/BottomNav.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/BottomNav.tsx): Navegação inferior para celular com botão de ação rápida centralizado.

---

## 2. Mapa de Rotas e Políticas de Acesso

| Rota | Política de Acesso | Componente | Descrição |
| :--- | :--- | :--- | :--- |
| `/login` | Pública (`PublicOnlyRoute`) | `LoginPage` | Autenticação por e-mail e senha |
| `/cadastro` | Pública (`PublicOnlyRoute`) | `RegisterPage` | Solicitação de convite institucional via WhatsApp (sem cadastro direto) |
| `/recuperar-senha` | Aberta / Recuperação | `ResetPasswordPage` | Solicitação de link ou redefinição de senha com token seguro |
| `/` | Privada (`ProtectedRoute`) | `MainDashboard` | Painel principal do sistema |
| `/admin/usuarios` | Administrativa (`AdminRoute`) | `AdminUsersPage` | Exclusiva para `profiles.role = 'global_admin'`; convites via Edge Function |
| `*` | Redirecionamento | `Navigate` | Redireciona qualquer rota inválida para `/` |

---

## 3. Segurança e Regras de Negócio

1. **Privilégios de Administradora Global:**
   - O papel `global_admin` é verificado diretamente da tabela `public.profiles` após autenticação válida no Supabase.
   - Nenhuma permissão é concedida por simples correspondência de string de e-mail no frontend.
   - A rota `/admin/usuarios` e o menu lateral só são renderizados se o perfil contiver `role === 'global_admin'`.
2. **Ausência de Credenciais Administrativas no Frontend:**
   - O frontend consome exclusivamente a chave pública anônima (`VITE_SUPABASE_PUBLISHABLE_KEY`).
   - Nenhuma `service_role_key` ou segredo de servidor está presente nos fontes.
3. **Integração Real com a Edge Function `admin-invite-user`:**
   - O formulário invoca `supabase.functions.invoke('admin-invite-user', { body: ... })`.
   - Se a função retornar erro (ex.: 404 por ainda não estar publicada pelo Terminal 2 ou privilégio insuficiente), o erro real é reportado ao usuário na interface sem falsa simulação de sucesso.
4. **Proteção de Dados Sensíveis:**
   - Cadastro público direto fechado; novos acessos requerem emissão controlada de convites.

---

## 4. Testes e Validação Executados

1. **Compilação de Produção (`tsc -b && vite build`):** **APROVADO** (compilado em 1.94s sem erros).
2. **Análise Estática (`oxlint`):** **APROVADO** (0 erros encontrados no código de `apps/web/src`).
3. **Suíte Automatizada de Integração ([`test-integration.mjs`](file:///C:/Users/Londres31/Documents/DEV/apps/web/test-integration.mjs)):** **APROVADO**
   - 20 arquivos essenciais validados.
   - Bundle `dist/index.html` verificado.
   - Textos e frases institucionais oficiais validados.
   - `/cadastro` verificado como solicitação via WhatsApp sem cadastro direto.
   - Invocação da Edge Function `admin-invite-user` verificada.
   - Bloqueio estrito da `AdminRoute` pelo papel `global_admin` validado.
   - Nenhuma credencial administrativa presente no código do frontend.

---

## 5. Auditoria de Produção na Vercel

### 5.1. Projeto e Autenticação
- **Conta Vercel:** `pedrosalomao22099-4358` (autenticada e confirmada via Vercel CLI).
- **Projeto Vercel:** `assistsocial` (ID: `prj_zUbTL0lZkvXdliiZz7uzsXaYBWg4`).
- **Root Directory:** Corrigido e confirmado para `apps/web` (anteriormente estava `.` na criação do projeto, impedindo builds no repositório mono).

### 5.2. Evidência da Implantação de Produção
- **Deployment Ativo:** `dpl_Ds4wEZd6HAcaryQqKACrHYcVx9vB` (Status: `READY`, Target: `production`).
- **Build na Vercel:** Compilado via Vite em 790ms no ambiente de build East (iad1).

### 5.3. Domínios e Aliases Auditados (HTTP 200 OK)
Todos os três domínios solicitados foram auditados e estão apontando para o deployment ativo de produção:
1. `https://assistsocial-app.vercel.app` — **200 OK** (Confirmado)
2. `https://assistsocial-gestao.vercel.app` — **200 OK** (Confirmado)
3. `https://assistsocial-br.vercel.app` — **200 OK** (Confirmado)

### 5.4. Teste de Acesso Direto às Rotas SPA (sem 404)
Validação das regras de rewrite em `apps/web/vercel.json`:
- `GET https://assistsocial-app.vercel.app/login` $\rightarrow$ **HTTP 200 OK** (`index.html`)
- `GET https://assistsocial-app.vercel.app/cadastro` $\rightarrow$ **HTTP 200 OK** (`index.html`)
- `GET https://assistsocial-app.vercel.app/recuperar-senha` $\rightarrow$ **HTTP 200 OK** (`index.html`)
- `GET https://assistsocial-app.vercel.app/admin/usuarios` $\rightarrow$ **HTTP 200 OK** (`index.html`)

### 5.5. Variáveis de Ambiente de Produção
Confirmadas e criptografadas no projeto `assistsocial` na Vercel para o target `Production`:
- `VITE_SUPABASE_URL` (Presente, Encrypted)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Presente, Encrypted)

---

## 6. Histórico de Commits e Sincronização com o GitHub

O repositório [`SALOMBRAS/assistsocial`](https://github.com/SALOMBRAS/assistsocial) está com a branch `main` sincronizada com 14 commits faseados (com squash merges sequenciais numerados de `#1` a `#13`), preservando a autoria e garantindo o rastreamento das contribuições no GitHub.


---

## 7. Correção do Contrato de Convite e Diagnóstico de Erros da Edge Function

### 7.1. Ajuste do Contrato do Payload
- Na chamada `supabase.functions.invoke('admin-invite-user', ...)`, o payload foi padronizado estritamente para `{ full_name, email, phone }`.
- O valor da variável `fullName` do formulário é convertido para `full_name`.
- O parâmetro `role` foi removido do corpo da requisição cliente; a função no servidor atribui o papel seguro padrão `social_worker`.
- Os rótulos visuais amigáveis da interface foram preservados integralmente.

### 7.2. Diagnóstico Estruturado de Erros (`parseEdgeFunctionError`)
Implementada diferenciação robusta dos erros do SDK `@supabase/supabase-js`:
- **`FunctionsHttpError`:** Extração segura do código HTTP (`status`) e do corpo JSON/texto retornado pelo endpoint, sem expor tokens ou cabeçalhos sensíveis:
  - `404 Not Found`: "A Edge Function 'admin-invite-user' está indisponível ou ainda não foi publicada no projeto Supabase (HTTP 404)."
  - `401 / 403`: "Sessão expirada ou acesso não autorizado (HTTP 401/403). Apenas a administradora global autenticada pode emitir convites."
  - `400 / 422`: Mensagem segura de validação de dados ou e-mail.
  - `409 Conflict`: "Este endereço de e-mail já possui um convite pendente ou já está cadastrado no sistema (HTTP 409)."
  - `500+`: Mensagem amigável de erro interno do servidor com o detalhe seguro retornado.
- **`FunctionsRelayError`:** "Falha no gateway do Supabase ao repassar a requisição para a Edge Function."
- **`FunctionsFetchError`:** "Falha de comunicação ou conexão de rede com o endpoint da Edge Function."

### 7.3. Rastreabilidade Git e Deploy
- **Branch da Alteração:** [`fix/edge-function-invite-contract`](https://github.com/SALOMBRAS/assistsocial/tree/fix/edge-function-invite-contract)
- **Squash Merge na `main`:** Commit `4c21ec0` (`fix(admin): update invite payload to { full_name, email, phone } and enhance edge function error diagnostics (#14)`).
- **Deployment Atualizado na Vercel:** `dpl_HUChdbdk28NMWygK2Br3CevzrSdy` (Status: `READY`), propagado para `assistsocial-app.vercel.app`, `assistsocial-gestao.vercel.app` e `assistsocial-br.vercel.app`.
