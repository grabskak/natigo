export function getSafeNext(next?: string | null): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/")) return undefined;
  if (next.startsWith("//")) return undefined;
  if (next.includes("://")) return undefined;
  if (next.includes("\\")) return undefined;
  return next;
}

export function isSafeNext(next: string): boolean {
  return getSafeNext(next) === next;
}
