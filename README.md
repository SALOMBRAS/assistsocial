# AssistSocial

Plataforma completa para assistentes sociais organizarem atividades, compromissos, documentos e atendimentos, com controle rigoroso de acesso e segurança (Row Level Security no PostgreSQL).

## 🚀 Arquitetura do Projeto

- **`apps/web`**: Frontend SPA desenvolvido em React, TypeScript, Vite e TailwindCSS.
- **`supabase`**: Infraestrutura de banco de dados, migrações SQL, políticas RLS, Storage e Edge Functions.
- **`docs/backend`**: Documentação técnica detalhada de arquitetura, contratos e segurança.

## 📦 Configuração e Execução

### Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local` e configure as credenciais:
```bash
cp .env.example .env.local
```

### Frontend (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```

### Backend (`supabase`)
As migrações consolidadas estão disponíveis em `supabase/all_migrations.sql`.
O procedimento de bootstrap administrativo seguro está em `supabase/bootstrap_global_admin.sql`.
