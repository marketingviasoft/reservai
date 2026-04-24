# ReservAI - Project TODO

## Banco de Dados
- [x] Schema Drizzle: tabela items (equipamentos individuais)
- [x] Schema Drizzle: tabela categories (categorias de equipamentos)
- [x] Schema Drizzle: tabela kits (agrupamentos de equipamentos)
- [x] Schema Drizzle: tabela kit_items (pivô many-to-many)
- [x] Schema Drizzle: tabela reservations (reservas)
- [x] Schema Drizzle: tabela reservation_items (itens da reserva)
- [x] Migrations executadas com sucesso

## Backend (tRPC Routers)
- [x] Router de items: CRUD completo com upload de fotos
- [x] Router de categories: CRUD
- [x] Router de kits: CRUD com gestão de itens vinculados
- [x] Router de profile: listagem, edição de perfil, gestão de roles
- [x] Router de reservations: CRUD com prevenção de conflitos
- [x] Router de dashboard: métricas e alertas
- [x] Middleware adminProcedure para controle de acesso

## Autenticação e Controle de Acesso
- [x] Autenticação via OAuth (já integrada no template)
- [x] Controle de acesso por perfil (admin vs user)

## Frontend - Design e Layout
- [x] Tema visual elegante e sofisticado (cores, tipografia, espaçamento)
- [x] DashboardLayout com sidebar dark e branding ReservAI
- [x] Navegação com ícones e destaque de rota ativa
- [x] Badge de role (admin) no sidebar

## Frontend - Dashboard
- [x] Dashboard com cards de métricas (itens, emprestados, reservas, atrasos)
- [x] Lista de reservas recentes no dashboard
- [x] Alertas de devoluções atrasadas no dashboard

## Frontend - Inventário
- [x] Tela de Inventário: grid de itens com foto, status, categoria
- [x] CRUD de itens com dialog (criar/editar/excluir)
- [x] Upload de foto de item
- [x] Filtros por status e categoria no inventário
- [x] Busca por nome/número de série
- [x] Gestão de categorias (CategoryManager)

## Frontend - Kits
- [x] Tela de Kits: listagem com expansão de itens
- [x] CRUD de kits com seleção de itens

## Frontend - Colaboradores
- [x] Tela de Colaboradores: listagem com busca
- [x] Edição de perfil (telefone, ramal, departamento)
- [x] Histórico de reservas por colaborador (expansível)
- [x] Gestão de roles (admin pode alterar)

## Frontend - Calendário
- [x] Calendário com visualização por mês, semana e dia
- [x] Reservas coloridas por status no calendário
- [x] Navegação temporal (anterior/próximo/hoje)
- [x] Criação rápida de reserva a partir do calendário

## Frontend - Reservas
- [x] Tela de Reservas: listagem com filtros por status
- [x] Criação de reserva vinculada ao colaborador logado (userId)
- [x] Dialog de detalhes da reserva
- [x] Cancelamento de reserva com confirmação

## Frontend - Check-in/Check-out
- [x] Tela de Check-in/Check-out com tabs
- [x] Check-out: confirmar saída de equipamentos (pendente → ativa)
- [x] Check-in: confirmar devolução de equipamentos (ativa → concluída)
- [x] Indicação visual de reservas atrasadas
- [x] Aba de histórico de check-ins/check-outs

## Qualidade
- [x] Proteção de rotas no frontend
- [x] 19 testes unitários passando
- [x] Zero erros TypeScript

## Refatoração: Clientes → Colaboradores (v2)
- [x] Remover tabela `clients` do schema
- [x] Adicionar campos phone, extension, department à tabela `users`
- [x] Remover `clientId` da tabela `reservations` (reserva vinculada ao userId)
- [x] Executar migration com sucesso
- [x] Remover router `customer`, criar router `profile`
- [x] Atualizar db.ts: remover helpers de clients, adicionar helpers de profile
- [x] Remover tela Clients.tsx, criar tela Team.tsx (Colaboradores)
- [x] Atualizar Home.tsx: referências de clientes → colaboradores
- [x] Atualizar Reservations.tsx: remover seleção de cliente, vincular ao usuário logado
- [x] Atualizar Calendar.tsx: clientName → userName
- [x] Atualizar CheckInOut.tsx: clientName → userName
- [x] Atualizar DashboardLayout.tsx: sidebar Clientes → Colaboradores
- [x] Atualizar App.tsx: rota /clients → /team
- [x] Atualizar testes: customer → profile
- [x] Todos os 19 testes passando após refatoração

## Renomear: Colaboradores → Equipe
- [x] Sidebar: label "Colaboradores" → "Equipe"
- [x] Dashboard Home: card e atalho "Colaboradores" → "Equipe"
- [x] Tela Team.tsx: título e textos "Colaboradores" → "Equipe"
- [x] CheckInOut.tsx: referência "colaborador" → "membro da equipe" onde aplicável
- [x] Reservations.tsx: referência "colaborador" → "membro da equipe" onde aplicável
- [x] Badge de role: "Colaborador" → "Membro"

## Renomear: Inventário → Equipamentos
- [x] Sidebar: label "Inventário" → "Equipamentos"
- [x] Dashboard Home: atalho "Inventário" → "Equipamentos"
- [x] Tela Items.tsx: título e textos "Inventário" → "Equipamentos"
- [x] DashboardLayout.tsx: descrição do sistema se houver referência
- [x] Demais referências textuais em todo o frontend

## Ajuste formulário de criação de item
- [x] Remover campo "Nº de Série" do formulário
- [x] Adicionar upload de foto diretamente no dialog de criação/edição
- [x] Exibir ID automático (somente leitura) no formulário de edição
- [x] Manter campos: Nome, Foto, Descrição, Categoria
- [x] Atualizar placeholder de busca (remover referência a nº de série)
- [x] Remover campo serialNumber do grid de itens se exibido

## ID complexo para equipamentos (EQP-XXXXX)
- [x] Adicionar campo `code` (varchar) na tabela items do schema
- [x] Gerar código EQP-XXXXX automaticamente ao criar item (nanoid alfanumérico 5 chars)
- [x] Exibir código EQP no card de equipamento (substituir ID numérico)
- [x] Exibir código EQP no dialog de edição
- [x] Exibir código EQP em reservas, calendário e check-in/out onde itens aparecem
- [x] Migrar banco de dados
