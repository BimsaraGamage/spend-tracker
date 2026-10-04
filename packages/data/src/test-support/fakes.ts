/**
 * Test doubles for the connector tests. The real supabase-js client is used,
 * with its network calls answered by a scripted fetch, so the tests check the
 * HTTP requests the app will really send.
 */
import {
  type CrudEntry,
  CrudTransaction,
  type UpdateType,
} from "@powersync/common";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "http://supabase.test";

/** A request the client sent. */
export interface SentRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: Headers;
  readonly body: unknown;
}

/** A scripted reply: a response, or a network failure. */
export type Reply = Response | "network failure";

/** A fetch that records requests and answers them in order. */
export function scriptedFetch(replies: Reply[] = []) {
  const sent: SentRequest[] = [];
  const pending = [...replies];
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as unknown)
        : null;
    sent.push({
      method: request.method,
      url: new URL(request.url),
      headers: request.headers,
      body,
    });
    const reply = pending.shift() ?? new Response(null, { status: 201 });
    return reply === "network failure"
      ? Promise.reject(new TypeError("fetch failed"))
      : Promise.resolve(reply);
  };
  return { fetch, sent };
}

/** A PostgREST error reply. */
export function postgrestError(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { code, message, details: null, hint: null },
    { status },
  );
}

/** A PostgREST reply to an update that counted the rows it changed. */
export function rowsChanged(count: number): Response {
  return new Response(null, {
    status: 204,
    headers: { "Content-Range": `*/${String(count)}` },
  });
}

/** A supabase-js client whose requests go to `fetch`, with an optional stored session. */
export function supabaseClient(
  fetch: typeof globalThis.fetch,
  session?: { readonly accessToken: string; readonly expired?: boolean },
) {
  const stored = new Map<string, string>();
  if (session !== undefined) {
    const expiresAt =
      Math.floor(Date.now() / 1000) + (session.expired === true ? -60 : 3600);
    stored.set(
      "session",
      JSON.stringify({
        access_token: session.accessToken,
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user: {
          id: "user-1",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
        },
      }),
    );
  }
  return createClient(supabaseUrl, "publishable-key", {
    global: { fetch },
    auth: {
      storageKey: "session",
      storage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => {
          stored.set(key, value);
        },
        removeItem: (key) => {
          stored.delete(key);
        },
      },
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** A change from the upload queue. */
export function change(
  clientId: number,
  op: UpdateType,
  table: string,
  id: string,
  opData?: Record<string, unknown>,
): CrudEntry {
  return {
    clientId,
    op,
    table,
    id,
    ...(opData === undefined ? {} : { opData }),
    toJSON: () => ({}),
    equals: () => false,
    toComparisonArray: () => [],
  };
}

/** A device database holding one transaction of changes, which records what the connector does to it. */
export function deviceDatabase(changes: CrudEntry[] | null) {
  const executed: { sql: string; params: unknown[] }[] = [];
  let completed = 0;
  const database = {
    getNextCrudTransaction: () =>
      Promise.resolve(
        changes === null
          ? null
          : new CrudTransaction(
              changes,
              () => {
                completed += 1;
                return Promise.resolve();
              },
              1,
            ),
      ),
    execute: (sql: string, params: unknown[]) => {
      executed.push({ sql, params });
      return Promise.resolve({ rowsAffected: 1 });
    },
  };
  return {
    database,
    executed,
    timesCompleted: () => completed,
  };
}
