import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { setAuthBootstrapInFlight } from "@/lib/authBootstrapGate";
import { isCancelledError } from "@shared/authErrors";
import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();
  const bootstrapMutation = trpc.auth.bootstrap.useMutation();

  const ensureSupabaseSession = async (
    session?: { access_token?: string } | null
  ) => {
    if (session?.access_token) return;
    if (!supabase) return;

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) {
      throw new Error(
        "Login realizado no Supabase, mas a sessão ainda não está disponível. Tente novamente."
      );
    }
  };

  const bootstrapReservAiUser = async () => {
    setAuthBootstrapInFlight(true);
    try {
      const user = await bootstrapMutation.mutateAsync();
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
    } finally {
      setAuthBootstrapInFlight(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setAuthBootstrapInFlight(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await ensureSupabaseSession(data.session);
        await bootstrapReservAiUser();
        toast.success("Login realizado");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              full_name: name,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          await ensureSupabaseSession(data.session);
          await bootstrapReservAiUser();
          toast.success("Conta criada");
        } else {
          toast.success("Conta criada. Verifique seu e-mail para confirmar o acesso.");
        }
      }
    } catch (error) {
      if (isCancelledError(error)) return;
      const message =
        error instanceof Error ? error.message : "Não foi possível autenticar";
      toast.error(message);
    } finally {
      setAuthBootstrapInFlight(false);
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Supabase não configurado. Preencha VITE_SUPABASE_URL e
        VITE_SUPABASE_ANON_KEY.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <Button
          type="button"
          variant={mode === "signin" ? "default" : "ghost"}
          onClick={() => setMode("signin")}
          className="h-9"
        >
          Entrar
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "ghost"}
          onClick={() => setMode("signup")}
          className="h-9"
        >
          Criar conta
        </Button>
      </div>

      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="auth-name">Nome</Label>
          <Input
            id="auth-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="auth-email">E-mail</Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-password">Senha</Label>
        <Input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === "signin" ? "Entrar no sistema" : "Criar conta"}
      </Button>
    </form>
  );
}
