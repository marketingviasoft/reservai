import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Users,
  User,
  Phone,
  Building2,
  Mail,
  Hash,
  Shield,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
} from "lucide-react";
import { useState, useMemo } from "react";
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

type ProfileForm = {
  phone: string;
  extension: string;
  department: string;
};

export default function Team() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProfileForm>({
    phone: "",
    extension: "",
    department: "",
  });

  const { data: users, isLoading } = trpc.profile.list.useQuery({
    search: search || undefined,
  });

  const { data: reservationHistory } = trpc.profile.reservations.useQuery(
    { userId: expandedId! },
    { enabled: expandedId !== null }
  );

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      utils.profile.list.invalidate();
      setEditId(null);
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMyProfileMutation = trpc.profile.updateMyProfile.useMutation({
    onSuccess: () => {
      utils.profile.list.invalidate();
      setEditId(null);
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.profile.updateRole.useMutation({
    onSuccess: () => {
      utils.profile.list.invalidate();
      toast.success("Perfil atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (u: any) => {
    setEditForm({
      phone: u.phone || "",
      extension: u.extension || "",
      department: u.department || "",
    });
    setEditId(u.id);
  };

  const handleSaveProfile = () => {
    if (editId === null) return;
    const data = {
      phone: editForm.phone || null,
      extension: editForm.extension || null,
      department: editForm.department || null,
    };
    if (isAdmin) {
      updateProfileMutation.mutate({ id: editId, ...data });
    } else {
      updateMyProfileMutation.mutate(data);
    }
  };

  const filteredUsers = useMemo(() => {
    return users || [];
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipe
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Gerencie os membros da equipe e veja o histórico de reservas.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">
              Nenhum membro encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <Card
              key={u.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{u.name || "Sem nome"}</h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}
                          >
                            <Shield className="h-3 w-3 mr-0.5" />
                            {u.role === "admin" ? "Admin" : "Membro"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </span>
                          )}
                          {u.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {u.department}
                            </span>
                          )}
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.phone}
                            </span>
                          )}
                          {u.extension && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              Ramal {u.extension}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(isAdmin || u.id === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isAdmin && u.id !== user?.id && (
                        <Select
                          value={u.role}
                          onValueChange={(role) =>
                            updateRoleMutation.mutate({
                              id: u.id,
                              role: role as "user" | "admin",
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Membro</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setExpandedId(expandedId === u.id ? null : u.id)
                        }
                      >
                        {expandedId === u.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reservation History */}
                {expandedId === u.id && (
                  <div className="border-t px-4 py-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Histórico de Reservas
                    </p>
                    {reservationHistory && reservationHistory.length > 0 ? (
                      <div className="space-y-1.5">
                        {reservationHistory.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between py-2 px-3 rounded-md bg-background text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {format(new Date(r.startDate), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}{" "}
                                —{" "}
                                {format(new Date(r.endDate), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </span>
                              {r.notes && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {r.notes}
                                </span>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${statusColors[r.status] || ""}`}
                            >
                              {statusLabels[r.status] || r.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma reserva registrada
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ramal</Label>
              <Input
                value={editForm.extension}
                onChange={(e) =>
                  setEditForm({ ...editForm, extension: e.target.value })
                }
                placeholder="1234"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Input
                value={editForm.department}
                onChange={(e) =>
                  setEditForm({ ...editForm, department: e.target.value })
                }
                placeholder="Ex: Marketing, TI, Financeiro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={
                updateProfileMutation.isPending ||
                updateMyProfileMutation.isPending
              }
            >
              {updateProfileMutation.isPending ||
              updateMyProfileMutation.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
