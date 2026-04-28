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

Agrupamentos de itens usados atualmente como kits/combos.

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
- `kitId` permanece no schema por compatibilidade, mas nao deve ser tratado como unidade final de bloqueio em novas melhorias.

## Variaveis de ambiente relacionadas

- `DATABASE_URL`: connection string Postgres/Supabase.
- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave anonima para cliente.
- `SUPABASE_SERVICE_ROLE_KEY`: chave de servico para storage no backend.
- `SUPABASE_STORAGE_BUCKET`: bucket de imagens, padrao `reservai-assets`.
