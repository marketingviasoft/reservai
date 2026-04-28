# Fluxos de usuario

## Autenticacao

1. Usuario acessa o frontend.
2. Cliente usa Supabase Auth quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao configuradas.
3. Backend autentica chamadas tRPC pelo contexto em `server/_core/context.ts` e SDK em `server/_core/sdk.ts`.
4. Em desenvolvimento sem Supabase configurado, o backend usa um usuario local admin.

## Dashboard

1. Usuario autenticado acessa `/`.
2. Frontend consulta metricas em `dashboard.stats`.
3. Tambem existem consultas para reservas recentes e reservas atrasadas.

## Equipamentos

1. Usuario autenticado lista equipamentos.
2. Admin pode criar, editar, excluir e enviar foto.
3. No cadastro, admin informa nome, marca, modelo e estado de conservacao.
4. Admin pode informar categoria, numero de serie, numero de patrimonio, descricao e observacoes de avarias.
5. Fotos usam Supabase Storage via `server/storage.ts`.
6. Equipamentos sao filtraveis por categoria, status e busca.
7. A listagem exibe codigo automatico, marca, modelo, categoria, patrimonio, serie, status operacional e estado de conservacao.

## Kits

1. Usuario autenticado lista kits.
2. Admin gerencia kits e seus itens.
3. O status do kit e recalculado conforme disponibilidade/status dos itens.

## Equipe

1. Usuario autenticado lista perfis.
2. Colaborador pode atualizar o proprio perfil.
3. Admin pode atualizar perfis de outros usuarios e alterar `role`.
4. Ha consulta de historico de reservas por usuario.

## Criacao de reserva

1. Usuario escolhe periodo.
2. Sistema consulta disponibilidade para o periodo.
3. Usuario seleciona itens diretos e/ou kits como atalho.
4. Backend valida conflitos:
   - itens diretos indisponiveis bloqueiam a criacao;
   - itens indisponiveis vindos de kits sao pulados;
   - pelo menos um item disponivel precisa existir.
5. Reserva e criada como `pendente`.
6. Itens fisicos sao persistidos em `reservation_items.itemId`.

## Cancelamento e edicao de reserva

1. Usuario solicita update ou cancelamento.
2. Backend verifica se o usuario e dono da reserva ou admin.
3. Usuario comum nao pode alterar status diretamente.
4. Ao cancelar uma reserva ativa, itens sao devolvidos para `disponivel`.

## Check-out

1. Admin executa check-out em uma reserva `pendente`.
2. Reserva passa para `ativa`.
3. Backend registra data e usuario operador.
4. Itens da reserva passam para `emprestado`.

## Check-in

1. Admin executa check-in em uma reserva `ativa`.
2. Reserva passa para `concluida`.
3. Backend registra data e usuario operador.
4. Itens da reserva voltam para `disponivel`.
5. Kits afetados podem ter status recalculado.

## Calendario

1. Usuario acessa `/calendar`.
2. Frontend exibe reservas por periodo.
3. A tela oferece atalhos para visualizar ou criar reservas conforme o fluxo atual.
