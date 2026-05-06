type PerformanceStatus = "ok" | "error";

export type PerformanceLogInput = {
  prefix: "TRPC" | "DB";
  name: string;
  status: PerformanceStatus;
  elapsedMs: number;
  error?: unknown;
  rows?: number;
};

export function shouldLogPerformance(
  env: Record<string, string | undefined> = process.env
) {
  return env.NODE_ENV === "production" || env.RESERVAI_PERF_LOGS === "true";
}

export function getSafeErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && maybeCode.length > 0) {
      return maybeCode;
    }

    const maybeName = (error as { name?: unknown }).name;
    if (typeof maybeName === "string" && maybeName.length > 0) {
      return maybeName;
    }
  }

  return "ERROR";
}

export function buildPerformanceLog(input: PerformanceLogInput) {
  const parts = [
    `[${input.prefix}]`,
    input.name,
    input.status,
    `${input.elapsedMs}ms`,
  ];

  if (typeof input.rows === "number") {
    parts.push(`rows=${input.rows}`);
  }

  if (input.status === "error") {
    parts.push(getSafeErrorCode(input.error));
  }

  return parts.join(" ");
}

export function logPerformance(input: PerformanceLogInput) {
  if (!shouldLogPerformance()) return;
  const message = buildPerformanceLog(input);
  if (input.status === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}

export async function measurePerformance<T>(
  prefix: "TRPC" | "DB",
  name: string,
  operation: () => Promise<T>,
  getRows?: (result: T) => number | undefined
) {
  const start = Date.now();
  try {
    const result = await operation();
    logPerformance({
      prefix,
      name,
      status: "ok",
      elapsedMs: Date.now() - start,
      rows: getRows?.(result),
    });
    return result;
  } catch (error) {
    logPerformance({
      prefix,
      name,
      status: "error",
      elapsedMs: Date.now() - start,
      error,
    });
    throw error;
  }
}
