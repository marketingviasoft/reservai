# ReservAI - Project TODO

## Banco de Dados
- [x] Schema Drizzle: tabela items (equipamentos individuais)
- [x] Schema Drizzle: tabela categories (categorias de equipamentos)
- [x] Schema Drizzle: tabela kits (agrupamentos de equipamentos)
- [x] Schema Drizzle: tabela kit_items (pivô many-to-many)
- [x] Schema Drizzle: tabela clients (clientes)
- [x] Schema Drizzle: tabela reservations (reservas)
- [x] Schema Drizzle: tabela reservation_items (itens da reserva)
- [x] Migrations executadas com sucesso

## Backend (tRPC Routers)
- [x] Router de items: CRUD completo com upload de fotos
- [x] Router de categories: CRUD
- [x] Router de kits: CRUD com gestão de itens vinculados
- [x] Router de clients: CRUD com histórico
- [x] Router de reservations: CRUD com prevenção de conflitos
- [x] Router de dashboard: métricas e alertas
- [x] Middleware adminProcedure para controle de acesso

## Autenticação e Controle de Acesso
- [x] Autenticação via OAuth (já integrada no template)
- [x] Controle de acesso por perfil (admin vs user) - backend
- [x] Proteção de rotas no frontend (DashboardLayout bloqueia não-autenticados; adminProcedure protege ações admin)

## Design e Layout
- [x] Tema visual elegante e sofisticado (cores, tipografia Inter, espaçamento)
- [x] Logo ReservAI com destaque nas letras "AI"
- [x] DashboardLayout com sidebar dark de navegação refinada
- [x] Responsividade (layout adapta sidebar em mobile)

## Frontend - Dashboard
- [x] Visão geral de reservas ativas e itens disponíveis
- [x] Cards de métricas (itens, emprestados, reservas, atrasos, kits, clientes, manutenção)
- [x] Alertas de devoluções atrasadas
- [x] Atalhos rápidos para ações frequentes (Nova Reserva, Inventário, Clientes, Check-in/out)
- [x] Lista de reservas recentes com link "Ver todas"

## Frontend - Gestão de Inventário
- [x] Listagem de itens com filtros e busca
- [x] Formulário de cadastro/edição de itens com upload de foto
- [x] Gestão de categorias (CRUD via dialog CategoryManager)
- [x] Listagem de kits com itens vinculados
- [x] Formulário de montagem/desmontagem de kits
- [x] Status automático de kit (inclui emprestado como indisponível)

## Frontend - Calendário de Reservas
- [x] Visualização por dia, semana e mês
- [x] Reservas coloridas por status no calendário
- [x] Navegação temporal (anterior/próximo/hoje)
- [x] Criação rápida de reserva pelo calendário (clique no dia abre dialog com data preenchida)

## Frontend - Gestão de Reservas
- [x] Criação de reserva: seleção de itens/kits, período, cliente, observações
- [x] Listagem de reservas com filtros por status (Pendente, Ativa, Concluída, Cancelada)
- [x] Busca por reservas
- [x] Dialog de detalhes da reserva
- [x] Cancelamento de reserva com confirmação

## Frontend - Check-in / Check-out
- [x] Fluxo de Check-out (retirada): confirmação e mudança de status (pendente → ativa)
- [x] Fluxo de Check-in (devolução): confirmação e mudança de status (ativa → concluída)
- [x] Indicação visual de reservas atrasadas
- [x] Histórico completo de operações (tab Histórico com reservas concluídas)

## Frontend - Gestão de Clientes
- [x] Cadastro de clientes com informações de contato
- [x] Histórico de locações por cliente (expansível)
- [x] Busca e filtros de clientes

## Testes
- [x] Testes unitários para routers principais (17 testes passando)
