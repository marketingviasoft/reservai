# HANDOFF - ReservAI

_Ultima atualizacao: 2026-04-24_

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

### Frontend implementado

Telas principais ja existentes:

- `Dashboard`: metricas de itens, reservas, atrasos, equipe, kits e manutencao.
- `Equipamentos`: CRUD com categorias, upload de foto, filtros e busca.
- `Kits`: CRUD de agrupamentos de itens.
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
- itens/equipamentos individuais;
- kits;
- reservas;
- itens da reserva.

Tambem ja existe uma regra anti-conflito importante:

- o sistema detecta sobreposicao de datas;
- expande conflitos por itens reservados diretamente ou via kit;
- marca kits como indisponiveis quando compartilham um item ja reservado.

### Aderencia as regras de negocio fornecidas

O projeto esta **parcialmente aderente** ao negocio alvo.

Pontos aderentes:

- produto interno, sem clientes externos;
- autenticacao com usuarios internos;
- papeis `admin` e `user` no banco, sendo `user` equivalente ao futuro "Colaborador";
- reserva por periodo;
- fluxo de check-out/check-in separado da criacao da reserva;
- historico basico por status de reserva;
- bloqueio de double-booking por item e por kit compartilhado.

Pontos ainda desalinhados:

- o produto atual ainda trata `kits` como entidade forte de dominio, enquanto a regra alvo pede **carrinho de itens avulsos** com **templates/combos apenas como atalho**;
- `reservation_items` aceita `itemId` ou `kitId`, o que reforca o modelo de kit rigido;
- nao existe entidade especifica de `template/combo`;
- nao existe trilha de auditoria detalhada de eventos, apenas timestamps principais na reserva;
- nao existe etapa explicita de aprovacao entre "pendente" e "ativa";
- algumas mutacoes de reserva estao permissivas demais para usuarios nao-admin.

### Riscos tecnicos e observacoes importantes

- O repositorio ainda carrega artefatos do template anterior, principalmente em `server/_core/*` e componentes utilitarios como `AIChatBox`, `ManusDialog`, `Map` e `ComponentShowcase`. Eles nao fazem parte do fluxo central do ReservAI.
- A tela e o backend de `Kits` funcionam, mas representam uma decisao de produto que provavelmente precisara ser revisada para alinhar ao modelo final de combos/templates.
- O controle de acesso esta incompleto no dominio de reservas: hoje `cancel`, `update`, `checkout` e `checkin` usam apenas `protectedProcedure`, sem diferenciar claramente acoes de admin/logistica versus colaborador comum.
- Nao consegui validar os testes nem o typecheck localmente neste workspace porque `node_modules` nao esta instalado e `pnpm` nao esta disponivel no ambiente atual. O arquivo `todo.md` afirma que a base estava com `24 testes` passando e sem erros de TypeScript na origem anterior.

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
- itens, categorias e kits ja estao protegidos para admin nas mutacoes;
- reservas ainda precisam de endurecimento de permissao.

### Modelo de reserva alvo

Regra alvo:

- a reserva deve funcionar como um **carrinho de compras** de itens avulsos;
- o usuario escolhe itens disponiveis no periodo e monta a reserva;
- nao deve haver dependencia rigida de kit para bloquear o fluxo.

Estado atual:

- o sistema permite reservar itens avulsos e tambem kits;
- isso resolve parte do problema operacional, mas ainda nao representa o modelo alvo de carrinho puro.

### Templates / combos

Regra alvo:

- combos como "Combo Podcast" devem ser apenas atalhos para popular o carrinho;
- se um item do combo estiver indisponivel, o sistema deve avisar e inserir somente os demais disponiveis.

Estado atual:

- o conceito mais proximo e `kits`;
- porem `kits` hoje sao entidades persistidas e reservaveis diretamente, nao apenas atalhos;
- isso deve evoluir para `templates` ou `combos` desacoplados da reserva fisica.

### Sistema anti-conflito

Regra alvo:

- um equipamento fisico com ID unico nao pode ser reservado duas vezes no mesmo periodo.

Estado atual:

- implementado;
- ha checagem de sobreposicao por periodo;
- ha expansao de conflitos por itens dentro de kits;
- ha bloqueio de kits afetados por item compartilhado.

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
- existe historico por usuario e listagem por status;
- ainda falta uma trilha de auditoria mais completa para servir como historico operacional definitivo.

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
- `description`
- `categoryId`
- `serialNumber`
- `photoUrl`
- `photoKey`
- `status` (`disponivel`, `emprestado`, `manutencao`, `extraviado`)
- `notes`
- `createdAt`
- `updatedAt`

Relacionamentos:

- N:1 com `categories`
- N:N com `kits` via `kit_items`
- N:N com `reservations` via `reservation_items`

### `kits`

Agrupamentos persistidos de itens. Hoje funcionam como entidade de negocio real.

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

- hoje a modelagem aceita item avulso **ou** kit por linha;
- isso funciona para o estado atual, mas nao e o formato ideal para o modelo final de carrinho + templates.

### Leitura arquitetural do dominio

### O que esta correto no modelo atual

- `items` representa o inventario fisico real;
- `reservations` representa o compromisso temporal;
- `checkout/checkin` separados da reserva representam bem o fluxo operacional;
- o status fisico do item existe de forma independente da reserva;
- ha base suficiente para evoluir sem reescrever o sistema do zero.

### O que precisa mudar para aderir ao negocio final

Recomendacao arquitetural:

- manter `users`, `categories`, `items`, `reservations` e um vinculo por item reservado;
- substituir o papel de `kits` como entidade reservavel por `templates`/`combos` como atalho de selecao;
- garantir que a reserva final sempre persista **itens fisicos individuais**, nunca uma entidade abstrata que esconda os itens reais.

Modelo alvo sugerido:

- `templates` ou `reservation_templates`
- `template_items`
- `reservation_items` referenciando sempre `itemId`

Opcional, mas fortemente recomendado:

- `reservation_events` para auditar criacao, cancelamento, aprovacao, check-out, check-in e edicoes;
- `item_movements` ou log de movimentacao fisica para rastreabilidade operacional;
- `approvedAt` e `approvedByUserId` em `reservations` caso a operacao exija aprovacao formal antes da retirada.

## 6. Proximos Passos (Roadmap)

### Prioridade 1 - alinhar dominio ao negocio final

- Decidir oficialmente se `kits` serao mantidos apenas como compatibilidade temporaria ou migrados para `templates/combos`.
- Refatorar a experiencia de reserva para carrinho puro de itens.
- Fazer com que combos apenas adicionem itens disponiveis ao carrinho, com aviso dos indisponiveis.
- Revisar `reservation_items` para persistir somente itens fisicos individuais.

### Prioridade 2 - endurecer seguranca e RBAC

- Restringir `checkout` e `checkin` a perfis autorizados (`admin` e/ou um futuro papel operacional).
- Restringir `update` e `cancel` de reserva para o dono da reserva e administradores.
- Revisar quais leituras um colaborador comum pode fazer: tudo, somente reservas proprias, ou visao interna global.

### Prioridade 3 - fortalecer a trilha de auditoria

- Criar log de eventos de reserva.
- Registrar claramente quem criou, aprovou, cancelou, retirou e devolveu.
- Expor filtros e timeline operacional na UI.

### Prioridade 4 - consolidar o fluxo de negocio

- Definir se existe etapa explicita de aprovacao.
- Se existir, adicionar status `aprovada` ou equivalente.
- Separar melhor o ciclo "solicitada/aprovada" do ciclo "retirada/devolucao".

### Prioridade 5 - higiene tecnica do repositorio

- Instalar dependencias e revalidar `test` e `check`.
- Criar `README.md` enxuto para onboarding tecnico e manter este `HANDOFF.md` como documento de produto/arquitetura.
- Identificar e remover artefatos do template anterior que nao agregam ao ReservAI.
- Adicionar testes de dominio para RBAC de reservas, carrinho, templates e auditoria.

### Recomendacao pratica para a proxima sprint

Se precisarmos continuar o desenvolvimento agora, a ordem mais segura e:

1. travar as regras de permissao de reserva e operacao;
2. substituir `kits` por `templates/combos` no fluxo de reserva;
3. migrar a persistencia para item fisico individual como unidade final de bloqueio;
4. adicionar auditoria completa de eventos;
5. expandir testes automatizados antes de novas features cosmeticas.
