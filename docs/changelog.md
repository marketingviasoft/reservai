# Changelog

## 2026-04-29 - Correcao do status da auditoria no banco

Resumo:

- Corrigida a documentacao sobre `drizzle/0002_small_karnak.sql`.
- Durante a tentativa de aplicacao, o banco retornou erro informando que `reservation_event_type` ja existia.
- O diagnostico confirmou que `public.reservation_events` tambem existe no banco verificado.
- A documentacao nao trata mais a migration de auditoria como genericamente pendente de aplicacao.
- A pendencia atual passa a ser validacao funcional pelo app conectado.

Estado documentado:

- Estrutura de auditoria disponivel no banco verificado.
- Validacao funcional ainda pendente para confirmar geracao real de `reservation_created`, `reservation_cancelled`, `reservation_checked_out` e `reservation_checked_in`.

Impacto tecnico:

- Nenhum codigo, schema ou migration foi alterado.
- `db:push` nao foi executado nesta etapa.

## 2026-04-29 - Consolidacao da documentacao viva

Resumo:

- Revisados `README.md`, `HANDOFF.md` e documentos em `docs/` para refletir o estado atual do ReservAI.
- Consolidada a regra de que Equipamentos fisicos em `items` sao a unidade real de reserva.
- Reforcada a decisao de que Combos/Kits sao atalhos de selecao, nao ativos reservaveis.
- Documentada a auditoria operacional via `reservation_events`.
- Documentada originalmente a pendencia de aplicar `drizzle/0002_small_karnak.sql`; status corrigido depois que o banco informou `reservation_event_type` existente e `public.reservation_events` foi confirmada.
- Mantido o alerta de chunk acima de 500 kB como risco conhecido e nao bloqueante.

Impacto em produto:

- Proximas implementacoes passam a partir de uma documentacao mais consistente sobre reservas, disponibilidade, permissoes, auditoria e visoes operacionais.

Impacto tecnico:

- Nenhuma regra de negocio, schema, migration ou codigo de aplicacao foi alterado nesta etapa.

Validacoes:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 66 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Pendencias conhecidas:

- Validar funcionalmente pelo app conectado a geracao de eventos em `public.reservation_events`.
- Avaliar code splitting futuramente para o alerta de chunk acima de 500 kB.

## 2026-04-28 - Revisao das visoes operacionais

Resumo:

- Dashboard passou a expor metricas separadas para equipamentos fisicos, combos, status operacional e reservas por status.
- Total de equipamentos fisicos continua vindo somente de `items`; combos/kits aparecem apenas como atalhos cadastrados.
- Metricas de equipamentos usam `items.status` e nao misturam `items.condition`.
- Metricas/listas de reservas do Dashboard agora respeitam escopo: admin ve tudo; colaborador ve as proprias reservas.
- Calendario continua usando `reservation.list`, herda o mesmo escopo de permissao e agora permite abrir o detalhe da reserva.
- Check-out reforca listagem apenas de reservas `pendente`; check-in reforca listagem apenas de reservas `ativa`.
- Testes de helpers cobrem Dashboard, disponibilidade, status elegiveis, visibilidade de lista/calendario e timeline sem eventos.

Comandos executados:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou.
- `corepack pnpm build`: passou localmente apos reexecucao fora do sandbox; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Observacao:

- Nao houve migration nesta etapa; `corepack pnpm db:push` nao foi executado.

## 2026-04-28 - Auditoria operacional de reservas

Resumo:

- Criada tabela `reservation_events` e enum `reservation_event_type`.
- Eventos de reserva agora sao registrados pelo backend em criacao, edicao permitida, cancelamento, check-out e check-in.
- Eventos registram ator, transicao de status, data/hora e `metadata` operacional.
- Adicionada query protegida `reservation.events`: admin consulta qualquer reserva; colaborador consulta somente reservas proprias.
- Detalhe da reserva exibe timeline simples de auditoria e mensagem para reservas antigas sem eventos.
- Nao foi criada rota publica para criar, editar ou apagar eventos de auditoria.
- Testes de auditoria e permissoes de leitura foram adicionados.

Migration:

- `drizzle/0002_small_karnak.sql`

Comandos executados:

- `corepack pnpm drizzle-kit generate`: passou fora do sandbox apos `spawn EPERM`; gerou a migration de auditoria.
- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou. Resultado: 2 arquivos, 58 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta ja conhecido de chunk frontend acima de 500 kB.
- `corepack pnpm db:push`: tentativa no sandbox falhou com `spawn EPERM`; execucao fora do sandbox foi bloqueada por seguranca porque poderia aplicar migrations em um `DATABASE_URL` nao verificado. Status corrigido em 2026-04-29: o banco verificado ja possui `reservation_event_type` e `public.reservation_events`; a pendencia atual e validacao funcional pelo app conectado.

## 2026-04-28 - Combos como atalhos de selecao

Resumo:

- Consolidado o comportamento de combos como atalhos para popular o carrinho de itens fisicos.
- Criado helper compartilhado para aplicar combo sem duplicar itens e ignorando indisponiveis.
- `createReservation` usa construtor explicito de linhas fisicas e novas reservas gravam `kitId = null`.
- Disponibilidade passou a usar uma constante compartilhada de status bloqueantes: `pendente` e `ativa`.
- UI de Reservas informa quando itens do combo nao foram adicionados por indisponibilidade.
- Tabela tecnica `kits` e coluna `reservation_items.kitId` permanecem como compatibilidade/legado; novas reservas nao devem usar `kitId`.
- Testes de combo, persistencia fisica e status de disponibilidade foram adicionados.

Comandos executados:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox. Resultado: 2 arquivos, 49 testes.
- `corepack pnpm build`: passou fora do sandbox; manteve apenas o alerta ja conhecido de chunk frontend acima de 500 kB.

Observacao:

- Nao houve migration nesta etapa; `kits` e `reservation_items.kitId` foram mantidos por compatibilidade, mas novas reservas gravam apenas `itemId`.

## 2026-04-28 - Cancelamento de reservas ativas bloqueado

Resumo:

- Cancelamento agora e permitido somente para reservas `pendente`.
- Reservas `ativa` sao rejeitadas para qualquer papel e devem ser encerradas via check-in.
- UI de Reservas nao exibe cancelamento em reservas ativas.
- Testes cobrem colaborador/admin em reservas `pendente`, `ativa`, `concluida` e `cancelada`, incluindo mensagem de erro de check-in.

Comandos executados:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox. Resultado: 2 arquivos, 42 testes.
- `corepack pnpm build`: passou fora do sandbox; manteve apenas o alerta ja conhecido de chunk frontend acima de 500 kB.

## 2026-04-28 - Endurecimento de permissoes de reservas

Resumo:

- Listagem e detalhe de reservas agora respeitam escopo: admin ve tudo; colaborador ve apenas reservas proprias.
- Cancelamento ficou restrito a status validos: colaborador cancela propria reserva `pendente`; admin cancela `pendente`.
- Check-out e check-in seguem restritos a admin no backend.
- A rota de update nao permite alteracao manual de status; transicoes passam pelos fluxos dedicados.
- UI de Reservas esconde cancelamento indevido para colaborador comum.
- UI de Check-in/Check-out exibe area restrita para usuarios nao-admin.
- Testes de permissao foram expandidos.

Comandos executados:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox. Resultado: 2 arquivos, 40 testes.
- `corepack pnpm build`: passou fora do sandbox; manteve apenas o alerta ja conhecido de chunk frontend acima de 500 kB.

## 2026-04-28 - Cadastro de equipamentos fisicos

Resumo:

- Adicionados `brand`, `model`, `assetNumber` e `condition` ao modelo de item.
- Criado enum `item_condition` para separar estado fisico de conservacao do `status` operacional.
- Mantido `notes` como campo de observacoes de avarias nesta etapa.
- Atualizados backend, validacoes Zod, tela de Equipamentos, migration Drizzle e documentacao.

Comandos executados:

- `corepack pnpm drizzle-kit generate`: gerou `drizzle/0001_cheerful_tomas.sql`; executado fora do sandbox por `EPERM` no ambiente.
- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox. Resultado apos testes novos: 2 arquivos, 34 testes.
- `corepack pnpm build`: passou fora do sandbox; manteve apenas o alerta ja conhecido de chunk frontend acima de 500 kB.

Observacao:

- `corepack pnpm db:push` foi tentado e falhou conforme esperado porque `DATABASE_URL` nao esta configurada neste workspace.

## 2026-04-28 - Baseline tecnico inicial

Resumo:

- Revisao inicial da estrutura do projeto ReservAI antes de novas melhorias.
- Confirmada aplicacao full-stack com frontend React/Vite, backend Express/tRPC, Supabase Auth, Drizzle ORM e Postgres/Supabase.
- Criada documentacao inicial em `docs/business-rules.md`, `docs/database.md` e `docs/user-flows.md`.
- Atualizados `README.md` e `HANDOFF.md` para refletir o estado atual.

Comandos executados:

- `corepack pnpm install`: concluido apos execucao fora do sandbox por `EPERM` do Windows ao recriar `node_modules`.
- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox. Resultado: 2 arquivos, 32 testes.
- `corepack pnpm build`: passou fora do sandbox. Resultado: frontend Vite e bundles server/API gerados; alerta nao bloqueante de chunk acima de 500 kB.

Escopo:

- Nenhuma regra de negocio foi alterada.
- Nenhuma migracao de banco foi criada.
- Nenhuma feature nova foi implementada.
