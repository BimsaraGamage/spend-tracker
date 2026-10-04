/**
 * Clients for the local stack that the sync tests run against: Supabase Auth
 * and the REST API from `supabase start`, and PowerSync from
 * ./powersync/up.sh.
 *
 * Tests write through the REST API as a signed-in user, as the app's upload
 * queue will, so RLS and the database triggers apply. They read through
 * PowerSync's sync endpoint, as a new device would.
 */
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const powerSyncUrl = "http://127.0.0.1:8080";

interface LocalStack {
  readonly apiUrl: string;
  readonly publishableKey: string;
  readonly secretKey: string;
}

/** Reads the local stack's address and API keys from `supabase status`. */
function readLocalStack(): LocalStack {
  let output: string;
  try {
    output = execFileSync("supabase", ["status", "--output", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    throw new Error(
      "The local Supabase stack isn't running. Start it with: supabase start",
      { cause: error },
    );
  }
  const status = JSON.parse(output) as Partial<Record<string, string>>;
  const apiUrl = status["API_URL"];
  const publishableKey = status["PUBLISHABLE_KEY"];
  const secretKey = status["SECRET_KEY"];
  if (
    apiUrl === undefined ||
    publishableKey === undefined ||
    secretKey === undefined
  ) {
    throw new Error(
      "supabase status reported no API address or keys. The tests need the API gateway (kong) and the REST API.",
    );
  }
  return { apiUrl, publishableKey, secretKey };
}

const stack = readLocalStack();

/** Sends a JSON request and fails on any error status. */
async function send(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${method} ${url} failed with ${String(response.status)}: ${text}`,
    );
  }
  return text === "" ? undefined : (JSON.parse(text) as unknown);
}

/** A signed-in user of the local stack. */
export interface TestUser {
  readonly id: string;
  readonly accessToken: string;
}

/** Creates a confirmed user with a random address and password, and signs them in. */
export async function createUser(): Promise<TestUser> {
  const email = `sync-test-${randomUUID()}@example.test`;
  const password = randomUUID();
  await send(
    `${stack.apiUrl}/auth/v1/admin/users`,
    "POST",
    { apikey: stack.secretKey },
    { email, password, email_confirm: true },
  );
  const session = (await send(
    `${stack.apiUrl}/auth/v1/token?grant_type=password`,
    "POST",
    { apikey: stack.publishableKey },
    { email, password },
  )) as { access_token: string; user: { id: string } };
  return { id: session.user.id, accessToken: session.access_token };
}

/** A supabase-js client acting as the user, like the app's client once they've signed in. */
export function supabaseAs(user: TestUser) {
  return createClient(stack.apiUrl, stack.publishableKey, {
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function asUser(user: TestUser): Record<string, string> {
  return {
    apikey: stack.publishableKey,
    Authorization: `Bearer ${user.accessToken}`,
    Prefer: "return=minimal",
  };
}

/** Inserts a row as the user, through the REST API. */
export async function insertRow(
  user: TestUser,
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  await send(`${stack.apiUrl}/rest/v1/${table}`, "POST", asUser(user), row);
}

/** Changes one row as the user, through the REST API. */
export async function updateRow(
  user: TestUser,
  table: string,
  id: string,
  changes: Record<string, unknown>,
): Promise<void> {
  await send(
    `${stack.apiUrl}/rest/v1/${table}?id=eq.${id}`,
    "PATCH",
    asUser(user),
    changes,
  );
}

/** A row as a device stores it: column name to value. */
export type SyncedRow = Readonly<Record<string, unknown>>;

/** What a device holds after syncing: rows by table, then by id. */
export type SyncedData = ReadonlyMap<string, ReadonlyMap<string, SyncedRow>>;

/** One entry in a bucket's history, in PowerSync's sync protocol. */
interface Operation {
  readonly op: "PUT" | "REMOVE" | "MOVE" | "CLEAR";
  readonly object_type?: string;
  readonly object_id?: string;
  /** The row as JSON text, because the request asks for raw data. */
  readonly data?: string;
}

/** A bucket's rows, by "table/id". */
type Bucket = Map<string, [table: string, id: string, row: SyncedRow]>;

/** The lines of the sync stream that these tests read; the others are skipped. */
interface SyncLine {
  readonly data?: { readonly bucket: string; readonly data: Operation[] };
  readonly checkpoint_complete?: unknown;
}

/** Starts a sync request with a session token, as PowerSync's client SDKs do. */
export function openSyncStream(
  token: string,
  signal: AbortSignal | null = null,
): Promise<Response> {
  return fetch(`${powerSyncUrl}/sync/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      buckets: [],
      raw_data: true,
      client_id: randomUUID(),
      streams: { include_defaults: true, subscriptions: [] },
    }),
    signal,
  });
}

/**
 * Syncs from scratch with the user's session, as a new device would, and
 * returns what the device holds once the first checkpoint is complete.
 */
export async function syncAs(user: TestUser): Promise<SyncedData> {
  const abort = new AbortController();
  try {
    const response = await openSyncStream(user.accessToken, abort.signal);
    if (!response.ok || response.body === null) {
      throw new Error(
        `PowerSync refused to sync: ${String(response.status)} ${await response.text()}`,
      );
    }
    // Rows are kept per bucket, because a CLEAR operation empties one bucket.
    const buckets = new Map<string, Bucket>();
    for await (const line of readLines(response.body)) {
      if (line.checkpoint_complete !== undefined) {
        return byTable(buckets);
      }
      if (line.data !== undefined) {
        const bucket: Bucket =
          buckets.get(line.data.bucket) ??
          new Map<string, [table: string, id: string, row: SyncedRow]>();
        buckets.set(line.data.bucket, bucket);
        for (const operation of line.data.data) {
          apply(bucket, operation);
        }
      }
    }
    throw new Error("The sync stream ended before its first checkpoint.");
  } finally {
    abort.abort();
  }
}

function apply(
  bucket: Bucket,
  { op, object_type: table, object_id: id, data }: Operation,
): void {
  if (op === "CLEAR") {
    bucket.clear();
  } else if (table !== undefined && id !== undefined) {
    if (op === "PUT" && data !== undefined) {
      bucket.set(`${table}/${id}`, [table, id, JSON.parse(data) as SyncedRow]);
    } else if (op === "REMOVE") {
      bucket.delete(`${table}/${id}`);
    }
  }
}

function byTable(buckets: Map<string, Bucket>): SyncedData {
  const tables = new Map<string, Map<string, SyncedRow>>();
  for (const bucket of buckets.values()) {
    for (const [table, id, row] of bucket.values()) {
      const rows = tables.get(table) ?? new Map<string, SyncedRow>();
      tables.set(table, rows.set(id, row));
    }
  }
  return tables;
}

/** Splits a newline-delimited JSON response into its lines. */
async function* readLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SyncLine> {
  const decoder = new TextDecoder();
  let pending = "";
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim() !== "") {
        yield JSON.parse(line) as SyncLine;
      }
    }
  }
}

/** A session token for the user that looks real but is signed with the wrong key. */
export function forgeToken(userId: string): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + 3600,
  });
  const signature = createHmac("sha256", randomUUID())
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}
