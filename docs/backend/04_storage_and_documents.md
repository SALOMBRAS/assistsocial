# 04. Armazenamento e Supabase Storage

## 1. Configuração do Bucket

- **Nome do Bucket:** `documents`
- **Visibilidade:** `public = false` (Bucket totalmente privado)
- **Limite de Tamanho:** 50 MiB (`52.428.800` bytes)
- **Tipos MIME Permitidos:**
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/msword` (.doc)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
  - `text/plain`

---

## 2. Estrutura de Caminhos no Storage

Para garantir isolamento e integridade dos arquivos no Storage, a convenção padrão de caminhos é:

```
documents/
  └── <owner_id>/
        └── <document_id>.<extensao>
```

Exemplo:
`documents/a8098c1a-f86e-11da-bd1a-00112444be1e/7b07db0a-cfa0-4bb5-8dfd-03487c0e5a99.pdf`

### Vantagens do Isolamento:
1. `(storage.foldername(name))[1]` extrai o primeiro segmento do caminho, que corresponde estritamente ao `owner_id`.
2. A política de envio (`INSERT`) verifica se o usuário logado está inserindo em seu próprio subdiretório:
   ```sql
   WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
   ```
3. A renomeação de títulos e metadados no sistema é realizada no campo `display_name` da tabela `public.documents`, sem alterar o `storage_path`, garantindo que links internos e arquivos físicos nunca se rompam.

---

## 3. URLs Assinadas e Download Seguro

Arquivos privados **não devem possuir URLs públicas permanentes**. Para exibir ou permitir download de um documento na interface:

```typescript
// Obter URL assinada temporária (válida por 60 segundos)
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(document.storage_path, 60);

if (data?.signedUrl) {
  window.open(data.signedUrl, '_blank');
}
```
A geração da URL assinada respeita as políticas RLS de `storage.objects` configuradas na Migration 03.
