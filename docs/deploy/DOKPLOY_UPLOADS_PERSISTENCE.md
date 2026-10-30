# Guia de Persistência da Pasta `uploads/` no Dokploy (VPS)

> **Regra de Ouro:** Ficheiros críticos de negócio (documentos de mutuários, bilhetes de identidade, fotos, declarações de garantia, contratos de concessão, recibos fiscais com QR Code e logotipos) **NUNCA** devem residir no sistema de ficheiros volátil do contentor.

---

## 1. Por que os uploads podem sumir no Dokploy sem este mecanismo?
Quando o Dokploy faz um novo deploy (via Git Push, Rebuild ou botão "Deploy" no painel):
1. O Dokploy constrói uma nova imagem Docker a partir do `Dockerfile`.
2. O contentor anterior é parado e destruído (`docker rm`).
3. Um novo contentor é iniciado a partir da nova imagem.
4. **Se a pasta `/app/uploads` não estiver mapeada para um Volume Persistente ou Bind Mount do host VPS, tudo o que foi gravado pelo contentor anterior desaparece.**

---

## 2. Mecanismos Implementados no Código

1. **Directiva `VOLUME ["/app/uploads"]` no [`Dockerfile`](file:///Dockerfile):**
   - Declara formalmente que `/app/uploads` é um ponto de montagem persistente gerenciado pelo Docker engine.

2. **Inicialização Automática de Subpastas no [`src/app.ts`](file:///src/app.ts):**
   - Ao arrancar, o servidor verifica e cria automaticamente a estrutura necessária caso seja uma primeira montagem limpa:
     - `uploads/documents/` (documentos e BI dos mutuários)
     - `uploads/img/` (logotipos e marcas institucionais)
     - `uploads/concessao/` (contratos, declarações de garantias, planos)
     - `uploads/recibos/` (recibos legais e QR Codes)
     - `uploads/docs/`

3. **Respeito Dinâmico a `UPLOADS_DIR`:**
   - [`src/config/multer.ts`](file:///src/config/multer.ts) e [`src/routes.ts`](file:///src/routes.ts) utilizam `process.env.UPLOADS_DIR || path.join(projectRoot, "uploads")`.

4. **Ficheiro [`docker-compose.yml`](file:///docker-compose.yml):**
   - Configurado com o volume nomeado `microcredito_uploads:/app/uploads`.

---

## 3. Como Configurar no Painel do Dokploy

### Cenário A: Aplicação criada como "Application" (Dockerfile)
1. No painel do Dokploy, aceda ao seu projecto e clique na aplicação **`microcredito`**.
2. No menu lateral, clique em **Volumes** (ou **Mounts**).
3. Clique em **Add Volume** (Adicionar Volume):
   - **Type:** `Bind Mount` (ou `Volume`)
   - **Host Path:** `/etc/dokploy/volumes/microcredito-uploads`
   - **Mount Path (no contentor):** `/app/uploads`
4. Guarde e faça o Deploy.
5. A partir deste momento, todos os ficheiros ficam fisicamente gravados no disco do VPS em `/etc/dokploy/volumes/microcredito-uploads` e **nunca serão alterados nem apagados em nenhum deploy**.

### Cenário B: Aplicação criada como "Compose" (docker-compose)
1. No Dokploy, seleccione a opção **Compose**.
2. Aponte para o repositório ou cole o conteúdo do ficheiro [`docker-compose.yml`](file:///docker-compose.yml).
3. O Dokploy criará automaticamente o volume `microcredito_uploads` gerenciado pelo Docker, com ciclo de vida independente dos contentores.

---

## 4. Migração dos Ficheiros Locais para o VPS
Para subir os ficheiros locais existentes para o VPS pela primeira vez sem sobrescrever nada:
```bash
bash scripts/sync-uploads-to-vps.sh root@SEU_IP_VPS /etc/dokploy/volumes/microcredito-uploads
```
