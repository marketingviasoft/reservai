export function isCancelledError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "CancelledError" ||
    error.message === "CancelledError" ||
    error.constructor.name === "CancelledError"
  );
}

export function isUserUpsertTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("User upsert timed out");
}
