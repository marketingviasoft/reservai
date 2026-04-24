import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ClipboardList,
  Filter,
  Calendar,
  Package,
  Boxes,
  X,
  Eye,
  User,
  Building2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

type ReservationForm = {
  startDate: string;
  endDate: string;
  notes: string;
  selectedItemIds: number[];
  selectedKitIds: number[];
};

const emptyForm: ReservationForm = {
  startDate: "",
  endDate: "",
  notes: "",
  selectedItemIds: [],
  selectedKitIds: [],
};

export default function Reservations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const searchString = useSearch();

  // Auto-open dialog when coming from calendar with a date
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const newFrom = params.get("newFrom");
    if (newFrom) {
      const ts = parseInt(newFrom, 10);
      if (!isNaN(ts)) {
        const dateStr = format(new Date(ts), "yyyy-MM-dd");
        const endDate = new Date(ts);
        endDate.setDate(endDate.getDate() + 1);
        const endStr = format(endDate, "yyyy-MM-dd");
        setForm({ ...emptyForm, startDate: dateStr, endDate: endStr });
        setDialogOpen(true);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: reservations, isLoading } = trpc.reservation.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: items } = trpc.item.list.useQuery();
  const { data: kits } = trpc.kit.list.useQuery();
  const { data: detail } = trpc.reservation.getById.useQuery(
    { id: detailId! },
    { enabled: detailId !== null }
  );

  const createMutation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      utils.reservation.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.recentReservations.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Reserva criada com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.reservation.cancel.useMutation({
    onSuccess: () => {
      utils.reservation.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.item.list.invalidate();
      setCancelId(null);
      toast.success("Reserva cancelada");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.startDate || !form.endDate) {
      toast.error("Datas de início e fim são obrigatórias");
      return;
    }
    if (form.selectedItemIds.length === 0 && form.selectedKitIds.length === 0) {
      toast.error("Selecione pelo menos um item ou kit");
      return;
    }
    const startDate = new Date(form.startDate).getTime();
    const endDate = new Date(form.endDate).getTime();
    if (endDate <= startDate) {
      toast.error("A data de fim deve ser posterior à data de início");
      return;
    }
    createMutation.mutate({
      startDate,
      endDate,
      notes: form.notes || undefined,
      itemIds: form.selectedItemIds,
      kitIds: form.selectedKitIds,
    });
  };

  const toggleItem = (itemId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedItemIds: prev.selectedItemIds.includes(itemId)
        ? prev.selectedItemIds.filter((id) => id !== itemId)
        : [...prev.selectedItemIds, itemId],
    }));
  };

  const toggleKit = (kitId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedKitIds: prev.selectedKitIds.includes(kitId)
        ? prev.selectedKitIds.filter((id) => id !== kitId)
        : [...prev.selectedKitIds, kitId],
    }));
  };

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    if (!search) return reservations;
    const s = search.toLowerCase();
    return reservations.filter(
      (r) =>
        r.userName?.toLowerCase().includes(s) ||
        r.userDepartment?.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s) ||
        r.reservationItems?.some(
          (ri: any) =>
            ri.itemName?.toLowerCase().includes(s) ||
            ri.kitName?.toLowerCase().includes(s)
        )
    );
  }, [reservations, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Gerencie todas as reservas de equipamentos.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por membro, departamento, itens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">
              Nenhuma reserva encontrada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReservations.map((r) => (
            <Card
              key={r.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.userName || "Membro"}
                      </h3>
                      {r.userDepartment && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {r.userDepartment}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[r.status]}`}
                      >
                        {statusLabels[r.status]}
                      </Badge>
                      {r.status === "ativa" &&
                        r.endDate < Date.now() && (
                          <Badge variant="destructive" className="text-xs">
                            Atrasada
                          </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(r.startDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}{" "}
                      —{" "}
                      {format(new Date(r.endDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                    {r.reservationItems && r.reservationItems.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {r.reservationItems.map((ri: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs gap-1"
                          >
                            {ri.itemName ? (
                              <>
                                <Package className="h-3 w-3" />
                                {ri.itemName}
                              </>
                            ) : (
                              <>
                                <Boxes className="h-3 w-3" />
                                {ri.kitName}
                              </>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setDetailId(r.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {(r.status === "pendente" || r.status === "ativa") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => setCancelId(r.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Reservation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Info: reserva será vinculada ao membro da equipe logado */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="text-sm">
                <span className="text-muted-foreground">Solicitante: </span>
                <span className="font-medium">{user?.name || user?.email || "Você"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Início *</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim *</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Itens</Label>
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {items && items.filter((item) => item.status === "disponivel").length > 0 ? (
                  items
                    .filter((item) => item.status === "disponivel")
                    .map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={form.selectedItemIds.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{item.name}</span>
                        {item.serialNumber && (
                          <span className="text-xs text-muted-foreground font-mono ml-auto">
                            {item.serialNumber}
                          </span>
                        )}
                      </label>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Nenhum item disponível
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kits</Label>
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {kits && kits.filter((kit) => kit.status === "completo").length > 0 ? (
                  kits
                    .filter((kit) => kit.status === "completo")
                    .map((kit) => (
                      <label
                        key={kit.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={form.selectedKitIds.includes(kit.id)}
                          onCheckedChange={() => toggleKit(kit.id)}
                        />
                        <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{kit.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {kit.items?.length || 0} itens
                        </span>
                      </label>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Nenhum kit disponível
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas sobre a reserva"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${statusColors[detail.status]}`}
                >
                  {statusLabels[detail.status]}
                </Badge>
                {detail.status === "ativa" && detail.endDate < Date.now() && (
                  <Badge variant="destructive">Atrasada</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">
                    Membro da equipe
                  </p>
                  <p className="font-medium">
                    {detail.userName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">
                    Departamento
                  </p>
                  <p className="font-medium">{detail.userDepartment || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Início</p>
                  <p className="font-medium">
                    {format(new Date(detail.startDate), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Fim</p>
                  <p className="font-medium">
                    {format(new Date(detail.endDate), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {detail.checkoutAt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">
                      Check-out
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(detail.checkoutAt),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                )}
                {detail.checkinAt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">
                      Check-in
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(detail.checkinAt),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                )}
              </div>
              {detail.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">
                    Observações
                  </p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}
              {detail.reservationItems &&
                detail.reservationItems.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5">
                      Itens / Kits
                    </p>
                    <div className="space-y-1">
                      {detail.reservationItems.map((ri: any) => (
                        <div
                          key={ri.id}
                          className="flex items-center gap-2 py-1.5 px-2.5 rounded-md bg-muted/30"
                        >
                          {ri.itemName ? (
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-sm">
                            {ri.itemName || ri.kitName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={cancelId !== null}
        onOpenChange={() => setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              A reserva será cancelada e os itens ficarão disponíveis novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelId && cancelMutation.mutate({ id: cancelId })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
