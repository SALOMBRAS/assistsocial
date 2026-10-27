# Relatório de Implementação: Autenticação, Área Administrativa e Integração Supabase — AssistSocial

> **Conforme diretrizes oficiais de [jana 1.txt](file:///C:/Users/Londres31/Downloads/prompt/jana%201.txt)**  
> **Status:** Concluído com Sucesso  
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
- [`src/pages/Guards.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/Guards.tsx): Protetores de rota `ProtectedRoute`, `PublicOnlyRoute` e o novo `AdminRoute` (bloqueia o acesso a usuários sem o papel `global_admin` comprovado pelo backend).
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

1. **Compilação de Produção (`tsc -b && vite build`):** **APROVADO** (compilado em 1.79s sem erros).
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

## 5. Dependências Pendentes do Backend (Terminal 2)

1. **Bootstrap da Conta Global:**
   - A conta `janamendes055@gmail.com` precisa ser cadastrada no Supabase Auth e receber o papel `role = 'global_admin'` na tabela `public.profiles` pelo procedimento seguro do Terminal 2.
2. **Implantação da Edge Function `admin-invite-user`:**
   - A função em `supabase/functions/admin-invite-user` deve ser publicada no projeto remoto Supabase com acesso à API administrativa do Supabase Auth para despachar os convites oficiais.
