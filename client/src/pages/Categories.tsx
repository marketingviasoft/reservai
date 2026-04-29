import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  canManageCategories,
  getCategoryDeleteErrorMessage,
  isValidCategoryColor,
} from "@shared/categoryUi";
import {
  AlertTriangle,
  FolderTree,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CategoryForm = {
  name: string;
  description: string;
  color: string;
};

type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
};

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  color: "#6366f1",
};

const presetColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export default function Categories() {
  const { user } = useAuth();
  const isAdmin = canManageCategories(user);
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const {
    data: categories,
    error,
    isLoading,
  } = trpc.category.list.useQuery();

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (category: CategoryRow) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || "",
      color: category.color || emptyForm.color,
    });
    setDialogOpen(true);
  };

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.item.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Categoria criada");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.item.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Categoria atualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.item.list.invalidate();
      setDeleteId(null);
      toast.success("Categoria removida");
    },
    onError: () => toast.error(getCategoryDeleteErrorMessage()),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (form.color.trim() && !isValidCategoryColor(form.color.trim())) {
      toast.error("Informe uma cor no formato #RRGGBB");
      return;
    }

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const selectedDeleteCategory = categories?.find((c) => c.id === deleteId);
  const colorPickerValue = isValidCategoryColor(form.color)
    ? form.color
    : emptyForm.color;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Organize os equipamentos por tipo de uso.
          </p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Apenas administradores podem gerenciar categorias. Colaboradores
            continuam usando categorias nas telas operacionais quando necessário.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Organize os equipamentos por tipo de uso.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar categorias</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: category.color || emptyForm.color,
                      }}
                    >
                      <Tags className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{category.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {category.description || "Sem descrição"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {category.color || emptyForm.color}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditDialog(category)}
                      aria-label={`Editar categoria ${category.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(category.id)}
                      aria-label={`Excluir categoria ${category.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderTree className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Nenhuma categoria cadastrada</EmptyTitle>
            <EmptyDescription>
              Crie categorias como Câmeras, Tripés, Iluminação, Microfones,
              Celulares ou Acessórios.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </Empty>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Câmeras"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descrição opcional"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={colorPickerValue}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#6366f1"
                  className="font-mono"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      form.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm({ ...form, color })}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se houver equipamentos vinculados
              a {selectedDeleteCategory ? ` ${selectedDeleteCategory.name}` : " esta categoria"}, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
