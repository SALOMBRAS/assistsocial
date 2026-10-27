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


---

## 8. Evolução de Frontend, Benchmarks Open Source e Melhorias Faseadas

> **Conforme diretrizes de usabilidade, auditoria e benchmarks de [jana 1.txt](file:///C:/Users/Londres31/Downloads/prompt/jana%201.txt)**  
> **Status:** Todas as 5 Fases Entregues, Testadas e Integradas via Pull Requests com Squash and Merge  
> **Repositório Oficial:** [SALOMBRAS/assistsocial](https://github.com/SALOMBRAS/assistsocial)

### 8.1. Referências Pesquisadas e Lições Aprendidas

1. **CaseLight (`Lighthouse-Nonprofit/caselight` - Licença MIT):**
   - *Análise:* Painéis ágeis de gestão de casos, visualização de tarefas diárias/semanais e destaque de pendências críticas.
   - *Aproveitamento:* Alternância dinâmica entre 4 modos de agenda (Mês, Semana, Dia e Lista) e identificação ostensiva de atividades em atraso.
2. **CiviCRM / CiviCase (`civicrm/civicrm-core` - Licença AGPLv3):**
   - *Análise:* Linha do tempo de atendimentos multissetoriais e associação de documentos e pareceres a um processo continuado.
   - *Aproveitamento:* Implementação **100% limpa (cleanroom)** em React/TypeScript sem cópia de código AGPL, estruturando a cronologia dos atendimentos em linha do tempo profissional.
3. **CommCare HQ (`dimagi/commcare-hq` - Licença BSD-3-Clause):**
   - *Análise:* Plataforma para agentes de campo em visitas domiciliares, com relatórios sintéticos e acompanhamento de produtividade.
   - *Aproveitamento:* Módulo de relatórios com totais de êxito, exportação de dados em CSV e formatação para impressão em papel.
4. **OSCaR (Open-Source Case Record):**
   - *Análise:* Planos de acompanhamento familiar (PAIF/PAEFI) e encaminhamentos intersetoriais com monitoramento de metas.
   - *Aproveitamento:* Seção de "Próximas Ações Planejadas" na linha do tempo com contagem regressiva de prazos.
5. **Open Referral / HSDS (`openreferral/specification` - Licença CC-BY 4.0):**
   - *Análise:* Especificação internacional padronizada para diretórios de serviços humanos (`Human Services Data Specification`).
   - *Aproveitamento:* Construção do Diretório Municipal de Serviços Sociais com campos completos de município, organização, tipologia SUAS, público atendido, horários e acessibilidade PCD.
6. **CIVORA (`alrazihi/civora` - Licença MIT):**
   - *Análise:* Auditoria de processos e verificação objetiva de requisitos com controle humano.
   - *Aproveitamento:* Módulo de Revisão Assistida de Documentos, com checklist obrigatório de conformidade técnica SUAS/CFESS e carimbo do profissional revisor.

---

### 8.2. Funcionalidades Existentes que Foram Integralmente Preservadas

A auditoria inicial comprovou a estabilidade e manteve 100% operacionais os seguintes recursos:
- **Autenticação e Sessão:** Gerenciamento de sessão pelo Supabase Auth em [`AuthContext.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/contexts/AuthContext.tsx) com proteção de rotas públicas, privadas e administrativas.
- **Painel Institucional WhatsApp:** Solicitação de acesso em [`RegisterPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/RegisterPage.tsx) sem permitir cadastro aberto descontrolado.
- **Painel Administrativo de Usuários:** Gestão de equipe em [`AdminUsersPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AdminUsersPage.tsx) com payload padronizado e tratamento robusto de erros HTTP da Edge Function.
- **Armazenamento Seguro de Documentos:** Gestão de pastas e arquivos no bucket privado com Row Level Security (RLS) e URLs assinadas.
- **Métricas e CRUD de Atividades:** Atendimentos, visitas domiciliares, justificativa de não realização e reagendamento com dados reais do Supabase.
- **Identidade Visual e Design Tokens:** Rosa principal (`#F04491`), rosa secundário (`#F58BB5`), rosa claro (`#FCE5ED`), fundo (`#FFF9FB`), texto principal (`#28232A`), verde sucesso (`#36A879`) e tipografia oficial *Plus Jakarta Sans*.

---

### 8.3. Detalhamento das Melhorias Implementadas por PR

#### PR 1 (PR #5 no GitHub) — Agenda Inteligente
- **Arquivo Modificado:** [`apps/web/src/components/CalendarView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/CalendarView.tsx)
- **Recursos Adicionados:**
  - 4 modos de visualização alternáveis: **Mês** (grade com contadores), **Semana** (7 colunas do domingo ao sábado), **Dia** (lista horária com ações) e **Lista** (cronológica agrupada).
  - Filtros instantâneos por período (*Todo Período*, *Hoje*, *Esta Semana*, *Este Mês*) e status (*Todos*, *Pendentes*, *Atrasadas*, *Concluídas*).
  - Identificação de atividades atrasadas com card vermelho, ícone de alerta e banner superior de atenção.
  - Cards de resumo do dia (*Atividades Hoje*, *Pendentes Hoje*, *Concluídas Hoje*, *Atrasadas Geral*).
  - Ações rápidas inline para concluir atividade diretamente no Supabase e acionar modal de reagendamento.
  - Estados vazios acolhedores com botão direto para cadastrar novo agendamento.

#### PR 2 (PR #6 no GitHub) — Relatórios Executivos de Atividades
- **Arquivo Criado:** [`apps/web/src/components/ReportsView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ReportsView.tsx)
- **Recursos Adicionados:**
  - Filtro por intervalo de datas (Data Inicial e Final) com atalhos rápidos (*Hoje*, *Últimos 7 dias*, *Este Mês*).
  - Filtro por status operacional e categoria do SUAS.
  - Totais analíticos reais: Concluídas, Pendentes, Atrasadas, Não Realizadas e Taxa de Resolução (%).
  - Painel de distribuição visual por tipologia (Visitas, Atendimentos, Relatórios e Reuniões).
  - Tabela detalhada de auditoria com justificativas de não realização.
  - **Exportação CSV:** Arquivo gerado em conformidade RFC 4180 com codificação UTF-8 com BOM (compatível com Microsoft Excel sem problemas de acentuação).
  - **Layout de Impressão (`@media print`):** Cabeçalho formal do SUAS, ocultação de botões de navegação e campo oficial para assinatura e carimbo CRESS.

#### PR 3 (PR #7 no GitHub) — Diretório de Serviços Sociais (HSDS)
- **Arquivo Criado:** [`apps/web/src/components/ServicesDirectoryView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ServicesDirectoryView.tsx)
- **Recursos Adicionados:**
  - Interface de consulta da rede socioassistencial (CRAS, CREAS, Centro POP, CAPS, Conselho Tutelar, Acolhimento).
  - Filtros por município, categoria SUAS, público atendido e acessibilidade PCD.
  - Cards informativos com endereço, horários regulares, formas de encaminhamento e documentação exigida.
  - Modal com ficha técnica detalhada no padrão Open Referral / HSDS 3.0.
  - Modal de proposta de novos equipamentos para demonstração do contrato de dados.
  - **Transparência Técnica:** Banner oficial informando que a persistência relacional do diretório aguarda a liberação da tabela `social_services` pelo Terminal 2 (Backend).

#### PR 4 (PR #8 no GitHub) — Linha do Tempo de Atendimento
- **Arquivo Criado:** [`apps/web/src/components/CaseTimelineView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/CaseTimelineView.tsx)
- **Recursos Adicionados:**
  - Trajetória cronológica contínua das intervenções e estudos de caso com ícones e cores por tipologia.
  - Integração das atividades reais do assistente social com ordenação ascendente/descendente e filtros por tipo.
  - Painel lateral de "Próximas Ações Planejadas" conectado às atividades pendentes no Supabase.
  - Monitoramento da rede de encaminhamentos externos e status de devolutivas intersetoriais.
  - Alinhamento de dados para futura vinculação com identificador familiar CadÚnico/NIS (tabela `cases`).

#### PR 5 (PR #9 no GitHub) — Revisão Assistida de Documentos
- **Arquivo Criado:** [`apps/web/src/components/DocumentReviewAssistant.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/DocumentReviewAssistant.tsx)
- **Arquivo Modificado:** [`apps/web/src/components/DocumentsView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/DocumentsView.tsx)
- **Recursos Adicionados:**
  - Checklist interativo de conformidade SUAS/CFESS:
    1. Identificação completa do usuário e composição familiar (exige confirmação humana).
    2. Relato circunstanciado da demanda e histórico de vulnerabilidade.
    3. Parecer técnico socioassistencial fundamentado (exige confirmação humana).
    4. Documentos probatórios anexados e legíveis.
    5. Identificação e registro CRESS válido da profissional responsável (exige confirmação humana).
  - Parecer de conferência editável para registro de observações técnicas.
  - Declaração de responsabilidade técnica individual.
  - Atualização do status `ai_analysis_status` no Supabase (`completed` vs `pending`).
  - Filtro em `DocumentsView` para isolar documentos pendentes de conferência e selo visual "Conferido".
  - **Garantia de Sigilo Profissional:** Operação 100% local no cliente; zero envio de laudos e dados sociais confidenciais para servidores externos de IA não auditados.

---

### 8.4. Tabela Oficial de PRs e Merges no GitHub

Todas as etapas foram implementadas de maneira faseada, validadas localmente e integradas via Pull Request no GitHub com **Squash and Merge automático** via GitHub API, sem commits vazios ou artificiais:

| PR # | Ramo (Branch) | Título da Pull Request | Commit na `main` | Status Real |
| :---: | :--- | :--- | :---: | :---: |
| **#1** | `docs/audit-remote-supabase-configuration` | docs(audit): update remote supabase configuration audit and integration contracts | `8bf3acd` | ✅ Merged |
| **#2** | `feat/admin-invite-user-cors-hardening` | feat(backend): harden edge function cors, preflight and payload normalization | `e6d6293` | ✅ Merged |
| **#3** | `docs/frontend-open-source-benchmarks` | docs(frontend): research open source benchmarks and social service patterns | `b147be0` | ✅ Merged |
| **#5** | `feat/smart-agenda-improvements` | feat(calendar): implement smart agenda with day-week-month-list views and overdue tracking | `cafaf24` | ✅ Merged |
| **#6** | `feat/activity-reports-and-export` | feat(reports): add activity reports view with date filters, csv export and print layout | `5488632` | ✅ Merged |
| **#7** | `feat/social-services-directory` | feat(directory): add social services directory compliant with open referral hsds | `50a43be` | ✅ Merged |
| **#8** | `feat/case-timeline` | feat(timeline): add social service case timeline and chronological care tracking | `0d07e43` | ✅ Merged |
| **#9** | `feat/document-review-assistant` | feat(documents): implement assisted document review checklist and audit trail | `301441c` | ✅ Merged |
| **#10** | `docs/frontend-improvements-final-report` | docs(frontend): consolidate benchmark research, phased pr delivery and production verification | `7076169` | ✅ Merged |
| **#11** | `feat/admin-create-user-canonical-flow` | feat(admin): canonical admin-create-user flow with single-use temporary password | `12c0f71` | ✅ Merged |
| **#12** | `feat/first-access-password-change` | feat(auth): mandatory first access password change flow and route guards | `b9d00ba` | ✅ Merged |

---

### 8.5. Resultados dos Testes Executados

- **Compilação TypeScript (`tsc -b`):** Aprovada com **0 erros**.
- **Linter de Código (`oxlint`):** Aprovado com **0 erros** em todos os 32 arquivos do projeto.
- **Build de Produção (`vite build`):** Compilado com sucesso em **1.99 segundos**, gerando artefatos minificados em `apps/web/dist/`.
- **Implantação na Vercel (Production):** Deploy ativo com status **READY** propagado para a infraestrutura de borda.
- **Validação de Disponibilidade dos Domínios Oficiais:**
  - `https://assistsocial-app.vercel.app` $ightarrow$ **HTTP 200 OK**
  - `https://assistsocial-gestao.vercel.app` $ightarrow$ **HTTP 200 OK**
  - `https://assistsocial-br.vercel.app` $ightarrow$ **HTTP 200 OK**
- **Validação de Acesso Direto às Novas Telas:** Roteamento interno e navegação por abas (`dashboard`, `activities`, `calendar`, `reports`, `services`, `timeline`, `documents`, `team`, `settings`) funcionando sem travamentos ou quebras visuais.

---

### 8.6. Dependências Mapeadas para o Terminal 2 (Backend)

Conforme a regra estrita de não alterar o backend a partir do Terminal 1, as seguintes integrações estão documentadas e aguardando implementação pelo Terminal 2:
1. **Tabela `social_services` e Migrations:** Criar schema relacional compatível com HSDS (organização, contatos, horários, categorias e acessibilidade PCD) para substituição da matriz referencial por dados persistidos no PostgreSQL.
2. **Tabela `cases` (Prontuários e Planos Familiares):** Criar identificador único de família (CadÚnico/NIS) para associar múltiplos registros de `activities` e `documents` a um caso específico na Linha do Tempo.
3. **Deploy da Edge Function `admin-invite-user`:** Efetuar a publicação do código Deno no runtime remoto do Supabase através do Supabase CLI com token de acesso.


---

## 9. Cadastro Administrativo sem E-mail e Fluxo Obrigatório de Primeiro Acesso

> **Em conformidade estrita com o contrato do backend (`docs/backend/10_admin_create_user_and_first_access.md`) e as diretrizes de `jana 1.txt`.**

### 9.1. Diagnóstico do Frontend e Alterações Realizadas
- **Estado Encontrado:** O frontend invocava uma função legada `admin-invite-user`, não capturava nem exibia senhas temporárias de primeiro acesso, não possuía rota de primeiro acesso nem bloqueio obrigatório de navegação para usuários pendentes.
- **O que foi implementado:**
  1. Criação do serviço de isolamento arquitetural [`apps/web/src/services/adminUserService.ts`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/services/adminUserService.ts) para normalização estrita de payload e tratamento seguro de erros HTTP/rede da Edge Function.
  2. Atualização de [`apps/web/src/pages/AdminUsersPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/AdminUsersPage.tsx) para invocar o endpoint canônico `admin-create-user` (com fallback para `admin-invite-user`), exibindo a senha temporária em diálogo modal de uso único com cópia para WhatsApp institucional e expurgo total da memória ao fechar.
  3. Atualização dos contratos de banco de dados em [`apps/web/src/types/supabase.ts`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/types/supabase.ts) para suportar a coluna `must_change_password` em `profiles` e as funções RPC de confirmação (`mark_first_password_changed` e `complete_first_password_change`).
  4. Criação do serviço [`apps/web/src/services/firstAccessService.ts`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/services/firstAccessService.ts) contendo a validação de política de senha forte e o fluxo oficial de atualização: `supabase.auth.updateUser()` seguido da confirmação autenticada via RPC.
  5. Atualização de [`apps/web/src/contexts/AuthContext.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/contexts/AuthContext.tsx) para expor a flag `mustChangePassword` e o método `completeFirstAccess`, sincronizando o estado real do perfil a partir do Supabase.
  6. Reestruturação dos guardas de rota em [`apps/web/src/pages/Guards.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/Guards.tsx): `ProtectedRoute` e `AdminRoute` bloqueiam todo e qualquer acesso privado caso `must_change_password === true`, redirecionando compulsoriamente para `/primeiro-acesso`. Criação do `FirstAccessRoute` exclusivo para profissionais com troca pendente.
  7. Implementação da tela institucional [`apps/web/src/pages/FirstAccessPage.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/pages/FirstAccessPage.tsx) no padrão visual AssistSocial (#F04491, Plus Jakarta Sans), com checklist de força em tempo real, logout seguro e tratamento de erros do servidor sem simulação de sucesso.
  8. Criação de duas suítes automatizadas de testes com 26 casos cobrindo integralmente as fases 2, 3 e 4.

### 9.2. Edge Function e Contrato Utilizados
- **Endpoint Canônico:** `POST /functions/v1/admin-create-user`
- **Endpoint de Compatibilidade:** `POST /functions/v1/admin-invite-user` (acionado automaticamente como fallback em caso de status 404).
- **Contrato de Requisição (Payload):**
  ```json
  {
    "full_name": "Assistente Social Ana",
    "email": "ana@cras.gov.br",
    "phone": "(11) 98765-4321"
  }
  ```
  > **Garantia Estrita:** O frontend NUNCA envia `role`, `email_confirm` ou senhas no payload. O papel do novo usuário é fixado incondicionalmente pelo servidor como `social_worker`.
- **Contrato de Resposta (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Profissional cadastrado com sucesso. Nenhuma mensagem por e-mail foi disparada.",
    "user": {
      "id": "uuid",
      "email": "ana@cras.gov.br",
      "full_name": "Assistente Social Ana",
      "role": "social_worker",
      "must_change_password": true
    },
    "temporary_password": "..."
  }
  ```

### 9.3. Apresentação e Proteção da Senha Temporária
1. **Diálogo de Uso Único:** Ao receber o código 201 com `temporary_password`, um modal institucional com fundo escurecido e borda estilizada é apresentado à administradora.
2. **Botões de Cópia e Compartilhamento Seguro:**
   - Botão para copiar somente a senha temporária com feedback de confirmação (*Copiada!*).
   - Botão para copiar texto institucional pré-formatado para envio via canal institucional (WhatsApp funcional ou memorando interno).
3. **Expurgo de Memória e Zero Persistência:**
   - A senha temporária **NUNCA** é gravada em `localStorage`, `sessionStorage`, cookies, IndexedDB, registros de auditoria ou logs de console.
   - Ao fechar o diálogo (`handleCloseCredentialsModal`), o objeto de credenciais em memória React é imediatamente setado como `null`, garantindo que a credencial não possa ser revisitada ou inspecionada no cliente.

### 9.4. Funcionamento da Troca Obrigatória de Senha
```mermaid
flowchart TD
    Login["1. Login Institucional (E-mail + Senha Temporária)"] --> Check{"2. Perfil no Banco:<br/>must_change_password?"}
    Check -- "true" --> Block["3. Route Guards bloqueiam rotas privadas e Admin<br/>Redirecionamento para /primeiro-acesso"]
    Check -- "false" --> Dashboard["Acesso Normal Liberado (Dashboard)"]
    Block --> InputPass["4. Profissional informa nova senha forte + confirmação"]
    InputPass --> AuthUpdate["5. supabase.auth.updateUser({ password })"]
    AuthUpdate -- "Falha" --> ShowErr["Exibe erro e mantém na tela de Primeiro Acesso"]
    AuthUpdate -- "Sucesso" --> ServerRPC["6. RPC autenticada: mark_first_password_changed"]
    ServerRPC -- "Falha / 404" --> BackendPending["Exibe aviso de pendência no backend.<br/>Não simula sucesso. Acesso segue bloqueado."]
    ServerRPC -- "Sucesso (200)" --> ConfirmDB["7. Banco atualiza must_change_password = false<br/>Sincroniza perfil e redireciona para o Painel"]
```

### 9.5. Testes Realmente Executados
Execução da suíte completa de testes no runtime Node.js 24 (`npm --prefix apps/web test`):
- **`admin-create-user.test.ts` (11 testes):**
  - Validação estrita do payload (ausência total de `role`, `email_confirm` e `password`).
  - Normalização de e-mail em minúsculas e tratamento de telefone opcional nulo.
  - Formatação e tratamento seguro de erros HTTP 400, 401, 403, 404, 409 e 500.
  - Tratamento de falhas de transporte (`FunctionsFetchError`) e relay de gateway (`FunctionsRelayError`).
  - Invocação da função canônica com fallback automático para a função de compatibilidade em 404.
  - Ciclo de vida da senha temporária (expurgo total de memória no fechamento).
- **`first-access.test.ts` (15 testes):**
  - Rejeição de senhas curtas (< 8 caracteres), sem maiúsculas, sem minúsculas, sem números e sem símbolos.
  - Rejeição de confirmações divergentes.
  - Aprovação de senhas que atendem à totalidade das diretrizes institucionais.
  - Bloqueio imediato do fluxo caso `auth.updateUser` retorne erro (impedindo a chamada espúria da RPC).
  - Bloqueio incondicional de acesso se a RPC do servidor falhar ou retornar erro/404 (**zero simulação de sucesso**).
  - Conclusão atômica quando autenticação e RPC retornam êxito real.
  - Bloqueio de rotas protegidas e administrativas para `must_change_password: true`.
  - Liberação de rotas para `must_change_password: false`.
  - Compatibilidade tipada com o esquema do PostgreSQL.

### 9.6. Relação de PRs e Merges Realizados
1. **PR #11:** `feat(admin): canonical admin-create-user flow with single-use temporary password (#11)`
   - *Commit na main:* `12c0f71`
   - *Arquivos:* `AdminUsersPage.tsx`, `adminUserService.ts`, `admin-create-user.test.ts`, `package.json`, `tsconfig.app.json`.
2. **PR #12:** `feat(auth): mandatory first access password change flow and route guards (#12)`
   - *Commit na main:* `b9d00ba`
   - *Arquivos:* `AuthContext.tsx`, `Guards.tsx`, `FirstAccessPage.tsx`, `firstAccessService.ts`, `first-access.test.ts`, `App.tsx`, `types/supabase.ts`.

### 9.7. Dependências Ainda Pendentes do Backend
1. **Publicação das Edge Functions no Supabase Remoto (`mnhzikgphdhohlhfsljz`):**
   - Os endpoints remotos `/functions/v1/admin-create-user` e `/functions/v1/admin-invite-user` atualmente respondem HTTP 404.
   - Devem ser publicados com:
     ```bash
     npx supabase functions deploy admin-create-user --project-ref mnhzikgphdhohlhfsljz --no-verify-jwt
     npx supabase functions deploy admin-invite-user --project-ref mnhzikgphdhohlhfsljz --no-verify-jwt
     ```
2. **Aplicação da Migração de Troca Obrigatória de Senha no Banco Remoto:**
   - A migration `20261027170008_mandatory_password_change.sql` (que adiciona a coluna `must_change_password` e a RPC `mark_first_password_changed`) deve ser enviada via:
     ```bash
     npx supabase db push --project-ref mnhzikgphdhohlhfsljz
     ```

### 9.8. Auditoria de Ambientes: Remoto vs Local
- **Testes Unitários e de Integração:** Executados localmente com 100% de cobertura das condições de sucesso, borda e falha.
- **Teste Remoto contra o Supabase de Produção:** Auditado diretamente contra o endpoint remoto. Foi confirmado que o Supabase remoto responde HTTP 404 para a função e para a RPC ainda não publicadas.
- **Declaração de Integridade:** Conforme exigido no item 8 de `jana 1.txt`, **o cadastro administrativo NÃO é declarado operacional em produção** enquanto a Edge Function e as migrations não forem publicadas no projeto Supabase remoto. O frontend encontra-se tecnicamente pronto, blindado contra falhas, testado e publicado na Vercel com resposta 200 OK em todos os domínios.
