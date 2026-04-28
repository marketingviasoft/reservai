# HANDOFF - ReservAI

_Ultima atualizacao: 2026-04-28_

## 1. Visao Geral do Projeto

**ReservAI** e uma aplicacao interna para gestao inteligente de inventario, locacoes e reservas de equipamentos fisicos.

O sistema atende somente usuarios internos autenticados. Nao existe conceito de cliente externo. O foco do produto e:

- cadastrar e organizar equipamentos por categoria;
- permitir reservas por periodo com bloqueio anti-conflito;
- registrar retirada e devolucao via check-out/check-in;
- manter rastreabilidade operacional do historico de uso;
- oferecer uma interface simples para operacao do time interno.

O branding ja aparece no frontend como `ReservAI`, com destaque visual para `AI`.

## 2. Estado Atual do Projeto

### Visao geral do que existe hoje

O repositorio ja contem uma base full-stack funcional, com frontend, backend, autenticacao, banco e rotas de negocio implementadas. Nao e um scaffold vazio.

Estrutura principal:

- `client/`: aplicacao React/Vite.
- `server/`: rotas tRPC, acesso a dados e integracoes.
- `server/_core/`: bootstrap do servidor, autenticacao Supabase, contexto, helpers herdados do template.
- `drizzle/`: schema, relacoes e migrations SQL.
- `shared/`: constantes e tipos compartilhados.
- `docs/`: documentacao de baseline, banco, regras de negocio e fluxos.

### Baseline tecnico de 2026-04-28

Comandos validados:

- `corepack pnpm install`: concluido. No sandbox do agente houve `EPERM` ao recriar `node_modules`; fora do sandbox a instalacao concluiu usando o store local.
- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox, com 2 arquivos e 32 testes.
- `corepack pnpm build`: passou fora do sandbox. O build gerou frontend Vite, bundle server em `dist/index.js` e bundle Vercel em `api/index.js`; houve apenas alerta nao bloqueante de chunk frontend acima de 500 kB.

Nenhuma migracao de banco ou alteracao de regra de negocio foi feita neste baseline.

### Frontend implementado

Telas principais ja existentes:

- `Dashboard`: metricas de itens, reservas, atrasos, equipe, combos e manutencao.
- `Equipamentos`: CRUD com marca, modelo, categoria, foto, numero de serie, patrimonio, estado de conservacao, observacoes, filtros e busca.
- `Combos`: CRUD de agrupamentos reutilizaveis de itens, usados como atalhos de selecao.
- `Equipe`: listagem de usuarios, edicao de perfil, alteracao de role por admin e historico de reservas por usuario.
- `Calendario`: visao dia/semana/mes com reservas por periodo e atalho para criar nova reserva.
- `Reservas`: listagem, filtro por status, criacao de reserva, detalhes e cancelamento.
- `Check-in / Check-out`: operacao de retirada, devolucao e historico.

O layout principal esta pronto, com sidebar, branding ReservAI, protecao basica por autenticacao e experiencia mobile razoavel.

### Backend implementado

Rotas tRPC existentes:

- `auth`: `me`, `logout`
- `category`: CRUD
- `item`: CRUD, listagem, detalhe e upload de foto
- `kit`: CRUD e vinculacao de itens
- `profile`: listagem de usuarios, edicao de perfil, alteracao de role e historico
- `reservation`: listagem, detalhe, criacao, atualizacao, cancelamento, check-out, check-in, checagem de conflitos e disponibilidade
- `reservation.events`: timeline de auditoria da reserva, com leitura protegida por dono/admin
- `dashboard`: metricas, reservas recentes e atrasadas

O backend ja possui:

- autenticacao via Supabase Auth;
- RBAC basico com `adminProcedure` e `protectedProcedure`;
- persistencia em Postgres/Supabase via Drizzle ORM;
- upload de imagens para storage via URL pre-assinada.

### Banco de dados e dominio atual

O modelo atual ja cobre o nucleo do produto:

- usuarios internos;
- categorias;
- itens/equipamentos individuais com dados de ativo fisico;
- combos/kits tecnicos;
- reservas;
- itens da reserva.

Tambem ja existe uma regra anti-conflito importante:

- o sistema detecta sobreposicao de datas;
- expande conflitos por itens reservados diretamente ou via kit;
- marca combos como parcialmente ou totalmente indisponiveis quando compartilham um item ja reservado.

### Aderencia as regras de negocio fornecidas

O projeto esta **parcialmente aderente** ao negocio alvo.

Pontos aderentes:

- produto interno, sem clientes externos;
- autenticacao com usuarios internos;
- papeis `admin` e `user` no banco, sendo `user` equivalente ao futuro "Colaborador";
- reserva por periodo;
- fluxo de check-out/check-in separado da criacao da reserva;
- historico basico por status de reserva;
- bloqueio de double-booking por item e por kit compartilhado;
- `checkout` e `checkin` restritos a admin;
- listagem e detalhe de reservas restritos por papel: admin ve tudo, colaborador ve apenas as proprias;
- `update` de reserva restrito ao dono enquanto pendente ou admin, sem alteracao manual de status;
- `cancel` restrito a reservas pendentes; reservas ativas devem ser encerradas via check-in;
- criacao de reserva persistindo itens fisicos individuais em `reservation_items.itemId`;
- cadastro de equipamento separando `status` operacional de `condition` fisica.

Pontos ainda desalinhados:

- a tabela tecnica ainda se chama `kits`, mas a UI e a regra de negocio tratam esses agrupamentos como **combos apenas como atalho**;
- `reservation_items` ainda aceita `kitId` no schema por compatibilidade, embora novas reservas persistam itens fisicos em `itemId` e `kitId = null`;
- nao existe entidade tecnica renomeada para `template/combo`;
- nao existe etapa explicita de aprovacao entre "pendente" e "ativa".

### Riscos tecnicos e observacoes importantes

- O repositorio ainda carrega alguns artefatos do template anterior, principalmente em `server/_core/*`, `client/public/__manus__/*` e plugins Manus no `vite.config.ts`. Eles sustentam parte do bootstrap atual, mas nao fazem parte do dominio central do ReservAI.
- A tela e o backend de Combos ainda usam a tabela tecnica `kits` por compatibilidade. A regra atual e que combo nao e reservavel diretamente.
- O controle de acesso de reservas foi endurecido no estado atual: colaborador ve apenas reservas proprias, `cancel` e `update` validam dono/status, `checkout`/`checkin` exigem admin. Reserva ativa nao pode ser cancelada; deve passar por check-in. Ainda falta decidir se havera papel operacional separado de admin.
- O build passa, mas o Vite alerta que o bundle frontend principal passa de 500 kB apos minificacao. Isso nao bloqueia deploy, mas pode virar pauta de otimizacao.

## 3. Stack Tecnologico

### Linguagens e runtime

- TypeScript
- Node.js
- SQL (Postgres)

### Frontend

- React 19
- Vite 7
- Wouter
- TanStack React Query
- tRPC client
- Tailwind CSS v4
- Radix UI
- Lucide React
- Sonner
- date-fns
- Framer Motion

### Backend

- Express
- tRPC server
- Zod
- SuperJSON
- Drizzle ORM
- postgres
- jose
- axios
- nanoid

### Infra e tooling

- Drizzle Kit
- esbuild
- tsx
- Vitest
- Prettier

### Integracoes e servicos externos

- Supabase Auth
- sessao via access token Supabase enviado no header `Authorization`
- storage via Supabase Storage

### Variaveis de ambiente relevantes

- `DATABASE_URL` (connection string Postgres/Supabase, preferencialmente pooler transaction mode para Vercel)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ADMIN_EMAILS` (opcional, lista separada por virgula)
- `SUPABASE_STORAGE_BUCKET` (opcional, padrao `reservai-assets`)

## 4. Regras de Negocio e Fluxos

### Contexto do produto

- Nome oficial: `ReservAI`
- Uso: estritamente interno
- Usuario final: colaboradores ja autenticados

### RBAC

Perfis de negocio desejados:

- `Admin`: acesso total, CRUD completo e operacao administrativa.
- `Colaborador`: leitura, gestao do proprio perfil e criacao de reservas.

Estado atual no codigo:

- o banco usa `role = "admin" | "user"`;
- `user` deve ser interpretado como o papel de colaborador;
- itens, categorias e combos ja estao protegidos para admin nas mutacoes;
- reservas validam escopo por papel em listagem e detalhe;
- reservas validam dono/status para `update` e `cancel`;
- check-out e check-in exigem admin;
- update manual de `status` e bloqueado para preservar transicoes pelos fluxos dedicados.
- leitura de eventos de auditoria segue o mesmo escopo de reserva: admin ve qualquer reserva; colaborador ve somente as proprias.

Estado atual das permissoes de reserva:

- colaborador comum cria reserva apenas para si mesmo;
- colaborador comum lista e consulta detalhes apenas das proprias reservas;
- colaborador comum pode editar apenas a propria reserva `pendente`;
- colaborador comum pode cancelar apenas a propria reserva `pendente`;
- colaborador comum nao faz check-out nem check-in;
- admin lista e consulta todas as reservas;
- admin opera check-out de reserva `pendente`;
- admin opera check-in de reserva `ativa`;
- admin cancela reservas `pendente`;
- reservas `ativa`, `concluida` e `cancelada` nao podem ser canceladas;
- reservas `ativa` devem ser encerradas via check-in.

### Cadastro de equipamentos

Estado atual:

- `code` segue como ID/codigo automatico do produto no formato `EQP-XXXXX`;
- `brand` e `model` sao obrigatorios;
- `assetNumber` e opcional, mas recomendado para patrimonio;
- `serialNumber` e opcional;
- `condition` e obrigatorio e representa conservacao fisica: `novo`, `bom`, `regular`, `danificado`;
- `status` continua representando o estado operacional/logistico: `disponivel`, `emprestado`, `manutencao`, `extraviado`;
- `notes` continua sendo o campo de observacoes de avarias para evitar migracao desnecessaria para `damageNotes` nesta etapa.

### Modelo de reserva alvo

Regra alvo:

- a reserva deve funcionar como um **carrinho de compras** de itens avulsos;
- o usuario escolhe itens disponiveis no periodo e monta a reserva;
- nao deve haver dependencia rigida de kit para bloquear o fluxo.

Estado atual:

- o sistema permite reservar itens avulsos e usar kits como atalho de selecao;
- a reserva criada persiste os itens fisicos finais em `reservation_items.itemId`;
- a entidade `kits` ainda existe e precisa de decisao de produto antes de evoluir para templates/combos formais.

### Combos

Regra alvo:

- combos como "Combo Podcast" devem ser apenas atalhos para popular o carrinho;
- se um item do combo estiver indisponivel, o sistema deve avisar e inserir somente os demais disponiveis.

Estado atual:

- a interface usa o termo `Combos`;
- a tabela tecnica permanece `kits` por compatibilidade;
- no fluxo de criacao de reserva, combos adicionam ao carrinho apenas os itens disponiveis;
- itens indisponiveis do combo sao ignorados com aviso ao usuario;
- novas reservas persistem somente itens fisicos em `reservation_items.itemId`;
- novas reservas gravam `reservation_items.kitId = null`;
- `kitId` permanece apenas como legado/compatibilidade temporaria para reservas antigas, se existirem.

### Sistema anti-conflito

Regra alvo:

- um equipamento fisico com ID unico nao pode ser reservado duas vezes no mesmo periodo.

Estado atual:

- implementado;
- ha checagem de sobreposicao por periodo;
- ha checagem por `itemId` fisico;
- reservas `pendente` e `ativa` bloqueiam disponibilidade;
- reservas `concluida` e `cancelada` nao bloqueiam disponibilidade;
- combos sao avaliados a partir da disponibilidade dos itens que os compoem.

### Check-out / Check-in

Regra alvo:

- criar ou aprovar reserva nao altera automaticamente o status fisico do item;
- o status so muda na retirada (`Check-out`) e volta na devolucao (`Check-in`).

Estado atual:

- implementado;
- `pendente -> ativa` no check-out, com itens indo para `emprestado`;
- `ativa -> concluida` no check-in, com itens voltando para `disponivel`.

### Historico e rastreabilidade

Regra alvo:

- registrar quem retirou, quando retirou, quando devolveu e filtrar por status.

Estado atual:

- parcialmente implementado;
- a tabela `reservations` guarda `checkoutAt`, `checkoutByUserId`, `checkinAt`, `checkinByUserId` e `status`;
- a tabela `reservation_events` registra eventos operacionais de reserva com ator, data, transicao de status e metadata;
- eventos atuais: `reservation_created`, `reservation_updated`, `reservation_cancelled`, `reservation_checked_out`, `reservation_checked_in`;
- eventos sao criados pelo backend nas mutations reais, sem rota publica de criacao/edicao/delecao;
- detalhe da reserva exibe uma timeline simples de auditoria;
- existe historico por usuario e listagem por status;
- reservas antigas podem aparecer sem eventos historicos, sem quebrar a tela.

## 5. Arquitetura do Banco de Dados

### Modelo atual implementado

### `users`

Representa os usuarios internos autenticados.

Campos principais:

- `id`
- `openId` (identificador unico do provedor)
- `name`
- `email`
- `loginMethod`
- `role` (`user` ou `admin`)
- `phone`
- `extension`
- `department`
- `createdAt`
- `updatedAt`
- `lastSignedIn`

Relacionamentos:

- 1:N com `reservations`

### `categories`

Organiza os equipamentos.

Campos principais:

- `id`
- `name`
- `description`
- `color`
- `createdAt`
- `updatedAt`

Relacionamentos:

- 1:N com `items`

### `items`

Representa os equipamentos fisicos individuais. Este e o ativo real que precisa ser protegido contra double-booking.

Campos principais:

- `id`
- `code` (`EQP-XXXXX`, gerado automaticamente)
- `name`
- `brand`
- `model`
- `description`
- `categoryId`
- `serialNumber`
- `assetNumber`
- `photoUrl`
- `photoKey`
- `status` (`disponivel`, `emprestado`, `manutencao`, `extraviado`)
- `condition` (`novo`, `bom`, `regular`, `danificado`)
- `notes`
- `createdAt`
- `updatedAt`

Relacionamentos:

- N:1 com `categories`
- N:N com `kits` via `kit_items`
- N:N com `reservations` via `reservation_items`

### `kits`

Agrupamentos persistidos de itens. Na interface e no negocio atual sao tratados como Combos.

Decisao de compatibilidade:

- a tabela continua chamada `kits` nesta etapa para evitar migracao agressiva;
- combo e apenas atalho de selecao;
- combo nao deve ser persistido como item real de reserva.

Campos principais:

- `id`
- `name`
- `description`
- `status` (`completo`, `incompleto`)
- `createdAt`
- `updatedAt`

Relacionamentos:

- N:N com `items` via `kit_items`
- N:N com `reservations` via `reservation_items`

### `kit_items`

Tabela pivote para composicao de kits.

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
- `startDate` (UTC ms)
- `endDate` (UTC ms)
- `status` (`pendente`, `ativa`, `concluida`, `cancelada`)
- `checkoutAt`
- `checkoutByUserId`
- `checkinAt`
- `checkinByUserId`
- `notes`
- `createdAt`
- `updatedAt`

Relacionamentos:

- N:1 com `users` como solicitante
- N:1 com `users` como operador de check-out
- N:1 com `users` como operador de check-in
- 1:N com `reservation_items`

### `reservation_items`

Itens reservados por reserva.

Campos principais:

- `id`
- `reservationId`
- `itemId` (nullable)
- `kitId` (nullable)
- `createdAt`

Observacao importante:

- a modelagem ainda aceita `itemId` **ou** `kitId` por linha;
- o fluxo atual de criacao grava itens fisicos em `itemId`;
- novas reservas gravam `kitId = null`;
- `kitId` permanece no schema por compatibilidade temporaria, mas nao deve ser a unidade final de bloqueio em novas melhorias.

### `reservation_events`

Eventos de auditoria operacional vinculados a uma reserva.

Campos principais:

- `id`
- `reservationId`
- `eventType`
- `actorUserId`
- `fromStatus`
- `toStatus`
- `metadata`
- `createdAt`

Relacionamentos:

- N:1 com `reservations`
- N:1 com `users` como ator do evento

Observacao importante:

- eventos sao append-only no fluxo atual da aplicacao;
- nao ha mutation de frontend/API para adulterar auditoria diretamente;
- reservas antigas podem nao ter eventos anteriores a criacao dessa tabela.

### Leitura arquitetural do dominio

### O que esta correto no modelo atual

- `items` representa o inventario fisico real;
- `reservations` representa o compromisso temporal;
- `checkout/checkin` separados da reserva representam bem o fluxo operacional;
- o status operacional do item existe de forma independente da reserva;
- a conservacao fisica do item agora fica separada em `condition`;
- ha base suficiente para evoluir sem reescrever o sistema do zero.

### O que precisa mudar para aderir ao negocio final

Recomendacao arquitetural:

- manter `users`, `categories`, `items`, `reservations` e um vinculo por item reservado;
- manter combos como atalhos de selecao, nunca como entidade reservavel;
- garantir que a reserva final sempre persista **itens fisicos individuais**, nunca uma entidade abstrata que esconda os itens reais.

Modelo alvo sugerido:

- `templates` ou `reservation_templates`
- `template_items`
- `reservation_items` referenciando sempre `itemId`

Opcional, mas fortemente recomendado para fases futuras:

- `item_movements` ou log de movimentacao fisica para rastreabilidade operacional;
- `approvedAt` e `approvedByUserId` em `reservations` caso a operacao exija aprovacao formal antes da retirada.

## 6. Proximos Passos (Roadmap)

### Prioridade 1 - alinhar dominio ao negocio final

- Decidir quando a tabela tecnica `kits` sera renomeada ou substituida por `combos/templates`.
- Planejar migracao futura para remover `kitId` de `reservation_items` apos validar se ha reservas antigas dependentes dessa coluna.

### Prioridade 2 - endurecer seguranca e RBAC

- Decidir se `admin` continua sendo o unico papel operacional para check-in/check-out ou se havera um papel de logistica.
- Decidir se colaboradores devem continuar vendo somente reservas proprias ou se uma visao interna parcial sera necessaria no futuro.
- Expandir testes integrados de reserva com banco de teste quando houver ambiente dedicado.

### Prioridade 3 - evoluir a trilha de auditoria

- Avaliar tela administrativa global de auditoria.
- Planejar eventos futuros de item, como dano, manutencao e extravio.
- Expandir testes integrados com banco de teste dedicado.

### Prioridade 4 - consolidar o fluxo de negocio

- Definir se existe etapa explicita de aprovacao.
- Se existir, adicionar status `aprovada` ou equivalente.
- Separar melhor o ciclo "solicitada/aprovada" do ciclo "retirada/devolucao".

### Prioridade 5 - higiene tecnica do repositorio

- Manter `README.md`, `HANDOFF.md` e `docs/` sincronizados com mudancas de dominio.
- Identificar e remover artefatos do template anterior que nao agregam ao ReservAI.
- Avaliar code splitting para reduzir o alerta de chunk grande no build.
- Adicionar testes de dominio para carrinho, templates e auditoria.

### Recomendacao pratica para a proxima sprint

Se precisarmos continuar o desenvolvimento agora, a ordem mais segura e:

1. validar se existem reservas antigas com `reservation_items.kitId`;
2. planejar migracao para remover `kitId` de `reservation_items`, se aplicavel;
3. decidir quando renomear a tabela tecnica `kits` para `combos/templates`;
4. decidir proximos eventos de auditoria para itens fisicos;
5. expandir testes automatizados antes de novas features cosmeticas.
