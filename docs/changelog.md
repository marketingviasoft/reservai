# Changelog

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
