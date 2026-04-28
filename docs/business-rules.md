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
- Status atuais: `disponivel`, `emprestado`, `manutencao`, `extraviado`.
- Cadastro, edicao, exclusao e upload de foto de equipamentos sao operacoes administrativas.

## Categorias

- Categorias organizam equipamentos.
- Mutacoes de categoria sao administrativas.
- Leitura exige usuario autenticado.

## Kits e combos

- O projeto ainda possui a entidade `kits`, com composicao em `kit_items`.
- No fluxo atual de criacao de reserva, kits funcionam como atalhos para selecionar os itens fisicos do kit.
- A reserva final e persistida com `itemId` em `reservation_items`, mantendo o item fisico como unidade de bloqueio.
- A tabela `reservation_items` ainda possui `kitId` nullable por compatibilidade do schema atual.

## Reservas

- Reservas pertencem ao usuario autenticado que as cria.
- Uma reserva possui periodo (`startDate`, `endDate`), status e itens associados.
- Status atuais: `pendente`, `ativa`, `concluida`, `cancelada`.
- Itens diretamente escolhidos precisam estar disponiveis no periodo.
- Itens vindos de kits/combos indisponiveis sao ignorados; itens disponiveis seguem para a reserva.
- Se nenhum item disponivel for selecionado, a criacao falha.

## Anti-conflito

- Reservas `pendente` e `ativa` bloqueiam disponibilidade.
- Ha checagem de sobreposicao por periodo.
- O bloqueio considera itens fisicos diretamente reservados e itens vindos de kits.
- Kits que compartilham itens indisponiveis sao marcados como indisponiveis para o periodo.

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
- Edicao e cancelamento exigem que o usuario seja dono da reserva ou admin.
- Usuario comum nao pode alterar status diretamente.
- Exclusao de reserva exige admin.

## Pontos ainda abertos

- Definir se kits continuam existindo ou se serao substituidos formalmente por templates/combos.
- Avaliar criacao de trilha de auditoria (`reservation_events` ou equivalente).
- Definir se o processo tera aprovacao explicita antes do check-out.
