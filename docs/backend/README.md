# AssistSocial — Documentação Técnica do Backend

Bem-vindo à documentação oficial da infraestrutura de backend, banco de dados e segurança do **AssistSocial** (Terminal 2 e Terminal 3).

---

## 📚 Índice de Documentos

1. [01. Arquitetura do Backend e Visão Geral](./01_architecture.md)
   - Visão geral da plataforma, isolamento de camadas e preparação para IA.
2. [02. Modelo de Dados e Relacionamentos](./02_database_models_and_relations.md)
   - Estrutura completa das tabelas, dicionário de campos, integridade e diagramas.
3. [03. Segurança e Row Level Security (RLS)](./03_security_and_rls.md)
   - As regras mandatórias de proteção, funções auxiliares, proteção contra usurpação e herança de pastas.
4. [04. Armazenamento e Supabase Storage](./04_storage_and_documents.md)
   - Configuração do bucket privado `documents`, restrições de MIME, políticas de upload e download.
5. [05. Contratos de Dados e Integração com o Frontend (Terminal 1)](./05_contracts_and_frontend_integration.md)
   - Interfaces TypeScript, compatibilidade com o Terminal 1, telas de login/cadastro e exemplos de consumo.
6. [06. Configuração, Supabase CLI e Migrations](./06_supabase_setup_and_migrations.md)
   - Instruções de desenvolvimento local, credenciais de ambiente, linking remoto e aplicação de migrações.
7. [07. Backup, Recuperação e Limitações Conhecidas](./07_backup_and_recovery.md)
   - Políticas de snapshot, PITR, restauração de emergência e roadmap de limitações.
8. [08. Administradora Global, Cadastro e Convites](./08_global_admin_and_invites.md)
   - Governança de acesso administrativo, unicidade de `global_admin`, restrição de cadastro e Edge Function `admin-invite-user`.
9. [09. Pesquisa de Referências Open Source, Auditoria e Matriz de Funcionalidades](./09_open_source_benchmarks_and_roadmap.md)
   - Benchmarking de projetos abertos (CaseLight, CiviCase, CommCare, OSCaR, Open Referral, CIVORA), auditoria da arquitetura atual, análise de licenças e matriz estratégica de evolução.
10. [10. Cadastro Administrativo sem E-mail e Troca Obrigatória de Senha](./10_admin_create_user_and_first_access.md)
   - Especificação canônica da Edge Function `admin-create-user`, geração de senha temporária de uso único, eliminação de disparo de e-mails, RPCs seguras de troca de senha no primeiro acesso e governança anti-órfãos.
11. [11. Residenciais (Paupina e Joaquim Machado), Dossiês, Lotes e Anexos de Atividades](./11_residenciais_dossiers_and_attachments.md)
   - Gestão territorial, acompanhamento de dossiês pelos 8 indicadores, envios de lotes, controle de procurações para quem não assina e anexos de relatórios técnicos em atividades via Supabase Storage.
12. [12. Modo Simples dos Residenciais — Indicadores Agregados e Sigilo LGPD](./12_residential_simple_mode.md)
   - Arquitetura, persistência atômica e auditoria de indicadores agregados por residencial com conformidade total à LGPD (sem nomes, CPFs ou arquivos confidenciais), preservando o Modo Avançado.

---

## 🚀 Resumo Rápido da Configuração

- **Ambiente Remoto:** Supabase Cloud
- **Project Reference:** `mnhzikgphdhohlhfsljz`
- **URL Base:** `https://mnhzikgphdhohlhfsljz.supabase.co`
- **Chave Pública da Aplicação:** `sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG`
- **Diretório das Migrações:** `supabase/migrations/`
- **Script de Bootstrap:** `supabase/bootstrap_global_admin.sql`
- **Edge Function Principal:** `supabase/functions/admin-create-user/index.ts`
- **Edge Function de Compatibilidade:** `supabase/functions/admin-invite-user/index.ts`
- **Contratos TypeScript:** `supabase/types.ts`
- **Suíte de Testes Automatizada:** `supabase/tests/`
