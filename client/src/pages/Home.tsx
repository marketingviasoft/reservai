import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Users,
  Boxes,
  ClipboardList,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-primary/5 text-primary",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${variantStyles[variant]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  ativa: "bg-blue-100 text-blue-700",
  concluida: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-gray-100 text-gray-500",
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recent, isLoading: recentLoading } = trpc.dashboard.recentReservations.useQuery({ limit: 8 });
  const { data: overdue, isLoading: overdueLoading } = trpc.dashboard.overdueReservations.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user?.name?.split(" ")[0] || "Usuário"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema de reservas e inventário.
        </p>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Itens"
            value={stats?.totalItems ?? 0}
            icon={Package}
            description={`${stats?.availableItems ?? 0} disponíveis`}
          />
          <StatCard
            title="Emprestados"
            value={stats?.lentItems ?? 0}
            icon={ClipboardList}
            description="Itens em uso"
            variant="warning"
          />
          <StatCard
            title="Reservas Ativas"
            value={stats?.activeReservations ?? 0}
            icon={CheckCircle2}
            description={`${stats?.pendingReservations ?? 0} pendentes`}
            variant="success"
          />
          <StatCard
            title="Em Atraso"
            value={stats?.overdueReservations ?? 0}
            icon={AlertTriangle}
            description="Devoluções atrasadas"
            variant={
              (stats?.overdueReservations ?? 0) > 0 ? "danger" : "default"
            }
          />
        </div>
      )}

      {/* Secondary Stats */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Kits"
            value={stats?.totalKits ?? 0}
            icon={Boxes}
          />
          <StatCard
            title="Colaboradores"
            value={stats?.totalUsers ?? 0}
            icon={Users}
          />
          <StatCard
            title="Em Manutenção"
            value={stats?.maintenanceItems ?? 0}
            icon={Wrench}
            variant={
              (stats?.maintenanceItems ?? 0) > 0 ? "warning" : "default"
            }
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setLocation("/reservations")}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-card hover:bg-accent/50 transition-colors border border-border/50 shadow-sm"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium">Nova Reserva</span>
        </button>
        <button
          onClick={() => setLocation("/items")}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-card hover:bg-accent/50 transition-colors border border-border/50 shadow-sm"
        >
          <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <Package className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-sm font-medium">Inventário</span>
        </button>
        <button
          onClick={() => setLocation("/team")}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-card hover:bg-accent/50 transition-colors border border-border/50 shadow-sm"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-sm font-medium">Colaboradores</span>
        </button>
        <button
          onClick={() => setLocation("/checkinout")}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-card hover:bg-accent/50 transition-colors border border-border/50 shadow-sm"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium">Check-in/out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue Alerts */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : overdue && overdue.length > 0 ? (
              <div className="space-y-2">
                {overdue.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => setLocation("/reservations")}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.userName || "Colaborador"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Venceu em{" "}
                        {format(new Date(r.endDate), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Atrasada
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma devolução atrasada
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reservations */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Reservas Recentes
              </CardTitle>
              <button
                onClick={() => setLocation("/reservations")}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : recent && recent.length > 0 ? (
              <div className="space-y-1.5">
                {recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation("/reservations")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                        <ClipboardList className="h-4 w-4 text-primary/60" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {r.userName || "Colaborador"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.startDate), "dd/MM", {
                            locale: ptBR,
                          })}{" "}
                          —{" "}
                          {format(new Date(r.endDate), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium ${statusColors[r.status] || ""}`}
                    >
                      {statusLabels[r.status] || r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma reserva registrada
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
