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
  Users,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  document: string;
  address: string;
  notes: string;
};

const emptyForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  document: "",
  address: "",
  notes: "",
};

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

export default function Clients() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  const { data: clients, isLoading } = trpc.customer.list.useQuery({
    search: search || undefined,
  });

  const { data: clientReservations } = trpc.customer.reservations.useQuery(
    { clientId: expandedClient! },
    { enabled: expandedClient !== null }
  );

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Cliente criado com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Cliente atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDeleteId(null);
      toast.success("Cliente removido");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      company: form.company || undefined,
      document: form.document || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      document: client.document || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cadastro e histórico de locações.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email, telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !clients || clients.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum cliente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const isExpanded = expandedClient === client.id;
            return (
              <Card key={client.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        setExpandedClient(isExpanded ? null : client.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {client.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                            )}
                            {client.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                            {client.company && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {client.company}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(client)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(client.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setExpandedClient(isExpanded ? null : client.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Histórico de Locações
                      </p>
                      {clientReservations && clientReservations.length > 0 ? (
                        <div className="space-y-1.5">
                          {clientReservations.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between py-2 px-2.5 rounded-md bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(new Date(r.startDate), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}{" "}
                                  —{" "}
                                  {format(new Date(r.endDate), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${statusColors[r.status]}`}
                              >
                                {statusLabels[r.status]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma locação registrada
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={form.document}
                  onChange={(e) =>
                    setForm({ ...form, document: e.target.value })
                  }
                  placeholder="Documento"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais"
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : editingId
                  ? "Salvar"
                  : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
