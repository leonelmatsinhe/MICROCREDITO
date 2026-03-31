# Integracao Frontend - Upload de Documentos

Este endpoint agora exige envio direto do ficheiro para o backend.

## Endpoint

- `POST /api/document`
- `Content-Type: multipart/form-data`

## Campos obrigatorios

- `file` (ficheiro)
- `companyId`
- `accountNumber`
- `documentName`
- `uploadedBy`

## Exemplo com axios (Vue)

```javascript
import axios from "axios";

async function uploadCustomerDocument({
  file,
  companyId,
  accountNumber,
  documentName,
  uploadedBy,
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("companyId", String(companyId));
  form.append("accountNumber", String(accountNumber));
  form.append("documentName", documentName);
  form.append("uploadedBy", uploadedBy);

  const res = await axios.post("/api/document", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
```

## Resposta esperada (sucesso)

```json
{
  "success": true,
  "message": "Documento criado com sucesso.",
  "result": {
    "id": 123,
    "companyId": 1,
    "accountNumber": 100001,
    "documentName": "BI",
    "documentFileUrl": "/documents/abc123_nome.pdf",
    "uploadedBy": "Operador 1"
  }
}
```

## Erros comuns

- `400` se o campo `file` nao for enviado.
- `400` se faltarem campos obrigatorios.
- `400` se `documentFileUrl` externo for enviado no body.

## Visualizar arquivo enviado

Depois de salvo, o campo `documentFileUrl` pode ser usado diretamente no frontend:

- Exemplo: `window.open(document.documentFileUrl, "_blank")`

Como `uploads` esta publicado como estatico, `/documents/<ficheiro>` abre no navegador.

## Atualizar documento (PUT)

Endpoint:

- `PUT /api/document/:id`
- `Content-Type: multipart/form-data`

Comportamento:

- Se enviar `file`, o backend troca o ficheiro e remove o antigo localmente.
- Se nao enviar `file`, atualiza apenas os metadados enviados no body.

Exemplo com troca de ficheiro:

```javascript
import axios from "axios";

async function updateCustomerDocumentWithFile({
  documentId,
  file,
  documentName,
  uploadedBy,
}) {
  const form = new FormData();
  form.append("file", file);
  if (documentName) form.append("documentName", documentName);
  if (uploadedBy) form.append("uploadedBy", uploadedBy);

  const res = await axios.put(`/api/document/${documentId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
```

Exemplo sem trocar ficheiro (somente metadados):

```javascript
import axios from "axios";

async function updateCustomerDocumentMeta({
  documentId,
  documentName,
  uploadedBy,
}) {
  const res = await axios.put(`/api/document/${documentId}`, {
    documentName,
    uploadedBy,
  });

  return res.data;
}
```

