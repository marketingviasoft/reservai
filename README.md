# ReservAI

ReservAI e uma aplicacao interna para controle de equipamentos de marketing, reservas, check-out, check-in e auditoria operacional.

O sistema controla sempre equipamentos fisicos individuais. Combos/Kits existem como atalhos de selecao para montar reservas, nao como ativos fisicos reservaveis.

## Documentacao

- [HANDOFF.md](./HANDOFF.md): estado atual, arquitetura, riscos e roadmap.
- [docs/business-rules.md](./docs/business-rules.md): regras de negocio e permissoes.
- [docs/database.md](./docs/database.md): schema, tabelas, enums e migrations.
- [docs/user-flows.md](./docs/user-flows.md): fluxos de uso.
- [docs/changelog.md](./docs/changelog.md): historico das mudancas recentes.

## Stack principal

- Frontend: React 19, Vite 7, Wouter, TanStack Query, tRPC client, Tailwind CSS, Radix UI.
- Backend: Express, tRPC, Zod, Drizzle ORM, Postgres/Supabase.
- Autenticacao: Supabase Auth.
- Banco: Postgres/Supabase, modelado com Drizzle.
- Storage: Supabase Storage para fotos de equipamentos.
- Testes: Vitest.
- Deploy: Vercel, com bundle serverless em `api/index.js`.

## Requisitos

- Node.js compativel com o projeto.
- Corepack habilitado.
- pnpm gerenciado por `packageManager` (`pnpm@10.4.1`).
- Banco Postgres/Supabase para execucao integrada.

## Instalacao

```bash
corepack pnpm install
```

## Desenvolvimento

```bash
corepack pnpm dev
```

A aplicacao usa o servidor Express em `server/_core/index.ts`, integrando API tRPC e frontend Vite em desenvolvimento.

## Validacao

```bash
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

Validacao recente registrada:

- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou com 2 arquivos e 66 testes.
- `corepack pnpm build`: passou localmente.
- O alerta de chunk frontend acima de 500 kB e conhecido e nao bloqueante.

## Banco e migrations

Comandos Drizzle dependem de `DATABASE_URL`:

```bash
corepack pnpm db:push
```

Nao execute `db:push` sem confirmar que `DATABASE_URL` aponta para o banco correto.

Status da auditoria no banco:

- Durante a tentativa de aplicacao de `drizzle/0002_small_karnak.sql`, o banco informou que o enum `reservation_event_type` ja existia.
- O diagnostico confirmou que `public.reservation_events` tambem existe no banco verificado.
- A estrutura de auditoria esta disponivel no banco verificado.
- Ainda falta validacao funcional pelo app conectado para confirmar a geracao real de `reservation_created`, `reservation_cancelled`, `reservation_checked_out` e `reservation_checked_in`.

## Variaveis de ambiente

Crie um `.env` local quando precisar conectar em Supabase/Postgres:

```bash
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ADMIN_EMAILS=
SUPABASE_STORAGE_BUCKET=reservai-assets
```

Observacoes:

- `DATABASE_URL` e obrigatoria para comandos Drizzle e acesso real ao Postgres/Supabase.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sao necessarias para upload de imagens no Supabase Storage.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` habilitam Supabase Auth no frontend.
- Em desenvolvimento, se `SUPABASE_URL` nao estiver configurada, o backend cria um usuario local admin para facilitar uso local.

## Comandos auxiliares

```bash
corepack pnpm format
```
