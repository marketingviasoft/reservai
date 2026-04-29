import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { isCancelledError } from "@shared/authErrors";
import {
  shouldRedirectToLoginAfterUnauthorized,
  shouldRefreshAuthAfterUnauthorized,
} from "@shared/authRedirect";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { supabase } from "./lib/supabase";

const queryClient = new QueryClient();
const authMeQueryKey = getQueryKey(trpc.auth.me);
const authSessionQueryKey = getQueryKey(trpc.auth.session);

const isUnauthorizedError = (error: unknown) => {
  if (isCancelledError(error)) return false;
  if (!(error instanceof TRPCClientError)) return false;
  return error.message === UNAUTHED_ERR_MSG;
};

const getHasSupabaseSession = async () => {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session?.access_token);
};

const refreshAuthQueries = () =>
  Promise.all([
    queryClient.invalidateQueries(
      { queryKey: authMeQueryKey, refetchType: "active" },
      { cancelRefetch: false }
    ),
    queryClient.invalidateQueries(
      { queryKey: authSessionQueryKey, refetchType: "active" },
      { cancelRefetch: false }
    ),
  ]);

const handleAuthError = async (error: unknown) => {
  const isCancelled = isCancelledError(error);
  if (isCancelled) return;
  const isUnauthorized = isUnauthorizedError(error);
  if (!isUnauthorized) return;
  const hasSupabaseSession = await getHasSupabaseSession();

  if (
    shouldRefreshAuthAfterUnauthorized({
      isCancelled,
      isUnauthorized,
      hasSupabaseSession,
    })
  ) {
    await refreshAuthQueries();
    return;
  }

  if (
    shouldRedirectToLoginAfterUnauthorized({
      isCancelled,
      isUnauthorized,
      hasSupabaseSession,
    })
  ) {
    if (typeof window !== "undefined") {
      window.location.href = getLoginUrl();
    }
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (isCancelledError(error)) return;
    void handleAuthError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (isCancelledError(error)) return;
    void handleAuthError(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const { data } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
        });
      },
    }),
  ],
});

supabase?.auth.onAuthStateChange(() => {
  void queryClient.invalidateQueries(
    { queryKey: authMeQueryKey, refetchType: "active" },
    { cancelRefetch: false }
  );
  void queryClient.invalidateQueries(
    { queryKey: authSessionQueryKey, refetchType: "active" },
    { cancelRefetch: false }
  );
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
