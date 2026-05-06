let bootstrapInFlight = false;
const listeners = new Set<(inFlight: boolean) => void>();

function notify() {
  listeners.forEach((listener) => listener(bootstrapInFlight));
}

export function isAuthBootstrapInFlight() {
  return bootstrapInFlight;
}

export function setAuthBootstrapInFlight(inFlight: boolean) {
  bootstrapInFlight = inFlight;
  notify();
}

export function subscribeAuthBootstrapInFlight(
  listener: (inFlight: boolean) => void
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
