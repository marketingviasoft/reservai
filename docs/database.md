# Banco de dados

## Visao geral

O projeto usa Drizzle ORM com Postgres/Supabase. O schema principal esta em `drizzle/schema.ts`; as migrations ficam em `drizzle/`.

Comandos Drizzle dependem de `DATABASE_URL`:

```bash
corepack pnpm db:push
```

## Tabelas e enums

### Enums

- `user_role`: `user`, `admin`
- `item_status`: `disponivel`, `emprestado`, `manutencao`, `extraviado`
- `item_condition`: `novo`, `bom`, `regular`, `danificado`
- `kit_status`: `completo`, `incompleto`
- `reservation_status`: `pendente`, `ativa`, `concluida`, `cancelada`
- `reservation_event_type`: `reservation_created`, `reservation_updated`, `reservation_cancelled`, `reservation_checked_out`, `reservation_checked_in`

### `users`

Usuarios internos autenticados.

Campos principais:

- `id`
- `openId`
- `name`
- `email`
- `loginMethod`
- `role`
- `phone`
- `extension`
- `department`
- `createdAt`
- `updatedAt`
- `lastSignedIn`

### `categories`

Categorias de equipamentos.

Campos principais:

- `id`
- `name`
- `description`
- `color`
- `createdAt`
- `updatedAt`

### `items`

Equipamentos fisicos individuais.

Campos principais:

- `id`
- `code`
- `name`
- `brand`
- `model`
- `description`
- `categoryId`
- `serialNumber`
- `assetNumber`
- `photoUrl`
- `photoKey`
- `status`
- `condition`
- `notes`
- `createdAt`
- `updatedAt`

Observacoes:

- `code` e unico.
- `serialNumber` tem indice unico.
- `categoryId` referencia `categories.id`.
- `brand` e `model` sao obrigatorios.
- `assetNumber` e opcional.
- `condition` tem padrao `bom` e nao altera disponibilidade ou fluxo logistico.
- `notes` representa observacoes de avarias no cadastro atual.

### `kits`

Tabela tecnica de agrupamentos reutilizaveis, exibidos para o usuario como Combos.

Decisao de compatibilidade:

- A tabela permanece com o nome `kits` nesta etapa para evitar refatoracao/migracao agressiva.
- No dominio atual, esses registros nao representam ativos reservaveis.
- Eles servem apenas como atalhos para selecionar itens fisicos no carrinho.

Campos principais:

- `id`
- `name`
- `description`
- `status`
- `createdAt`
- `updatedAt`

### `kit_items`

Tabela pivote entre kits e itens.

Campos principais:

- `id`
- `kitId`
- `itemId`
- `createdAt`

### `reservations`

Cabecalho da reserva.

Campos principais:

- `id`
- `userId`
- `startDate`
- `endDate`
- `status`
- `checkoutAt`
- `checkoutByUserId`
- `checkinAt`
- `checkinByUserId`
- `notes`
- `createdAt`
- `updatedAt`

### `reservation_items`

Itens associados a reserva.

Campos principais:

- `id`
- `reservationId`
- `itemId`
- `kitId`
- `createdAt`

Estado atual:

- O fluxo de criacao persiste itens fisicos em `itemId`.
- Novas reservas gravam `kitId = null`.
- `kitId` permanece no schema por compatibilidade temporaria com reservas antigas, se existirem.
- `kitId` nao deve ser tratado como unidade real de reserva ou bloqueio.
- A disponibilidade e calculada por equipamento fisico (`itemId`) e por reservas `pendente` ou `ativa`.

### `reservation_events`

Eventos de auditoria operacional de reservas.

Campos principais:

- `id`
- `reservationId`
- `eventType`
- `actorUserId`
- `fromStatus`
- `toStatus`
- `metadata`
- `createdAt`

Estado atual:

- Eventos sao criados exclusivamente pelo backend durante a acao operacional real.
- Nao ha mutation publica para criar, editar ou apagar eventos.
- `reservation_created` registra criador, periodo e `itemIds`.
- `reservation_updated` registra os campos permitidos alterados em `metadata.changes`.
- `reservation_cancelled` registra a transicao para `cancelada`.
- `reservation_checked_out` registra a transicao para `ativa` e os itens movimentados.
- `reservation_checked_in` registra a transicao para `concluida` e os itens devolvidos.
- Admin consulta eventos de qualquer reserva; colaborador consulta apenas eventos das proprias reservas.
- Reservas antigas podem nao ter eventos historicos.

## Variaveis de ambiente relacionadas

- `DATABASE_URL`: connection string Postgres/Supabase.
- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave anonima para cliente.
- `SUPABASE_SERVICE_ROLE_KEY`: chave de servico para storage no backend.
- `SUPABASE_STORAGE_BUCKET`: bucket de imagens, padrao `reservai-assets`.
