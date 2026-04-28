import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
  subDays,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

const statusColors: Record<string, string> = {
  pendente: "bg-amber-400",
  ativa: "bg-blue-500",
  concluida: "bg-emerald-500",
  cancelada: "bg-gray-400",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [, setLocation] = useLocation();

  const handleCreateReservation = (date: Date) => {
    const ts = date.getTime();
    setLocation(`/reservations?newFrom=${ts}`);
  };

  const handleOpenReservation = (reservationId: number) => {
    setLocation(`/reservations?detail=${reservationId}`);
  };

  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }).getTime(),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }).getTime(),
      };
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        start: weekStart.getTime(),
        end: endOfWeek(weekStart, { weekStartsOn: 0 }).getTime(),
      };
    } else {
      return {
        start: startOfDay(currentDate).getTime(),
        end: endOfDay(currentDate).getTime(),
      };
    }
  }, [currentDate, viewMode]);

  const { data: reservations, isLoading } = trpc.reservation.list.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate((d) =>
        direction === "prev" ? subMonths(d, 1) : addMonths(d, 1)
      );
    } else if (viewMode === "week") {
      setCurrentDate((d) =>
        direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)
      );
    } else {
      setCurrentDate((d) =>
        direction === "prev" ? subDays(d, 1) : addDays(d, 1)
      );
    }
  };

  const getReservationsForDay = (date: Date) => {
    if (!reservations) return [];
    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();
    return reservations.filter(
      (r) => r.startDate <= dayEnd && r.endDate >= dayStart
    );
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let day = start;
    while (day <= end) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // Generate week days
  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, viewMode]);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: ptBR });
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, "dd MMM", { locale: ptBR })} — ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
    } else {
      return format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
    }
  }, [currentDate, viewMode]);

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Visualize reservas e disponibilidade.
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold capitalize min-w-48 text-center">
                {headerLabel}
              </h2>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : viewMode === "month" ? (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {dayNames.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day, i) => {
                  const dayReservations = getReservationsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const today = isToday(day);
                  return (
                    <div
                      key={i}
                      className={`min-h-24 p-1.5 bg-background group cursor-pointer hover:bg-accent/30 transition-colors ${!isCurrentMonth ? "opacity-40" : ""}`}
                      onClick={() => isCurrentMonth && handleCreateReservation(day)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                            today
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-0.5">
                        {dayReservations.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium ${statusColors[r.status]}`}
                            title={`${r.userName || "Membro"} - ${statusLabels[r.status]}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenReservation(r.id);
                            }}
                          >
                            {r.userName || "Reserva"}
                          </div>
                        ))}
                        {dayReservations.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{dayReservations.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "week" ? (
            <div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, i) => {
                  const dayReservations = getReservationsForDay(day);
                  const today = isToday(day);
                  return (
                    <div key={i} className="space-y-2">
                      <div
                        className={`text-center py-2 rounded-lg ${today ? "bg-primary/10" : "bg-muted/50"}`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {dayNames[i]}
                        </p>
                        <p
                          className={`text-lg font-semibold ${today ? "text-primary" : ""}`}
                        >
                          {format(day, "d")}
                        </p>
                      </div>
                      <div className="space-y-1.5 min-h-40">
                        {dayReservations.map((r) => (
                          <div
                            key={r.id}
                            className="p-2 rounded-lg bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleOpenReservation(r.id)}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mb-1 ${statusColors[r.status]}`}
                            />
                            <p className="text-xs font-medium truncate">
                              {r.userName || "Reserva"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {statusLabels[r.status]}
                            </p>
                          </div>
                        ))}
                        {dayReservations.length === 0 && (
                          <div className="flex items-center justify-center h-20">
                            <p className="text-xs text-muted-foreground/50">
                              Livre
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Day view */
            <div className="space-y-3">
              {(() => {
                const dayReservations = getReservationsForDay(currentDate);
                if (dayReservations.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16">
                      <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-medium">
                        Nenhuma reserva neste dia
                      </p>
                    </div>
                  );
                }
                return dayReservations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleOpenReservation(r.id)}
                  >
                    <div
                      className={`w-1 h-12 rounded-full ${statusColors[r.status]}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {r.userName || "Membro"}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-xs text-white ${statusColors[r.status]}`}
                        >
                          {statusLabels[r.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(r.startDate), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}{" "}
                        —{" "}
                        {format(new Date(r.endDate), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {r.reservationItems && r.reservationItems.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {r.reservationItems.map((ri: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {ri.itemCode ? `${ri.itemCode} ${ri.itemName}` : (ri.itemName || ri.kitName || "Item")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[key]}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
