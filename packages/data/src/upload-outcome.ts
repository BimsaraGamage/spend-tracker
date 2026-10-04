/**
 * What to do with an upload the server answered with an error (SYNC2, SYNC3,
 * ADR-0008, ADR-0014).
 */

/** The parts of a Supabase (PostgREST) error that decide what happens next. */
export interface ServerError {
  /** A Postgres SQLSTATE such as `23505`, a PostgREST code, or empty for network failures. */
  readonly code: string;
  readonly message: string;
}

export type UploadOutcome =
  /** The change is on the server. */
  | { readonly kind: "applied" }
  /** The server refused the change for good: drop it from the queue and tell the user. */
  | {
      readonly kind: "rejected";
      readonly code: string;
      readonly message: string;
    }
  /** The change may succeed later: keep it at the head of the queue and retry. */
  | { readonly kind: "retry"; readonly code: string; readonly message: string };

export const applied: UploadOutcome = { kind: "applied" };

/**
 * Classifies a failed upload of a change to `table`.
 *
 * - A primary-key conflict means an earlier attempt of the same insert
 *   already arrived, and only its response was lost, so the change is applied.
 * - Data exceptions (SQLSTATE class 22), integrity violations (class 23) and
 *   refusals by row level security (42501) never succeed on retry. Database
 *   rules that reject a change must raise one of these.
 * - Anything else, such as a network failure, a server error or an expired
 *   session, is retried.
 */
export function classifyUploadError(
  error: ServerError,
  table: string,
): UploadOutcome {
  const { code, message } = error;
  if (code === "23505" && message.includes(`"${table}_pkey"`)) {
    return applied;
  }
  if (/^2[23][0-9A-Z]{3}$/.test(code) || code === "42501") {
    return { kind: "rejected", code, message };
  }
  return { kind: "retry", code, message };
}
