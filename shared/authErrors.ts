export function isCancelledError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "CancelledError" ||
    error.message === "CancelledError" ||
    error.constructor.name === "CancelledError"
  );
}
