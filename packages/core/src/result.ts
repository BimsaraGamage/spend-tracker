/**
 * The outcome of an operation that can fail in an expected way.
 *
 * Expected failures are values, not exceptions (CON5): callers must handle
 * both branches, and TypeScript enforces it.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wrap a successful value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap an expected failure. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
