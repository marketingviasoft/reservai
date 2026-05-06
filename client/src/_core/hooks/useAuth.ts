import { getLoginUrl } from "@/const";
import {
  isAuthBootstrapInFlight,
  setAuthBootstrapInFlight,
  subscribeAuthBootstrapInFlight,
} from "@/lib/authBootstrapGate";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import {
  getAuthStatus,
  shouldBootstrapAuth,
  shouldRefreshAuthMeForSupabaseEvent,
  shouldRunAuthMeQuery,
} from "@shared/authState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);
  const [externalBootstrapPending, setExternalBootstrapPending] = useState(
    isAuthBootstrapInFlight()
  );
  const bootstrapAttemptedRef = useRef(false);

  useEffect(
    () => subscribeAuthBootstrapInFlight(setExternalBootstrapPending),
    []
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const hasSession = Boolean(data.session?.access_token);
      setHasSupabaseSession(hasSession);
      setSessionChecked(true);
      if (!hasSession) bootstrapAttemptedRef.current = false;
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const hasSession = Boolean(session?.access_token);
      setHasSupabaseSession(hasSession);
      setSessionChecked(true);
      if (event === "SIGNED_OUT") {
        bootstrapAttemptedRef.current = false;
        setBootstrapError(null);
        setAuthBootstrapInFlight(false);
        utils.auth.me.setData(undefined, undefined);
      }
      if (shouldRefreshAuthMeForSupabaseEvent(event)) {
        void utils.auth.me.invalidate();
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [utils]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: shouldRunAuthMeQuery({
      hasSupabaseClient: Boolean(supabase),
      sessionChecked,
      hasSupabaseSession,
      isBootstrapPending: externalBootstrapPending,
    }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const bootstrapMutation = trpc.auth.bootstrap.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
      setBootstrapError(null);
    },
    onError: (error) => {
      setBootstrapError(error instanceof Error ? error : new Error(String(error)));
    },
  });

  useEffect(() => {
    if (
      !shouldBootstrapAuth({
        sessionChecked,
        hasSupabaseSession,
        authError: meQuery.error,
        bootstrapAttempted: bootstrapAttemptedRef.current,
        isBootstrapPending: bootstrapMutation.isPending || externalBootstrapPending,
      })
    ) {
      return;
    }

    bootstrapAttemptedRef.current = true;
    setBootstrapError(null);
    setAuthBootstrapInFlight(true);
    bootstrapMutation.mutate(undefined, {
      onSuccess: () => {
        void utils.auth.me.invalidate();
      },
      onSettled: () => {
        setAuthBootstrapInFlight(false);
      },
    });
  }, [
    bootstrapMutation,
    externalBootstrapPending,
    hasSupabaseSession,
    meQuery.error,
    sessionChecked,
    utils,
  ]);

  const logoutMutation = trpc.auth.logout.useMutation();

  const clearAuthCache = useCallback(() => {
    utils.auth.me.setData(undefined, undefined);
  }, [utils]);

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
      bootstrapAttemptedRef.current = false;
      setBootstrapError(null);
      setAuthBootstrapInFlight(false);
      setHasSupabaseSession(false);
      setSessionChecked(true);
      clearAuthCache();
      await utils.auth.me.invalidate();
    }
  }, [clearAuthCache, logoutMutation, utils]);

  const refresh = useCallback(async () => {
    bootstrapAttemptedRef.current = false;
    setBootstrapError(null);
    return meQuery.refetch();
  }, [meQuery]);

  const state = useMemo(() => {
    const user = meQuery.data ?? null;
    const error = bootstrapError ?? meQuery.error ?? logoutMutation.error ?? null;
    const isAuthQueryLoading =
      meQuery.isLoading || (meQuery.isFetching && !meQuery.data);
    const status = getAuthStatus({
      sessionChecked,
      hasSupabaseSession,
      hasUser: Boolean(user),
      hasError: Boolean(error),
      isAuthQueryLoading,
      isBootstrapPending: bootstrapMutation.isPending || externalBootstrapPending,
      isLogoutPending: logoutMutation.isPending,
    });

    localStorage.setItem("reservai-user-info", JSON.stringify(user));

    return {
      status,
      user,
      hasSupabaseSession,
      loading: status === "loading",
      error,
      isAuthenticated: Boolean(user),
    };
  }, [
    bootstrapError,
    bootstrapMutation.isPending,
    externalBootstrapPending,
    hasSupabaseSession,
    logoutMutation.error,
    logoutMutation.isPending,
    meQuery.data,
    meQuery.error,
    meQuery.isFetching,
    meQuery.isLoading,
    sessionChecked,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.status !== "unauthenticated") return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.status]);

  return {
    ...state,
    refresh,
    logout,
  };
}
