import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const redirectOnUnauthenticated = options?.redirectOnUnauthenticated ?? false;
  const redirectPath =
    options?.redirectPath ?? (redirectOnUnauthenticated ? getLoginUrl() : "");
  const utils = trpc.useUtils();
  const [sessionChecked, setSessionChecked] = useState(!supabase);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSupabaseSession(Boolean(data.session?.access_token));
      setSessionChecked(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSupabaseSession(Boolean(session?.access_token));
      setSessionChecked(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const sessionQuery = trpc.auth.session.useQuery(undefined, {
    enabled: !supabase || (sessionChecked && hasSupabaseSession),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.session.setData(undefined, {
        user: null,
        authenticated: false,
        hasAuthorizationHeader: false,
        authError: null,
      });
    },
  });

  const logout = useCallback(async () => {
    try {
      await supabase?.auth.signOut();
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      setHasSupabaseSession(false);
      setSessionChecked(true);
      utils.auth.me.setData(undefined, null);
      utils.auth.session.setData(undefined, {
        user: null,
        authenticated: false,
        hasAuthorizationHeader: false,
        authError: null,
      });
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.auth.session.invalidate(),
      ]);
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const user = sessionQuery.data?.user ?? null;
    const authRecognitionError =
      hasSupabaseSession && sessionQuery.data?.authError
        ? new Error(
            `Login realizado no Supabase, mas o ReservAI não conseguiu reconhecer a sessão. Detalhe: ${sessionQuery.data.authError.message}`
          )
        : null;
    localStorage.setItem(
      "reservai-user-info",
      JSON.stringify(user)
    );
    return {
      user,
      hasSupabaseSession,
      loading:
        !sessionChecked ||
        logoutMutation.isPending ||
        (hasSupabaseSession &&
          (sessionQuery.isLoading ||
            (sessionQuery.isFetching && !sessionQuery.data))),
      error:
        authRecognitionError ??
        sessionQuery.error ??
        logoutMutation.error ??
        null,
      isAuthenticated: Boolean(user),
    };
  }, [
    hasSupabaseSession,
    sessionChecked,
    sessionQuery.data,
    sessionQuery.error,
    sessionQuery.isFetching,
    sessionQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading || logoutMutation.isPending) return;
    if (state.user) return;
    if (state.hasSupabaseSession) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    state.hasSupabaseSession,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => sessionQuery.refetch(),
    logout,
  };
}
