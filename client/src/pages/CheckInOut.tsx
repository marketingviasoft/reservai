import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import {
  LogOut,
  LogIn,
  Package,
  Boxes,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  History,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CheckInOut() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [confirmAction, setConfirmAction] = useState<{
    type: "checkout" | "checkin";
    id: number;
    userName: string;
  } | null>(null);

  const { data: pendingReservations, isLoading: pendingLoading } =
    trpc.reservation.list.useQuery({ status: "pendente" });
  const { data: activeReservations, isLoading: activeLoading } =
    trpc.reservation.list.useQuery({ status: "ativa" });
  const { data: completedReservations, isLoading: completedLoading } =
    trpc.reservation.list.useQuery({ status: "concluida" });

  const checkoutMutation = trpc.reservation.checkout.useMutation({
    onSuccess: () => {
      utils.reservation.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.recentReservations.invalidate();
      utils.item.list.invalidate();
      setConfirmAction(null);
      toast.success("Check-out realizado com sucesso! Equipamentos entregues.");
    },
    onError: (e) => toast.error(e.message),
  });

  const checkinMutation = trpc.reservation.checkin.useMutation({
    onSuccess: () => {
      utils.reservation.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.recentReservations.invalidate();
      utils.dashboard.overdueReservations.invalidate();
      utils.item.list.invalidate();
      setConfirmAction(null);
      toast.success("Check-in realizado com sucesso! Equipamentos devolvidos.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "checkout") {
      checkoutMutation.mutate({ id: confirmAction.id });
    } else {
      checkinMutation.mutate({ id: confirmAction.id });
    }
  };

  const ReservationCard = ({
    reservation,
    type,
  }: {
    reservation: any;
    type: "checkout" | "checkin";
  }) => {
    const isOverdue = type === "checkin" && reservation.endDate < Date.now();
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary/60" />
                  </div>
                  <h3 className="font-medium">
                    {reservation.userName || "Membro"}
                  </h3>
                </div>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Atrasada
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(reservation.startDate), "dd/MM/yyyy", { locale: ptBR })}
                    {" — "}
                    {format(new Date(reservation.endDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              {reservation.reservationItems && reservation.reservationItems.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {reservation.reservationItems.map((ri: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs gap-1 font-normal">
                      {ri.itemName ? (
                        <><Package className="h-3 w-3" />{ri.itemName}</>
                      ) : (
                        <><Boxes className="h-3 w-3" />{ri.kitName}</>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
              {reservation.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{reservation.notes}</p>
              )}
            </div>
            <div className="shrink-0">
              <Button
                onClick={() =>
                  setConfirmAction({
                    type,
                    id: reservation.id,
                    userName: reservation.userName || "Membro",
                  })
                }
                variant={type === "checkout" ? "default" : "outline"}
                className={`gap-2 ${type === "checkin" ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" : ""}`}
              >
                {type === "checkout" ? (
                  <><LogOut className="h-4 w-4" />Check-out</>
                ) : (
                  <><LogIn className="h-4 w-4" />Check-in</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const HistoryCard = ({ reservation }: { reservation: any }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="font-medium text-sm">
                {reservation.userName || "Membro"}
              </span>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                Concluída
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {format(new Date(reservation.startDate), "dd/MM/yyyy", { locale: ptBR })}
                {" — "}
                {format(new Date(reservation.endDate), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              {reservation.checkoutAt && (
                <span className="flex items-center gap-1">
                  <LogOut className="h-3 w-3" />
                  Saída: {format(new Date(reservation.checkoutAt), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              )}
              {reservation.checkinAt && (
                <span className="flex items-center gap-1">
                  <LogIn className="h-3 w-3" />
                  Devolução: {format(new Date(reservation.checkinAt), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
            {reservation.reservationItems && reservation.reservationItems.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {reservation.reservationItems.map((ri: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs gap-1 font-normal">
                    {ri.itemName ? (
                      <><Package className="h-3 w-3" />{ri.itemName}</>
                    ) : (
                      <><Boxes className="h-3 w-3" />{ri.kitName}</>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Check-in / Check-out
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Registre a saída e devolução de equipamentos.
        </p>
      </div>

      <Tabs defaultValue="checkout" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="checkout" className="gap-2">
            <LogOut className="h-4 w-4" />
            Check-out
            {pendingReservations && pendingReservations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {pendingReservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2">
            <LogIn className="h-4 w-4" />
            Check-in
            {activeReservations && activeReservations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {activeReservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Check-out Tab */}
        <TabsContent value="checkout" className="mt-6 space-y-4">
          <Card className="border-0 shadow-sm bg-blue-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Saída de Equipamentos</p>
                <p className="text-xs text-blue-700/70">
                  Confirme a entrega dos equipamentos ao membro da equipe. Reservas pendentes aguardando check-out.
                </p>
              </div>
            </CardContent>
          </Card>
          {pendingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : !pendingReservations || pendingReservations.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="h-12 w-12 text-emerald-400/50 mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma reserva pendente</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Todas as reservas foram processadas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingReservations.map((r) => (
                <ReservationCard key={r.id} reservation={r} type="checkout" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="mt-6 space-y-4">
          <Card className="border-0 shadow-sm bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <LogIn className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">Devolução de Equipamentos</p>
                <p className="text-xs text-emerald-700/70">
                  Confirme a devolução dos equipamentos. Reservas ativas aguardando check-in.
                </p>
              </div>
            </CardContent>
          </Card>
          {activeLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : !activeReservations || activeReservations.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="h-12 w-12 text-emerald-400/50 mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma devolução pendente</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Todos os equipamentos foram devolvidos.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeReservations.map((r) => (
                <ReservationCard key={r.id} reservation={r} type="checkin" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <History className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Histórico de Operações</p>
                <p className="text-xs text-gray-700/70">
                  Registro completo de check-ins e check-outs concluídos.
                </p>
              </div>
            </CardContent>
          </Card>
          {completedLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : !completedReservations || completedReservations.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <History className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-muted-foreground font-medium">Nenhum registro</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  O histórico aparecerá aqui após o primeiro check-in.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedReservations.map((r) => (
                <HistoryCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "checkout" ? "Confirmar Check-out?" : "Confirmar Check-in?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "checkout"
                ? `Confirmar a saída dos equipamentos para ${confirmAction?.userName}? Os itens serão marcados como emprestados.`
                : `Confirmar a devolução dos equipamentos de ${confirmAction?.userName}? Os itens serão marcados como disponíveis.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "checkin" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {checkoutMutation.isPending || checkinMutation.isPending
                ? "Processando..."
                : confirmAction?.type === "checkout"
                  ? "Confirmar Check-out"
                  : "Confirmar Check-in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
