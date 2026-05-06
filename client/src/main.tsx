import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { isCancelledError } from "@shared/authErrors";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { supabase } from "./lib/supabase";

const queryClient = new QueryClient();
const authMeQueryKey = getQueryKey(trpc.auth.me);

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (isCancelledError(error)) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (isCancelledError(error)) return;
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
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
