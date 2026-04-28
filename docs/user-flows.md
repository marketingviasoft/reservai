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

## Combos

1. Usuario autenticado lista combos.
2. Admin gerencia combos e seus itens.
3. Combos sao atalhos de selecao, nao ativos fisicos reservaveis.
4. Ao usar um combo numa reserva, o sistema adiciona ao carrinho apenas os equipamentos fisicos disponiveis.

## Equipe

1. Usuario autenticado lista perfis.
2. Colaborador pode atualizar o proprio perfil.
3. Admin pode atualizar perfis de outros usuarios e alterar `role`.
4. Ha consulta de historico de reservas por usuario.

## Criacao de reserva

1. Usuario escolhe periodo.
2. Sistema consulta disponibilidade para o periodo.
3. Usuario seleciona itens diretos e/ou aplica combos como atalho.
4. Backend valida conflitos:
   - itens diretos indisponiveis bloqueiam a criacao;
   - itens indisponiveis vindos de combos sao pulados antes do envio final;
   - pelo menos um item disponivel precisa existir.
5. Reserva e criada como `pendente`.
6. Itens fisicos sao persistidos em `reservation_items.itemId`.
7. A reserva fica vinculada ao usuario autenticado que criou a solicitacao.
8. Novas reservas nao usam `reservation_items.kitId`; essa coluna e legado/compatibilidade.
9. Backend registra `reservation_created` com ator, periodo e itens reservados.

## Cancelamento e edicao de reserva

1. Usuario solicita update ou cancelamento.
2. Backend verifica se o usuario e dono da reserva ou admin.
3. Usuario comum so pode editar a propria reserva enquanto ela estiver `pendente`.
4. Usuario comum so pode cancelar a propria reserva enquanto ela estiver `pendente`.
5. Admin pode cancelar reservas `pendente`.
6. Reservas `ativa` nao podem ser canceladas; devem ser encerradas via check-in.
7. Reservas `concluida` e `cancelada` nao podem ser canceladas.
8. Alteracao manual de status pela rota de update e bloqueada; status muda por cancelamento, check-out ou check-in.
9. Edicoes permitidas registram `reservation_updated`.
10. Cancelamentos permitidos registram `reservation_cancelled`.

## Check-out

1. Somente admin acessa a operacao de check-out na UI.
2. Backend tambem exige admin para executar check-out.
3. Admin executa check-out em uma reserva `pendente`.
4. Reserva passa para `ativa`.
5. Backend registra data e usuario operador.
6. Itens da reserva passam para `emprestado`.
7. Backend registra `reservation_checked_out` com ator, transicao de status e itens movimentados.

## Check-in

1. Somente admin acessa a operacao de check-in na UI.
2. Backend tambem exige admin para executar check-in.
3. Admin executa check-in em uma reserva `ativa`.
4. Reserva passa para `concluida`.
5. Backend registra data e usuario operador.
6. Itens da reserva voltam para `disponivel`.
7. Compatibilidade legada ainda recalcula combos caso uma reserva antiga tenha `kitId`, mas novas reservas movimentam apenas itens fisicos.
8. Backend registra `reservation_checked_in` com ator, transicao de status e itens devolvidos.

## Timeline de auditoria

1. Usuario abre o detalhe de uma reserva.
2. Backend valida se o usuario e admin ou dono da reserva.
3. Admin ve eventos de qualquer reserva.
4. Colaborador comum ve eventos somente das proprias reservas.
5. A tela exibe tipo do evento, ator, data/hora, descricao curta e transicao de status quando houver.
6. Reservas antigas sem eventos exibem a mensagem: `Nenhum evento de auditoria registrado para esta reserva.`
7. A UI apenas consulta eventos; criacao, edicao e exclusao de auditoria nao sao expostas ao frontend.

## Calendario

1. Usuario acessa `/calendar`.
2. Frontend exibe reservas por periodo.
3. A tela oferece atalhos para visualizar ou criar reservas conforme o fluxo atual.
