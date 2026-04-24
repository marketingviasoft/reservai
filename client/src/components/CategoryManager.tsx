import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useState } from "react";

type CategoryForm = {
  name: string;
  description: string;
  color: string;
};

const emptyForm: CategoryForm = { name: "", description: "", color: "#6366f1" };

const presetColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function CategoryManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: categories } = trpc.category.list.useQuery();

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      setShowForm(false);
      setForm(emptyForm);
      toast.success("Categoria criada");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.item.list.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Categoria atualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      setDeleteId(null);
      toast.success("Categoria removida");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      color: cat.color || "#6366f1",
    });
    setShowForm(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Gerenciar Categorias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* List */}
            {categories && categories.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(cat)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma categoria cadastrada
              </p>
            )}

            {/* Add/Edit Form */}
            {showForm ? (
              <div className="space-y-3 pt-3 border-t">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome da categoria"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Descrição opcional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${form.color === color ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setForm({ ...form, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setShowForm(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Categoria
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Itens associados a esta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
