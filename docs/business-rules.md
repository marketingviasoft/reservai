# Regras de negocio

## Contexto

ReservAI e uma aplicacao interna para controle de equipamentos de marketing, reservas, check-out e check-in. O sistema atende colaboradores autenticados e nao possui fluxo para clientes externos.

## Papeis

- `admin`: administra categorias, equipamentos, kits, equipe, reservas e operacoes de check-in/check-out.
- `user`: colaborador interno. Pode acessar a aplicacao, atualizar o proprio perfil e criar reservas.

No banco, o papel `user` representa o colaborador comum.

## Equipamentos

- Cada equipamento fisico e representado por um item em `items`.
- O codigo do equipamento segue o formato `EQP-XXXXX`, gerado automaticamente no backend.
- Campos obrigatorios no cadastro: nome, marca, modelo e estado de conservacao.
- Campos opcionais: categoria, foto, numero de serie, numero do patrimonio, descricao e observacoes de avarias.
- `status` representa o estado operacional/logistico: `disponivel`, `emprestado`, `manutencao`, `extraviado`.
- `condition` representa o estado fisico/de conservacao: `novo`, `bom`, `regular`, `danificado`.
- `notes` continua sendo usado como observacoes de avarias nesta etapa, evitando uma migracao extra para `damageNotes`.
- Cadastro, edicao, exclusao e upload de foto de equipamentos sao operacoes administrativas.

## Categorias

- Categorias organizam equipamentos.
- Mutacoes de categoria sao administrativas.
- Leitura exige usuario autenticado.

## Combos

- Na interface, agrupamentos reutilizaveis devem ser tratados como `Combos`.
- No banco, a tabela tecnica `kits` permanece por compatibilidade nesta etapa.
- Combos sao apenas atalhos para adicionar varios equipamentos ao carrinho de reserva.
- Combo nao e entidade fisica reservavel.
- A reserva final e persistida somente com `itemId` em `reservation_items`, mantendo o equipamento fisico como unidade real de controle.
- Novas reservas nao devem gravar `kitId` em `reservation_items`.
- A coluna `reservation_items.kitId` permanece como legado/compatibilidade temporaria para reservas antigas, se existirem.
- Ao aplicar um combo, itens disponiveis entram no carrinho, itens indisponiveis sao ignorados e o usuario recebe aviso.

## Reservas

- Reservas pertencem ao usuario autenticado que as cria.
- Uma reserva possui periodo (`startDate`, `endDate`), status e itens associados.
- Status atuais: `pendente`, `ativa`, `concluida`, `cancelada`.
- Itens diretamente escolhidos precisam estar disponiveis no periodo.
- Itens vindos de combos indisponiveis sao ignorados antes da criacao; itens disponiveis seguem para a reserva como `itemId`.
- Se nenhum item disponivel for selecionado, a criacao falha.

## Anti-conflito

- Reservas `pendente` e `ativa` bloqueiam disponibilidade.
- Ha checagem de sobreposicao por periodo.
- O bloqueio considera equipamentos fisicos por `itemId`.
- Combos ficam indisponiveis parcialmente ou totalmente conforme a disponibilidade dos itens fisicos que os compoem.

## Check-out e check-in

- Check-out muda reserva de `pendente` para `ativa`.
- Check-out registra `checkoutAt` e `checkoutByUserId`.
- Check-out marca itens associados como `emprestado`.
- Check-in muda reserva de `ativa` para `concluida`.
- Check-in registra `checkinAt` e `checkinByUserId`.
- Check-in marca itens associados como `disponivel`.
- Check-in e check-out exigem admin no estado atual.

## Permissoes de reserva

- Criacao de reserva exige usuario autenticado.
- Admin visualiza todas as reservas.
- Colaborador comum visualiza somente reservas vinculadas ao seu usuario.
- Colaborador comum pode editar somente reservas proprias em status `pendente`.
- Colaborador comum pode cancelar somente reservas proprias em status `pendente`.
- Admin pode cancelar reservas `pendente`.
- Reservas `ativa`, `concluida` ou `cancelada` nao podem ser canceladas.
- Reservas `ativa` devem ser encerradas via check-in.
- Usuario comum nao pode alterar status diretamente.
- A rota de update nao permite alteracao manual de status; transicoes devem passar por cancelamento, check-out ou check-in.
- Check-out e check-in exigem admin no backend, mesmo que alguem tente chamar a API diretamente.
- Exclusao de reserva exige admin.

## Pontos ainda abertos

- Definir se kits continuam existindo ou se serao substituidos formalmente por templates/combos.
- Avaliar criacao de trilha de auditoria (`reservation_events` ou equivalente).
- Definir se o processo tera aprovacao explicita antes do check-out.
