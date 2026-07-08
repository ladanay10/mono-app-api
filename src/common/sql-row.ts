// Coercion helpers for raw-SQL result rows, whose cells are typed as `unknown`.
// Postgres returns bigints/numerics as strings; these normalise them safely.

export function num(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

export function str(v: unknown): string {
  return String(v);
}

export function strOrNull(v: unknown): string | null {
  return v == null ? null : str(v);
}
