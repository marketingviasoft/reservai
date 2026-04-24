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
  Package,
  Pencil,
  Trash2,
  Upload,
  X,
  Filter,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import CategoryManager from "@/components/CategoryManager";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível",
  emprestado: "Emprestado",
  manutencao: "Manutenção",
  extraviado: "Extraviado",
};

const statusColors: Record<string, string> = {
  disponivel: "bg-emerald-100 text-emerald-700",
  emprestado: "bg-blue-100 text-blue-700",
  manutencao: "bg-amber-100 text-amber-700",
  extraviado: "bg-red-100 text-red-600",
};

type ItemForm = {
  name: string;
  description: string;
  categoryId: number | undefined;
  serialNumber: string;
  status: string;
  notes: string;
};

const emptyForm: ItemForm = {
  name: "",
  description: "",
  categoryId: undefined,
  serialNumber: "",
  status: "disponivel",
  notes: "",
};

export default function Items() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const { data: items, isLoading } = trpc.item.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
  });
  const { data: categories } = trpc.category.list.useQuery();

  const createMutation = trpc.item.create.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Item criado com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.item.update.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Item atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.item.delete.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDeleteId(null);
      toast.success("Item removido");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.item.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      toast.success("Foto atualizada");
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
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      serialNumber: form.serialNumber || undefined,
      status: form.status as any,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId || undefined,
      serialNumber: item.serialNumber || "",
      status: item.status,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (itemId: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        itemId,
        base64,
        filename: file.name,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredItems = items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Gerencie seus equipamentos e itens.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCategoryManagerOpen(true)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Categorias
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Item
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número de série..."
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
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="emprestado">Emprestado</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
            <SelectItem value="extraviado">Extraviado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">
              Nenhum item encontrado
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Adicione seu primeiro equipamento"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Photo */}
                  <div className="relative h-16 w-16 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    )}
                    {isAdmin && (
                      <button
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) handlePhotoUpload(item.id, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {item.name}
                        </h3>
                        {item.serialNumber && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {item.serialNumber}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs shrink-0 ${statusColors[item.status]}`}
                      >
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {item.categoryName && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${item.categoryColor}15`,
                            color: item.categoryColor || "#6366f1",
                          }}
                        >
                          {item.categoryName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {isAdmin && (
                  <div className="flex gap-1.5 mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Item" : "Novo Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do equipamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.categoryId ? String(form.categoryId) : "none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      categoryId: v === "none" ? undefined : Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº de Série</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm({ ...form, serialNumber: e.target.value })
                  }
                  placeholder="SN-000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="emprestado">Emprestado</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="extraviado">Extraviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descrição do equipamento"
                rows={2}
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido permanentemente.
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
      {isAdmin && (
        <CategoryManager
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
        />
      )}
    </div>
  );
}
