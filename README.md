# ReservAI

Aplicacao interna para controle de equipamentos de marketing, reservas, check-out e check-in.

> A documentacao de arquitetura, regras de negocio, banco, fluxos e estado atual fica em [HANDOFF.md](./HANDOFF.md) e na pasta [docs](./docs).

## Stack

- Frontend: React 19, Vite 7, Wouter, TanStack Query, tRPC client, Tailwind CSS, Radix UI.
- Backend: Express, tRPC, Zod, Drizzle ORM, Postgres/Supabase.
- Autenticacao: Supabase Auth.
- Testes: Vitest.
- Deploy: Vercel, com build serverless em `api/index.js`.

## Requisitos

- Node.js compativel com o projeto.
- Corepack habilitado.
- pnpm gerenciado por `packageManager` (`pnpm@10.4.1`).
- Banco Postgres/Supabase para execucao integrada.

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

- `DATABASE_URL` e obrigatoria para comandos Drizzle como `corepack pnpm db:push`.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sao necessarias para upload de imagens no Supabase Storage.
- Em desenvolvimento, se `SUPABASE_URL` nao estiver configurada, o backend cria um usuario local admin para facilitar uso local.

## Rodando localmente

Instale dependencias:

```bash
corepack pnpm install
```

Suba o ambiente de desenvolvimento:

```bash
corepack pnpm dev
```

A aplicacao usa o servidor Express em `server/_core/index.ts`, que integra API tRPC e frontend Vite em desenvolvimento.

## Comandos uteis

```bash
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

Outros comandos:

```bash
corepack pnpm db:push
corepack pnpm format
```

## Baseline tecnico

Baseline executado em 2026-04-28:

- `corepack pnpm install`: concluido. No sandbox do agente houve `EPERM` ao recriar `node_modules`; fora do sandbox a instalacao concluiu usando pacotes ja presentes no store local.
- `corepack pnpm check`: passou.
- `corepack pnpm test`: passou fora do sandbox, com 2 arquivos e 32 testes.
- `corepack pnpm build`: passou fora do sandbox. O Vite reportou apenas alerta de chunk frontend acima de 500 kB.

Veja detalhes em [docs/changelog.md](./docs/changelog.md).
