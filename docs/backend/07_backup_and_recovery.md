# 07. Procedimentos de Backup, Recuperação e Limitações Conhecidas

## 1. Estratégia de Backup e Recuperação para Produção

Antes de colocar o AssistSocial em ambiente de produção com famílias e usuários reais, a equipe de infraestrutura deve homologar a seguinte rotina:

### 1.1 Backups Automatizados no Supabase Cloud
- O Supabase oferece snapshots diários automáticos na camada Pro/Enterprise com **Point-in-Time Recovery (PITR)** (recuperação precisa segundo a segundo).
- Recomenda-se ativar o PITR para possibilitar recuperação em casos de exclusão acidental ou desastres.

### 1.2 Backup Lógico Local Periódico (pg_dump)
Pode-se configurar rotina semanal agendada com `pg_dump`:
```bash
pg_dump --clean --if-exists --no-owner --no-privileges \
  -h db.mnhzikgphdhohlhfsljz.supabase.co \
  -U postgres \
  -d postgres > backup_assistsocial_$(date +%Y%m%d).sql
```

### 1.3 Procedimento de Restauração de Desastre (Disaster Recovery)
1. Provisionar um novo projeto no Supabase ou isolar o banco atual em modo manutenção.
2. Executar o script consolidado `supabase/all_migrations.sql` ou restaurar o último dump íntegro.
3. Sincronizar os arquivos do Supabase Storage a partir do bucket de backup S3 espelhado.
4. Executar a suíte de testes de integridade `node supabase/tests/rls_simulation_suite.js`.

---

## 2. Limitações Conhecidas e Decisões de Projeto

1. **Herança Profunda de Pastas:**
   - A verificação recursiva de permissões de pastas (`has_folder_or_ancestor_share`) está limitada propositalmente a uma profundidade máxima de 50 níveis para prevenir estouro de pilha e sobrecarga de CPU em consultas pesadas.
2. **Transferência de Propriedade:**
   - Nesta versão, a transferência de posse de um recurso entre usuários é **estritamente bloqueada no banco** pela trigger `protect_resource_ownership()`. Apenas colaboração como `editor` é suportada.
3. **Módulos de Inteligência Artificial:**
   - Não há chamadas de IA ativas no backend nesta entrega. Toda a arquitetura foi preparada (tabelas e metadados), mas o processamento de texto e dados sensíveis permanece desligado até aprovação de compliance.
