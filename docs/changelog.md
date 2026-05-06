# Changelog

## 2026-05-06 - Instrumentacao e reducao de latencia pos-login

Resumo:

- Adicionados logs seguros de performance para procedures tRPC, com path, status e duracao.
- Adicionados logs seguros de banco para consultas criticas: `getUserByOpenId`, `listItems`, `listCategories`, `listReservations`, `getDashboardStats`, `getRecentReservations` e `getOverdueReservations`.
- `auth.diagnostics` passou a incluir `pingDb` seguro, `databaseHost` e indicador `databaseLooksLikeSupabasePooler`, sem expor secrets ou connection strings completas.
- O client tRPC passou de `httpLink` para `httpBatchLink` para reduzir requests simultaneas no carregamento inicial.
- O React Query recebeu defaults moderados: `staleTime` de 30s, `refetchOnWindowFocus: false` e `retry: 1`.
- Logout/SIGNED_OUT agora limpa o cache do React Query, reduzindo chance de erro antigo ficar preso entre logout e novo login.
- `getDashboardStats` consolidou as contagens de reservas em uma consulta agregada, reduzindo a quantidade de queries do Dashboard sem alterar metricas.

Diagnostico:

- A correcao anterior da `DATABASE_URL` para Supabase Transaction Pooler estabilizou auth, mas ainda faltava visibilidade para separar cold start, conexao inicial, queries lentas e excesso de requests.
- A instrumentacao criada permite comparar duracoes de `auth.me`, `auth.bootstrap`, Dashboard, listas e consultas DB diretamente nos logs do runtime.

Recomendacoes:

- Manter `DATABASE_URL` de producao no **Supabase Transaction Pooler** em Vercel/serverless.
- Usar os logs `[TRPC]` e `[DB]` em producao para identificar se a lentidao vem de cold start/conexao ou de query especifica.
- Se os logs apontarem gargalo persistente em filtros por status, categoria ou periodo, avaliar indices em uma etapa separada e com migration revisada.

Validacoes:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 3 arquivos e 99 testes.
- `corepack pnpm build`: falhou no sandbox com `spawn EPERM`; a tentativa fora do sandbox foi bloqueada pelo revisor automatico por limite de uso nesta rodada.

## 2026-05-06 - Correcao de autenticacao em producao com Supabase Transaction Pooler

Resumo:

- Documentada a correcao de producao relacionada a `DATABASE_URL` no Vercel.
- O login autenticava corretamente no Supabase, mas `auth.bootstrap` retornava `500` apos cerca de 20 segundos.
- Os logs do Vercel mostravam chamadas para Supabase Auth (`/auth/v1/user`) retornando `200`, confirmando que o token chegava ao backend e era valido.
- A falha ocorria depois, no acesso ao Postgres para reconhecimento/criacao do usuario interno.

Causa raiz:

- A `DATABASE_URL` de producao estava configurada com a Direct Connection do Supabase.
- Essa conexao nao era adequada para o ambiente Vercel/serverless; a interface do Supabase indicava limitacao de compatibilidade IPv4 e recomendava uso de pooler.

Correcao aplicada:

- A `DATABASE_URL` no Vercel foi substituida pela connection string do **Supabase Transaction Pooler**.
- Foi realizado novo redeploy apos a troca da variavel.

Resultado:

- `auth.bootstrap` passou a retornar `200`.
- `auth.me` passou a retornar `200`.
- Dashboard e demais queries autenticadas passaram a carregar normalmente.

Recomendacao permanente:

- Em producao no Vercel/serverless, manter `DATABASE_URL` apontando para o **Supabase Transaction Pooler**, nao para a Direct Connection.
- Nunca registrar connection strings completas, tokens ou senhas na documentacao.

Validacoes:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 3 arquivos e 95 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

## 2026-05-06 - Correcao da corrida entre auth.bootstrap e auth.me

Resumo:

- Corrigida a ordem do login para impedir que `auth.me` rode enquanto `auth.bootstrap` ainda esta pendente.
- O listener global do Supabase deixou de invalidar/refazer `auth.me` em `SIGNED_IN` e `TOKEN_REFRESHED`.
- Criada uma trava de bootstrap no frontend para bloquear `auth.me` durante o login/bootstrap e liberar somente apos conclusao ou falha.
- `auth.me` passou a retornar erros especificos: `AUTH_MISSING_TOKEN` para ausencia de bearer token e `USER_NOT_PROVISIONED` para token valido sem usuario interno.

Causa confirmada:

- Apos `signInWithPassword`, o evento `SIGNED_IN` do Supabase podia habilitar/invalidate `auth.me` antes de `auth.bootstrap` criar/sincronizar o usuario interno.
- Essa corrida fazia `auth.me` responder como usuario nao autenticado e a UI mostrava `Nao foi possivel validar sua sessao`.

Impacto tecnico:

- Nenhum schema, migration, reserva, auditoria, categoria, equipamento ou check-in/check-out foi alterado.
- `auth.bootstrap` continua sendo a unica rota de criacao/sincronizacao inicial de usuario.
- `auth.me` continua sendo somente leitura e nao executa `upsertUser`.

Validacoes:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 3 arquivos e 95 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

## 2026-05-06 - Refatoracao completa do fluxo de autenticacao

Resumo:

- Simplificado o fluxo de autenticacao para uma fonte clara de verdade no frontend.
- `useAuth` passou a controlar estados explicitos: loading, unauthenticated, authenticated e error.
- `auth.me` passou a exigir token valido e retornar apenas usuario interno existente.
- `auth.me` nao cria, nao sincroniza e nao executa `upsertUser`.
- Criada rota `auth.bootstrap` para criar/sincronizar usuario interno somente durante login ou primeiro acesso com token valido.
- Removido o redirect global agressivo por `UNAUTHORIZED`; o layout/hook de auth controla login, erro e logout.
- `AuthForm` agora faz login Supabase, confirma `session.access_token`, chama `auth.bootstrap` e atualiza `auth.me`.
- O listener Supabase invalida apenas `auth.me`, sem invalidar todas as queries.
- Removidos `auth.session` e `shared/authRedirect` do fluxo/codigo ativo.

Causa:

- Correcoes incrementais anteriores deixaram auth com muitas fontes de decisao: `auth.session`, `auth.me`, redirects globais e sincronizacao implicita.
- Isso contribuia para `CancelledError`, tela de sessao nao reconhecida, perda de sessao e upserts em momentos indevidos.

Impacto tecnico:

- Nenhum schema, migration, reserva, auditoria, categoria, equipamento ou check-in/check-out foi alterado.
- Supabase Auth continua sendo o provedor de sessao.
- `openId`, `role = "admin" | "user"`, primeiro usuario/admin e `ADMIN_EMAILS` foram preservados.
- Testes cobrem estados puros de auth, bootstrap unico, `USER_NOT_PROVISIONED`, usuario existente sem upsert e RBAC existente.

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 3 arquivos e 93 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

## 2026-04-30 - Reducao de upsert no reconhecimento de usuario

Resumo:

- Corrigido o fluxo de autenticacao backend para evitar `upsertUser` em toda request autenticada.
- `authenticateRequest` agora valida o token Supabase, monta o perfil do usuario e busca primeiro o usuario interno por `openId`.
- Usuario existente e retornado imediatamente, sem atualizar `lastSignedIn` nem executar upsert a cada navegacao/query.
- `upsertUser` fica reservado para usuario ainda inexistente ou sincronizacao inicial necessaria.
- Adicionada trava simples por `openId` para deduplicar upserts concorrentes do mesmo usuario novo.
- A tela de sessao nao reconhecida passou a orientar retry quando o erro for timeout de upsert.

Causa provavel:

- O backend executava upsert do usuario em toda autenticacao de request.
- Navegacao entre telas dispara varias queries protegidas, gerando upserts concorrentes no ambiente Vercel + Supabase/Postgres.
- Essa carga podia provocar `User upsert timed out after 10000ms` mesmo com sessao Supabase valida.

Impacto tecnico:

- Nenhum schema, migration, reserva, auditoria, categoria ou check-in/check-out foi alterado.
- Primeiro usuario/admin continua passando pela logica existente de `upsertUser`, mas somente quando o usuario ainda nao existe.
- Testes cobrem usuario existente sem upsert, usuario novo com upsert unico, upsert concorrente deduplicado, erro de lookup diagnostico e helper de timeout.

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 3 arquivos e 93 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

## 2026-04-29 - Tela administrativa de Categorias

Resumo:

- Criada rota `/categories` para gestao administrativa de categorias.
- Menu lateral passa a exibir `Categorias` apenas para admin.
- Admin pode criar, editar e excluir categorias pela UI.
- Colaborador que acessa `/categories` manualmente recebe mensagem de acesso restrito.
- Equipamentos continuam consumindo `category.list` no filtro e no formulario; o atalho antigo abre a tela dedicada de categorias.
- Removido o modal antigo de categorias para evitar duas experiencias divergentes.

Impacto em produto:

- A lacuna operacional entre cadastro de equipamento e cadastro de categoria foi fechada antes do piloto.
- Categorias seguem organizando equipamentos fisicos por tipo de uso.

Impacto tecnico:

- Nenhum schema, migration, regra de reserva, auditoria, autenticacao ou check-in/check-out foi alterado.
- Exclusao de categoria em uso segue a constraint do banco e pode falhar; a UI exibe mensagem amigavel sobre equipamentos vinculados.
- Testes de mutacao admin validam a camada de permissao. Sem banco de teste dedicado, falha por DB ausente e aceita apenas como limitacao tecnica quando nao for `FORBIDDEN`/`UNAUTHORIZED`.
- A cobertura automatizada da tela ficou em helpers compartilhados e router, pois o projeto ainda nao possui harness React/browser dedicado para testar renderizacao da pagina.

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 84 testes.
- `corepack pnpm build`: falhou no sandbox com `spawn EPERM` ao iniciar Vite/esbuild; a reexecucao fora do sandbox foi bloqueada pelo revisor automatico por limite de uso nesta rodada.

## 2026-04-29 - Validacao funcional no ambiente publicado

Resumo:

- Registrada a validacao manual dos fluxos criticos no ambiente publicado.
- Fluxos validados: login valido, navegacao autenticada, cadastro de equipamento, abertura de Reservas sem crash, criacao de reserva, detalhe da reserva, cancelamento de reserva pendente, check-out e check-in.
- A timeline de auditoria exibiu eventos reais para criacao, cancelamento, check-out e check-in.
- A tabela `public.reservation_events` foi verificada no Supabase com eventos reais e transicoes corretas.

Eventos observados:

- `reservation_created`.
- `reservation_cancelled`.
- `reservation_checked_out`.
- `reservation_checked_in`.

Transicoes observadas:

- sem status -> `pendente`.
- `pendente` -> `cancelada`.
- `pendente` -> `ativa`.
- `ativa` -> `concluida`.

Impacto em produto:

- O MVP esta validado funcionalmente nos principais fluxos tecnicos publicados.
- Esta validacao nao substitui piloto operacional controlado com multiplos usuarios reais e maior volume de equipamentos.

Impacto tecnico:

- Nenhum codigo, schema ou migration foi alterado nesta etapa.
- A documentacao foi atualizada para remover a pendencia de validacao funcional da auditoria no app conectado.

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 78 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Pendencia conhecida:

- Realizar piloto operacional controlado com usuarios reais antes de ampliar o uso.

## 2026-04-29 - Correção do crash em Reservas sem datas

Resumo:

- Corrigido crash ao abrir `/reservations` quando ainda não havia período de disponibilidade selecionado.
- A query `reservation.checkAvailability` agora recebe um input seguro mesmo quando `availabilityDates` é `null`.
- As queries de detalhe e timeline também passaram a montar inputs seguros quando não há `detailId`.
- Adicionados testes para evitar regressão de inputs avaliados antes do `enabled` do React Query.

Causa:

- O React Query/tRPC avalia o input da query antes de considerar `enabled`.
- A tela acessava `availabilityDates!.startDate` e `availabilityDates!.endDate` durante o render, causando `TypeError` quando `availabilityDates` era `null`.

Arquivos ajustados:

- `client/src/pages/Reservations.tsx`
- `shared/reservationQueryInputs.ts`
- `server/routers.test.ts`
- `docs/changelog.md`

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 78 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Validação manual:

- Concluida no ambiente publicado: `/reservations` abriu sem crash, reservas foram criadas, detalhes foram abertos e a timeline exibiu eventos reais.

## 2026-04-29 - Estabilizacao da sessao Supabase no ReservAI

Resumo:

- Adicionadas queries publicas seguras `auth.session` e `auth.diagnostics`.
- `auth.session` diferencia usuario anonimo real de falha de reconhecimento quando existe header `Authorization`.
- `auth.diagnostics` expõe apenas flags/host nao sensiveis de ambiente, sem tokens, secrets ou connection string.
- Frontend passou a diagnosticar configuracao Supabase sem expor secrets.
- Redirect global por `UNAUTHORIZED` agora verifica se ainda existe sessao Supabase antes de mandar para login.
- Se existe sessao Supabase valida, o cliente tenta refazer `auth.session`/`auth.me` em vez de deslogar silenciosamente.
- `useAuth` agora aguarda a checagem inicial de sessao Supabase e mostra estado de erro quando o Supabase autenticou, mas o ReservAI nao reconheceu a sessao.

Causa provavel:

- O login no Supabase podia estar correto, mas `auth.me` retornava `null` por falha de configuracao/token/upsert no backend.
- Como o contexto de rotas publicas transforma falhas de autenticacao em `ctx.user = null`, a UI tratava essa falha como usuario anonimo e voltava para a tela de login.
- Uma query protegida com `UNAUTHORIZED` tambem podia disparar redirect global mesmo quando o Supabase ainda tinha sessao local valida.

Arquivos ajustados:

- `client/src/_core/hooks/useAuth.ts`
- `client/src/components/AuthForm.tsx`
- `client/src/components/DashboardLayout.tsx`
- `client/src/lib/supabase.ts`
- `client/src/main.tsx`
- `server/_core/context.ts`
- `server/authDiagnostics.ts`
- `server/routers.ts`
- `shared/authDiagnostics.ts`
- `shared/authRedirect.ts`
- `shared/authErrors.ts`
- `server/routers.test.ts`
- `docs/changelog.md`
- `docs/user-flows.md`
- `HANDOFF.md`

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 74 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Validação manual:

- Parcialmente concluida no ambiente publicado: login valido e navegacao autenticada foram validados. Testes negativos de senha invalida/usuario inexistente seguem como validacao complementar recomendada.

## 2026-04-29 - Correção do CancelledError no login

Resumo:

- Corrigido o fluxo pós-login para não exibir `CancelledError` como falha de autenticação.
- `AuthForm` agora confirma a sessão Supabase antes de atualizar `auth.me`.
- Cancelamentos internos de React Query/tRPC são ignorados no toast de login, sem mascarar erros reais do Supabase.
- O listener global de Supabase deixou de invalidar todas as queries e passou a invalidar somente `auth.me`, sem cancelar refetch em andamento.

Causa provável:

- `supabase.auth.signInWithPassword` atualizava o estado da sessão e disparava `onAuthStateChange`.
- O listener global chamava `queryClient.invalidateQueries()` para todas as queries.
- Essa invalidação podia cancelar `utils.auth.me.fetch()` durante o login, propagando `CancelledError` para o toast.

Arquivos ajustados:

- `client/src/components/AuthForm.tsx`
- `client/src/main.tsx`
- `shared/authErrors.ts`
- `server/routers.test.ts`
- `docs/changelog.md`
- `docs/user-flows.md`
- `HANDOFF.md`

Validações:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 67 testes.
- `corepack pnpm build`: passou fora do sandbox apos `spawn EPERM`; manteve apenas o alerta conhecido de chunk frontend acima de 500 kB.

Validação manual:

- Parcialmente concluida no ambiente publicado: login valido e navegacao autenticada foram validados. Testes negativos de senha invalida/usuario inexistente seguem como validacao complementar recomendada.

## 2026-04-29 - Correcao do status da auditoria no banco

Resumo:

- Corrigida a documentacao sobre `drizzle/0002_small_karnak.sql`.
- Durante a tentativa de aplicacao, o banco retornou erro informando que `reservation_event_type` ja existia.
- O diagnostico confirmou que `public.reservation_events` tambem existe no banco verificado.
- A documentacao nao trata mais a migration de auditoria como genericamente pendente de aplicacao.
- A pendencia passou a ser validacao funcional pelo app conectado; essa pendencia foi concluida posteriormente em 2026-04-29.

Estado documentado:

- Estrutura de auditoria disponivel no banco verificado.
- Validacao funcional concluida posteriormente em 2026-04-29 para `reservation_created`, `reservation_cancelled`, `reservation_checked_out` e `reservation_checked_in`.

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

- Validacao funcional da auditoria pelo app conectado concluida posteriormente em 2026-04-29.
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
- `corepack pnpm db:push`: tentativa no sandbox falhou com `spawn EPERM`; execucao fora do sandbox foi bloqueada por seguranca porque poderia aplicar migrations em um `DATABASE_URL` nao verificado. Status corrigido em 2026-04-29: o banco verificado ja possui `reservation_event_type` e `public.reservation_events`; a validacao funcional pelo app conectado foi concluida posteriormente em 2026-04-29.

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
