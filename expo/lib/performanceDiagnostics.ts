const isDevMode = typeof globalThis !== "undefined" && Boolean((globalThis as { __DEV__?: boolean }).__DEV__);

export function measureInteraction<T>(name: string, action: () => T): T {
  if (!isDevMode) return action();
  const startedAt = Date.now();
  const result = action();
  console.log(`[Perf] ${name}: ${Date.now() - startedAt}ms`);
  return result;
}

export async function measureAsync<T>(name: string, action: () => Promise<T>): Promise<T> {
  if (!isDevMode) return action();
  const startedAt = Date.now();
  try {
    return await action();
  } finally {
    console.log(`[Perf] ${name}: ${Date.now() - startedAt}ms`);
  }
}

export function logDevDiagnostic(name: string, details: Record<string, unknown>): void {
  if (!isDevMode) return;
  console.log(`[Diag] ${name}`, details);
}
