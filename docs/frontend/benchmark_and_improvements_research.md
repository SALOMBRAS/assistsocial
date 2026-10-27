# Pesquisa de Benchmarks Open Source e Plano de Melhorias do AssistSocial

> **Documento Oficial de Engenharia de Frontend**  
> **Referência:** Instruções de benchmark e usabilidade de serviços sociais ([`jana 1.txt`](file:///C:/Users/Londres31/Downloads/prompt/jana%201.txt))  
> **Módulo:** `apps/web/`  
> **Data:** 27 de Outubro de 2026  
> **Status:** Em implementação faseada via PRs com Squash and Merge

---

## 1. Visão Geral e Objetivos

O **AssistSocial** é um sistema dedicado a assistentes sociais e equipes multidisciplinares da rede socioassistencial (CRAS, CREAS, Unidades de Acolhimento, Terceiro Setor e Saúde). O objetivo desta pesquisa é estudar sistemas open source de referência internacional e nacional nas áreas de:
- Gestão de casos sociais (*case management*).
- Linha do tempo de atendimentos e visitas domiciliares.
- Formulários de campo e tarefas móveis.
- Padrões de dados para diretórios de serviços humanos.
- Revisão técnica e conformidade de documentos.

A abordagem do AssistSocial adota **implementação independente e limpa (cleanroom)**, preservando a identidade visual própria, os tokens de acessibilidade e evitando contaminações de licenças restritivas (ex.: AGPL).

---

## 2. Análise Detalhada dos Projetos de Referência

### A. CaseLight
- **Repositório Oficial:** [`Lighthouse-Nonprofit/caselight`](https://github.com/Lighthouse-Nonprofit/caselight)
- **Licença:** MIT (Permissiva)
- **Funcionalidades Analisadas:**
  - *Dashboard e Navegação:* Visão rápida das tarefas prioritárias do dia e atendimentos pendentes.
  - *Agenda e Tarefas:* Visualização em múltiplos modos (dia, semana, lista e calendário), com categorização por tipo de serviço.
  - *Notificações e Lembretes:* Identificação proeminente de atividades vencidas (*overdue*).
  - *Notas e Histórico de Atendimento:* Registro cronológico com anexos e resumo de intervenções sociais.
- **Arquivo/Componente Relevante:** Padrões de componentes de painel em `client/src/components/dashboard` e lista de tarefas com estados vazios em `client/src/components/tasks`.
- **Ideia Aproveitável para o AssistSocial:**
  - Alternância rápida entre visualização em Grade (mês/semana) e Lista cronológica de atividades.
  - Cards de resumo do dia ("Foco do Dia") indicando pendências críticas antes de novos agendamentos.
  - Ações rápidas inline para reagendamento e conclusão de tarefas sem abrir modais complexos.
- **Como a Ideia é Adaptada:**
  - Construção de uma **Agenda Inteligente** em [`CalendarView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/CalendarView.tsx) com 4 modos (Mês, Semana, Dia, Lista), badges de atividades atrasadas e resumo diário.
  - Estilização estrita com a paleta oficial (`#F04491`, `#FCE5ED`, `#28232A`).
- **Riscos e Dependências:** Baixo risco. Utiliza dados já disponíveis na tabela `activities` do Supabase.

---

### B. CiviCRM / CiviCase
- **Repositório Oficial:** [`civicrm/civicrm-core`](https://github.com/civicrm/civicrm-core)
- **Licença:** AGPLv3 (Restritiva)
- **Funcionalidades Analisadas:**
  - *Linha do Tempo de Atendimento (*Case Activity Timeline*):* Apresentação cronológica integrada de todas as interações (visitas, ligações, reuniões e pareceres técnicos).
  - *Documentos Associados ao Caso:* Associação direta de laudos, documentos e relatórios à linha do tempo do atendimento.
  - *Histórico de Encaminhamentos:* Rastreamento de encaminhamentos para rede externa (saúde, educação, judiciário).
  - *Hierarquia Visual sem Sobrecarga:* Uso de acordeões e cartões modulares com tipografia legível.
- **Arquivo/Componente Relevante:** `CRM/Case/Page/CaseView.php` e esquemas de linha do tempo em `ang/crmCase/`.
- **Ideia Aproveitável para o AssistSocial:**
  - Estrutura de visualização de linha do tempo (*Case Timeline*) que consolida em uma única visão cronológica as visitas, relatórios e atendimentos de uma mesma família.
- **Como a Ideia é Adaptada:**
  - **Implementação 100% independente em TypeScript/React:** Nenhum trecho de código AGPL foi copiado. Criou-se o componente [`CaseTimelineView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/CaseTimelineView.tsx), consumindo dados estruturados de atividades e documentos.
- **Riscos e Dependências:**
  - *Alerta de Licença:* A licença AGPLv3 exige isolamento total de código. Reimplementação estritamente limpa.
  - *Dependência de Backend:* A vinculação de múltiplos atendimentos a um único identificador de caso/família (CadÚnico/NIS) necessita de chave estrangeira específica a ser fornecida pelo Terminal 2. A UI inicial consome as atividades existentes e disponibiliza o design da linha do tempo.

---

### C. CommCare
- **Repositório Oficial:** [`dimagi/commcare-hq`](https://github.com/dimagi/commcare-hq)
- **Licença:** BSD-3-Clause (Permissiva)
- **Funcionalidades Analisadas:**
  - *Experiência Mobile em Campo:* Interface desenhada para profissionais que realizam visitas domiciliares com conectividade intermitente.
  - *Indicadores de Tarefas Pendentes e Atrasadas:* Badges de contagem e filtros de urgência.
  - *Relatórios de Acompanhamento:* Geração de resumos executivos de produtividade da equipe e cobertura assistencial.
- **Arquivo/Componente Relevante:** Padrões de UI móvel e relatórios de campo em `corehq/apps/reports/`.
- **Ideia Aproveitável para o AssistSocial:**
  - Relatório executivo de atividades com filtros de intervalo temporal, exportação para CSV para prestação de contas aos órgãos gestores municipais e layout formatado para impressão oficial (`@media print`).
- **Como a Ideia é Adaptada:**
  - Componente [`ReportsView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ReportsView.tsx) com cálculo de métricas reais (concluídas, pendentes, atrasadas, não realizadas), exportação CSV em UTF-8 com BOM e botão de impressão estruturado.
- **Riscos e Dependências:** Baixo risco. Métricas computadas localmente a partir dos registros do Supabase do assistente social autenticado.

---

### D. OSCaR (Open-Source Case Record)
- **Repositório Oficial:** Gestão de casos sociais para proteção à infância e assistência familiar ([`open-source-case-record`](https://github.com/oscar-social/oscar-app))
- **Licença:** Open Source (GPL / Cleanroom)
- **Funcionalidades Analisadas:**
  - *Planos de Acompanhamento Familiar (PIA/PAIF):* Metas, ações planejadas e próximas etapas definidas em conjunto com a família.
  - *Encaminhamentos Intersetoriais:* Registro de entidades de destino, motivos de encaminhamento e retorno de devolutiva.
- **Arquivo/Componente Relevante:** Módulos de encaminhamento (`referrals`) e notas estruturadas.
- **Ideia Aproveitável para o AssistSocial:**
  - Exibição de "Próximas Ações Planejadas" na linha do tempo e vinculação com diretório de rede socioassistencial.
- **Como a Ideia é Adaptada:**
  - Seção integrada na Linha do Tempo de Atendimento para destacar as próximas providências técnicas requeridas pela intervenção.
- **Riscos e Dependências:** Coordenação com Terminal 2 para modelagem de tabela futura `case_referrals`.

---

### E. Open Referral / HSDS (Human Services Data Specification)
- **Repositório Oficial:** [`openreferral/specification`](https://github.com/openreferral/specification)
- **Licença:** CC-BY-SA 4.0 / Open Standard
- **Funcionalidades Analisadas:**
  - *Padrão Internacional de Diretório de Serviços Humanos:*
    - Nome do serviço e Organização prestadora (`service`, `organization`).
    - Categoria e Taxonomia (Assistência Social, Saúde, Acolhimento, Judiciário).
    - Público Atendido (famílias em vulnerabilidade, crianças, idosos, PCD).
    - Endereço físico e Município (`physical_address`).
    - Horários de atendimento (`regular_schedule`).
    - Requisitos de elegibilidade e documentação (`eligibility`, `required_documents`).
    - Recursos de acessibilidade física e comunicacional (`accessibility_for_disabilities`).
    - Canais de contato e formas de encaminhamento (`contact`, `service_at_location`).
- **Arquivo/Componente Relevante:** Esquemas JSON Schema e dicionário de dados da especificação HSDS 2.0/3.0.
- **Ideia Aproveitável para o AssistSocial:**
  - Criação de um **Diretório de Serviços Sociais** completo e estruturado conforme o padrão HSDS adaptado à realidade do SUAS (Sistema Único de Assistência Social brasileiro).
- **Como a Ideia é Adaptada:**
  - Componente [`ServicesDirectoryView.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/ServicesDirectoryView.tsx) com filtros por município, tipologia SUAS (CRAS, CREAS, Centro Pop, CAPS, Conselho Tutelar), acessibilidade PCD e requisitos de documentação.
- **Riscos e Dependências:**
  - *Dependência de Backend:* A persistência relacional do diretório no banco de dados depende de tabelas futuras (`social_services`, `service_taxonomies`) a serem migradas pelo Terminal 2. A interface no frontend já adota o contrato completo do HSDS e documenta com transparência a prontidão da camada de visualização.

---

### F. CIVORA
- **Repositório Oficial:** [`alrazihi/civora`](https://github.com/alrazihi/civora)
- **Licença:** Open Source
- **Funcionalidades Analisadas:**
  - *Fluxo de Trabalho e Auditoria:* Trilha clara de auditoria das decisões humanas tomadas em processos e concessões de benefícios.
  - *Verificação e Conferência de Documentos:* Lista de conferência (*checklist*) dos requisitos obrigatórios antes de despachar ou assinar um relatório ou benefício social.
  - *Revisão Assistida sem "IA Caixa-Preta":* Orientação passo a passo baseada em critérios objetivos, com confirmação expressa do operador humano.
- **Arquivo/Componente Relevante:** Telas de auditoria de conformidade e conferência de requisitos.
- **Ideia Aproveitável para o AssistSocial:**
  - Módulo de **Revisão Assistida de Documentos Técnicos**, oferecendo um checklist de conformidade com os parâmetros técnicos do Conselho Federal de Serviço Social (CFESS/CRESS) e orientações do SUAS:
    - 1. Identificação completa e sigilosa do usuário/família.
    - 2. Relato circunstanciado da demanda apresentada.
    - 3. Parecer técnico fundamentado teoricamente.
    - 4. Comprovantes e documentos essenciais anexados.
    - 5. Assinatura e registro CRESS válido.
- **Como a Ideia é Adaptada:**
  - Componente [`DocumentReviewAssistant.tsx`](file:///C:/Users/Londres31/Documents/DEV/apps/web/src/components/DocumentReviewAssistant.tsx) integrado à aba de Documentos, permitindo que o profissional faça a conferência ponto a ponto com registro de quem e quando revisou.
  - **Zero chamadas para serviços externos opacos:** Sem envio de dados confidenciais a provedores de IA sem autorização e sem risco de violação da LGPD ou do Código de Ética Profissional.
- **Riscos e Dependências:** Baixo risco. Estado de verificação gerenciado de forma segura no frontend com persistência prevista nos metadados da tabela `documents`.

---

## 3. Matriz de Melhorias e Roteiro de Implementação

| Fase / PR | Nome da Funcionalidade | Benchmark Inspirador | Status | Arquivo(s) Principal(is) |
| :--- | :--- | :--- | :--- | :--- |
| **PR 1** | **Agenda Inteligente** | CaseLight & CommCare | ✅ Em implementação | `src/components/CalendarView.tsx` |
| **PR 2** | **Relatórios de Atividades** | CommCare & CaseLight | ✅ Em implementação | `src/components/ReportsView.tsx` |
| **PR 3** | **Diretório de Serviços Sociais** | Open Referral / HSDS | ✅ Em implementação | `src/components/ServicesDirectoryView.tsx` |
| **PR 4** | **Linha do Tempo de Atendimento** | CiviCRM/CiviCase & OSCaR | ✅ Em implementação | `src/components/CaseTimelineView.tsx` |
| **PR 5** | **Revisão Assistida de Documentos** | CIVORA & Padrões CFESS | ✅ Em implementação | `src/components/DocumentReviewAssistant.tsx` |
| **Doc** | **Consolidação e Relatório Geral** | Todas as fontes | ✅ Em implementação | `docs/frontend/` |

---

## 4. Preservação da Identidade Visual e Tokens

Todos os novos componentes seguem rigorosamente a paleta de cores e o guia de design do AssistSocial:
- **Rosa Principal:** `#F04491` (ações primárias, botões, ícones ativos)
- **Rosa Secundário:** `#F58BB5` (bordas ativas, gradientes decorativos)
- **Rosa Claro:** `#FCE5ED` (badges, fundos de seleção e hover)
- **Fundo Global:** `#FFF9FB`
- **Superfície:** `#FFFFFF` (cards com `rounded-3xl` e sombras sutis)
- **Texto Principal:** `#28232A` (contraste acessível)
- **Texto Secundário:** `#827780`
- **Verde Sucesso:** `#36A879` (badges de concluído e conformidade)
- **Tipografia:** `Plus Jakarta Sans`
- **Acessibilidade:** Navegação por teclado, rótulos claros para leitores de tela e áreas de toque mínimas de 44px no mobile.
