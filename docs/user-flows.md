# Fluxos de usuario

## Autenticacao

1. Usuario acessa o frontend.
2. Cliente usa Supabase Auth quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao configuradas.
3. Backend autentica chamadas tRPC pelo contexto em `server/_core/context.ts` e SDK em `server/_core/sdk.ts`.
4. Apos login com Supabase, o frontend confirma que a sessao possui token e atualiza `auth.me`.
5. O listener de mudanca de sessao invalida somente `auth.me`, evitando cancelar queries operacionais durante login/logout.
6. Cancelamentos internos de query nao sao exibidos como erro de senha ou falha de autenticacao.
7. Erros reais do Supabase, como senha invalida ou usuario inexistente, continuam sendo exibidos ao usuario.
8. Em desenvolvimento sem Supabase configurado, o backend usa um usuario local admin.

## Dashboard

1. Usuario autenticado acessa `/`.
2. Frontend consulta metricas em `dashboard.stats`.
3. Total de equipamentos fisicos vem somente de `items`.
4. Combos sao exibidos como atalhos cadastrados, sem entrar no total de equipamentos fisicos.
5. Metricas de equipamentos usam `items.status`, nao `items.condition`.
6. Metricas de reservas exibem pendentes, ativas, concluidas, canceladas e atrasadas.
7. Admin ve metricas/listas da operacao completa.
8. Colaborador ve metricas/listas de reservas restritas ao proprio usuario.
9. Tambem existem consultas para reservas recentes e reservas atrasadas.

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

## Aplicacao de combo como atalho

1. Usuario escolhe um periodo na criacao da reserva.
2. Frontend consulta disponibilidade do periodo.
3. Usuario clica em adicionar combo.
4. Itens fisicos disponiveis do combo entram no carrinho.
5. Itens indisponiveis sao ignorados e o usuario recebe aviso.
6. Itens ja selecionados nao sao duplicados.
7. A reserva final envia somente `itemIds`; novas linhas em `reservation_items` nao usam `kitId`.

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

## Cancelamento de reserva pendente

1. Colaborador pode solicitar cancelamento apenas de reserva propria em status `pendente`.
2. Admin pode cancelar qualquer reserva em status `pendente`.
3. Reserva `ativa` nao pode ser cancelada; deve passar por check-in.
4. Reservas `concluida` e `cancelada` nao podem ser canceladas novamente.
5. Backend e a fonte final dessa regra; a UI apenas esconde a acao quando ela nao e permitida.

## Check-out

1. Somente admin acessa a operacao de check-out na UI.
2. Backend tambem exige admin para executar check-out.
3. A lista de check-out exibe somente reservas `pendente`.
4. Admin executa check-out em uma reserva `pendente`.
5. Reserva passa para `ativa`.
6. Backend registra data e usuario operador.
7. Itens da reserva passam para `emprestado`.
8. Backend registra `reservation_checked_out` com ator, transicao de status e itens movimentados.

## Check-in

1. Somente admin acessa a operacao de check-in na UI.
2. Backend tambem exige admin para executar check-in.
3. A lista de check-in exibe somente reservas `ativa`.
4. Admin executa check-in em uma reserva `ativa`.
5. Reserva passa para `concluida`.
6. Backend registra data e usuario operador.
7. Itens da reserva voltam para `disponivel`.
8. Compatibilidade legada ainda recalcula combos caso uma reserva antiga tenha `kitId`, mas novas reservas movimentam apenas itens fisicos.
9. Backend registra `reservation_checked_in` com ator, transicao de status e itens devolvidos.

## Timeline de auditoria

1. Usuario abre o detalhe de uma reserva.
2. Backend valida se o usuario e admin ou dono da reserva.
3. Admin ve eventos de qualquer reserva.
4. Colaborador comum ve eventos somente das proprias reservas.
5. A tela exibe tipo do evento, ator, data/hora, descricao curta e transicao de status quando houver.
6. Reservas antigas sem eventos exibem a mensagem: `Nenhum evento de auditoria registrado para esta reserva.`
7. A UI apenas consulta eventos; criacao, edicao e exclusao de auditoria nao sao expostas ao frontend.
8. `reservation_event_type` e `public.reservation_events` existem no banco verificado.
9. Ainda falta validacao funcional pelo app conectado para confirmar que novos eventos sao persistidos em criacao, cancelamento, check-out e check-in.

## Calendario

1. Usuario acessa `/calendar`.
2. Frontend exibe reservas por periodo.
3. A consulta usa o mesmo endpoint protegido da lista de reservas.
4. Admin visualiza todas as reservas no periodo.
5. Colaborador visualiza somente as proprias reservas no periodo.
6. Reservas sao diferenciadas visualmente por status.
7. Eventos do calendario levam ao detalhe da reserva; dias vazios permitem iniciar uma nova reserva.
