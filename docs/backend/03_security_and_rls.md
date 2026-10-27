# 03. Segurança e Row Level Security (RLS)

O AssistSocial lida com relatórios sociais, termos de visitação e prontuários com dados protegidos. A segurança é aplicada na camada mais profunda: o banco de dados PostgreSQL.

---

## 1. As 10 Regras Fundamentais de Segurança

| # | Regra Fundamental | Mecanismo de Implementação |
|---|-------------------|----------------------------|
| 1 | **Consulta a recursos privados** | O usuário autenticado consulta apenas recursos onde `owner_id = auth.uid()` ou onde exista compartilhamento aceito. |
| 2 | **Recursos compartilhados autorizados** | Apenas convites com status `accepted` concedem acesso. |
| 3 | **Restrição de Viewer** | A permissão `viewer` concede acesso estritamente a comandos `SELECT`. Comandos de escrita (`UPDATE`, `DELETE`) falham. |
| 4 | **Imutabilidade de Propriedade** | A trigger `protect_resource_ownership()` rejeita qualquer requisição onde `NEW.owner_id <> OLD.owner_id`. |
| 5 | **Convites pendentes** | O helper `has_active_share` exige `status = 'accepted'`. Registros com `status = 'pending'` retornam `FALSE`. |
| 6 | **Revogação imediata** | Quando o proprietário revoga o acesso (`status = 'revoked'` ou `revoked_at IS NOT NULL`), o acesso cessa instantaneamente. |
| 7 | **Isolamento de Documentos** | O Supabase Storage verifica a autorização do documento na tabela `public.documents` antes de permitir download. |
| 8 | **Regras de Pastas** | O compartilhamento de um documento avulso não vaza os outros documentos da mesma pasta. |
| 9 | **Separação Administrativa** | Usuários não podem elevar suas próprias permissões; o papel de serviço e admin operam fora das políticas convencionais. |
| 10 | **Impossibilidade de bypass por requisição** | Políticas com cláusulas `WITH CHECK` impedem que o cliente envie `owner_id` de terceiros em inserções ou atualizações. |

---

## 2. Matriz de Permissões Granulares

| Ação | Proprietário | Editor Autorizado | Comentador Autorizado | Visualizador Autorizado | Terceiros / Anon |
|---|:---:|:---:|:---:|:---:|:---:|
| **Consultar Atividade / Documento** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ❌ Negado |
| **Atualizar Atributos do Recurso** | ✅ Sim | ✅ Sim | ❌ Não | ❌ Não | ❌ Negado |
| **Alterar Proprietário (`owner_id`)** | ❌ Proibido | ❌ Proibido | ❌ Proibido | ❌ Proibido | ❌ Proibido |
| **Adicionar Comentários** | ✅ Sim | ✅ Sim | ✅ Sim | ❌ Não | ❌ Negado |
| **Excluir Recurso** | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Negado |
| **Criar / Revogar Compartilhamento** | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Negado |
| **Download de Arquivo no Storage** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ❌ Negado |

---

## 3. Análise e Comportamento de Compartilhamento de Pastas (Herança)

O sistema implementa a função com suporte recursivo `has_folder_or_ancestor_share`:
- **Documento em Pasta Compartilhada:** Se a pasta pai (ou qualquer ancestral) tiver um compartilhamento aceito para o usuário, ele tem acesso de visualização/edição ao documento.
- **Documento Específico Compartilhado:** Se apenas um arquivo dentro de uma pasta privada for compartilhado, o convidado **tem acesso exclusivamente àquele arquivo**, permanecendo os demais arquivos da pasta 100% inacessíveis e invisíveis (verificado pelo Teste 8 da suíte automatizada).
- **Revogação na Pasta:** A revogação na pasta ancestral revoga o acesso recursivo em cascata em tempo real.


---

## 4. Blindagem de Privacidade da Tabela `public.profiles`

Em conformidade com a auditoria de autenticação e privacidade:
- **Consulta (`SELECT`):** Restrita ao próprio usuário (`id = auth.uid()`) ou a colegas com quem haja compartilhamento mútuo aceito na tabela `public.resource_shares`.
- **Criação / Inserção (`INSERT`):** Realizada via trigger `on_auth_user_created` a partir do `auth.users`, ou pelo próprio usuário (`id = auth.uid()`).
- **Atualização (`UPDATE`):** Estritamente pelo próprio usuário (`id = auth.uid()`).
- **Prevenção de Raspagem de Dados:** Nenhum usuário pode listar, varrer ou buscar dados de perfis de profissionais com os quais não possua colaboração autorizada.
