# 06. Configuração, Supabase CLI e Migrações

## 1. Informações de Conexão do Projeto

- **Supabase Project Reference:** `mnhzikgphdhohlhfsljz`
- **URL do Projeto:** `https://mnhzikgphdhohlhfsljz.supabase.co`
- **Publishable Key:** `sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG`

---

## 2. Variáveis de Ambiente

Crie ou verifique o arquivo `.env.local` na raiz do projeto contendo:

```env
VITE_SUPABASE_URL=https://mnhzikgphdhohlhfsljz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ptMlzvTfem36GITlkwZBZQ_ZuDvbkyG
```

> **Aviso de Segurança:** O arquivo `.env.local` está incluído no `.gitignore` para impedir que credenciais e chaves sejam versionadas no repositório Git.

---

## 3. Estado Atual da Conexão com o Supabase

1. **Supabase Cloud Remoto:** O servidor remoto está online e respondendo (Auth GoTrue `v2.197.0`).
2. **Supabase CLI:** A ferramenta de linha de comando (`npx supabase`) está operacional (`v2.122.0`).
3. **Autenticação Administrativa da CLI:** A CLI local ainda não possui a sessão autenticada com token pessoal (`SUPABASE_ACCESS_TOKEN`). Por isso, as migrations foram consolidadas localmente e testadas.

---

## 4. Procedimentos para Aplicar as Migrações no Projeto Remoto

Você tem duas opções simples e diretas para aplicar as migrações no Supabase:

### Opção A: Via Painel do Supabase (Mais Rápido e Seguro)
1. Acesse o SQL Editor do seu projeto:
   👉 [https://supabase.com/dashboard/project/mnhzikgphdhohlhfsljz/sql](https://supabase.com/dashboard/project/mnhzikgphdhohlhfsljz/sql)
2. Abra o arquivo `supabase/all_migrations.sql` gerado neste repositório.
3. Copie todo o conteúdo e cole no SQL Editor do painel.
4. Clique em **Run** (Executar).
5. Todas as tabelas, índices, triggers, funções de segurança e políticas RLS serão criadas instantaneamente.

### Opção B: Via Supabase CLI (Linha de Comando)
1. Gere um Personal Access Token no painel do Supabase:
   👉 [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. No seu terminal, faça o login na CLI:
   ```bash
   npx supabase login
   ```
   *(Ou defina a variável temporária de ambiente `$env:SUPABASE_ACCESS_TOKEN="seu_token"`)*
3. Vincule ao projeto remoto:
   ```bash
   npx supabase link --project-ref mnhzikgphdhohlhfsljz
   ```
4. Aplique todas as migrações:
   ```bash
   npx supabase db push
   ```

---

## 5. Ordem das Migrações Versionadas

Se preferir aplicar migração por migração, a sequência correta é:

1. `supabase/migrations/20261027170001_initial_schema.sql` (Tabelas, índices, constraints e triggers de ciclo/atualização).
2. `supabase/migrations/20261027170002_row_level_security.sql` (Ativação de RLS, funções seguras e políticas de permissão).
3. `supabase/migrations/20261027170003_storage_and_buckets.sql` (Criação do bucket `documents` e políticas de Storage).
4. `supabase/migrations/20261027170004_audit_and_triggers.sql` (Triggers automáticas para auditoria de atividades e compartilhamentos).
