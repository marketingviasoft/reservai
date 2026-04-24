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
  Boxes,
  Pencil,
  Trash2,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export default function Kits() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedKit, setExpandedKit] = useState<number | null>(null);

  const { data: kits, isLoading } = trpc.kit.list.useQuery();
  const { data: allItems } = trpc.item.list.useQuery();

  const createMutation = trpc.kit.create.useMutation({
    onSuccess: () => {
      utils.kit.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Kit criado com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.kit.update.useMutation({
    onSuccess: () => {
      utils.kit.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      toast.success("Kit atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.kit.delete.useMutation({
    onSuccess: () => {
      utils.kit.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDeleteId(null);
      toast.success("Kit removido");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ name: "", description: "" });
    setSelectedItemIds([]);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form, itemIds: selectedItemIds });
    } else {
      createMutation.mutate({ ...form, itemIds: selectedItemIds });
    }
  };

  const handleEdit = (kit: any) => {
    setEditingId(kit.id);
    setForm({ name: kit.name, description: kit.description || "" });
    setSelectedItemIds(kit.items?.map((i: any) => i.itemId) || []);
    setDialogOpen(true);
  };

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const filteredKits = (kits || []).filter(
    (k) =>
      !search ||
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kits</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Agrupamentos de equipamentos para locação conjunta.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Kit
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar kits..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredKits.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Boxes className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum kit encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKits.map((kit) => {
            const isExpanded = expandedKit === kit.id;
            return (
              <Card key={kit.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedKit(isExpanded ? null : kit.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                          <Boxes className="h-5 w-5 text-primary/60" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{kit.name}</h3>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${kit.status === "completo" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {kit.status === "completo" ? "Completo" : "Incompleto"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {kit.items?.length || 0} itens
                            {kit.description && ` · ${kit.description}`}
                          </p>
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
                            onClick={() => handleEdit(kit)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(kit.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedKit(isExpanded ? null : kit.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && kit.items && kit.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1.5">
                      {kit.items.map((item: any) => (
                        <div
                          key={item.itemId}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30"
                        >
                          {item.itemPhotoUrl ? (
                            <img
                              src={item.itemPhotoUrl}
                              alt={item.itemName}
                              className="h-7 w-7 rounded object-cover"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                              <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </div>
                          )}
                          <span className="text-sm">{item.itemName}</span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ml-auto ${
                              item.itemStatus === "disponivel"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.itemStatus === "emprestado"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.itemStatus === "disponivel"
                              ? "Disponível"
                              : item.itemStatus === "emprestado"
                                ? "Emprestado"
                                : item.itemStatus === "manutencao"
                                  ? "Manutenção"
                                  : "Extraviado"}
                          </Badge>
                        </div>
                      ))}
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Kit" : "Novo Kit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do kit"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição do kit"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Itens do Kit</Label>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {allItems && allItems.length > 0 ? (
                  allItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.code && (
                          <span className="text-xs text-muted-foreground ml-2 font-mono">
                            {item.code}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum item disponível
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedItemIds.length} itens selecionados
              </p>
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
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O kit será removido permanentemente.
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
