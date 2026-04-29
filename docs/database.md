# Banco de dados

## Visao geral

O projeto usa Drizzle ORM com Postgres/Supabase. O schema principal esta em `drizzle/schema.ts`; as migrations ficam em `drizzle/`.

Comandos Drizzle dependem de `DATABASE_URL`:

```bash
corepack pnpm db:push
```

Nao execute `db:push` sem confirmar que `DATABASE_URL` aponta para o banco correto.

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

Relacionamentos:

- 1:N com `reservations` como solicitante.
- 1:N com `reservation_events` como ator do evento.

### `categories`

Categorias de equipamentos.

Campos principais:

- `id`
- `name`
- `description`
- `color`
- `createdAt`
- `updatedAt`

Relacionamentos:

- 1:N com `items`.

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
- `status` representa estado logistico/operacional.
- `condition` representa conservacao fisica e nao deve ser usado como disponibilidade.

Relacionamentos:

- N:1 com `categories`.
- N:N com `kits` via `kit_items`.
- N:N com `reservations` via `reservation_items`.

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

Relacionamentos:

- N:N com `items` via `kit_items`.
- Compatibilidade legada com `reservation_items.kitId`; novas reservas nao usam `kitId`.

### `kit_items`

Tabela pivote entre kits e itens.

Campos principais:

- `id`
- `kitId`
- `itemId`
- `createdAt`

Relacionamentos:

- N:1 com `kits`.
- N:1 com `items`.

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

Relacionamentos:

- N:1 com `users` como solicitante.
- N:1 com `users` como operador de check-out.
- N:1 com `users` como operador de check-in.
- 1:N com `reservation_items`.
- 1:N com `reservation_events`.

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
- Durante a tentativa de aplicar `drizzle/0002_small_karnak.sql`, o banco retornou erro informando que `reservation_event_type` ja existia.
- O diagnostico confirmou que `public.reservation_events` tambem existe no banco verificado.
- A estrutura de auditoria esta disponivel no banco verificado.
- Ainda falta validacao funcional pelo app conectado para confirmar a geracao real de `reservation_created`, `reservation_cancelled`, `reservation_checked_out` e `reservation_checked_in`.

Relacionamentos:

- N:1 com `reservations`.
- N:1 com `users` como ator.

## Migrations relevantes

- `drizzle/0000_handy_timeslip.sql`: baseline inicial do schema.
- `drizzle/0001_cheerful_tomas.sql`: adiciona dados de ativo fisico ao cadastro de equipamentos, incluindo `brand`, `model`, `assetNumber` e `condition`.
- `drizzle/0002_small_karnak.sql`: cria `reservation_event_type` e `reservation_events` para auditoria operacional de reservas. A estrutura ja existe no banco verificado; nao reaplicar sem diagnostico, pois o enum/tabela ja existem.

## Variaveis de ambiente relacionadas

- `DATABASE_URL`: connection string Postgres/Supabase.
- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave anonima para cliente.
- `SUPABASE_SERVICE_ROLE_KEY`: chave de servico para storage no backend.
- `SUPABASE_STORAGE_BUCKET`: bucket de imagens, padrao `reservai-assets`.
