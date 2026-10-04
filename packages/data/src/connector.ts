/**
 * Connects the device database to the backend (ADR-0004, ADR-0008, ADR-0014).
 *
 * PowerSync downloads each user's data through the Sync Streams. This
 * connector does the rest: it gives PowerSync the user's session, and uploads
 * the changes made on the device through Supabase's REST API as that user, so
 * row level security and the database rules check every change.
 */
import {
  type CrudEntry,
  type CrudTransaction,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
  UpdateType,
} from "@powersync/common";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  applied,
  classifyUploadError,
  type UploadOutcome,
} from "./upload-outcome";

/**
 * The parts of a Supabase client that the connector uses. The app passes its
 * client, created with `createClient`, which holds the user's session.
 */
export interface SupabaseApi {
  readonly auth: Pick<SupabaseClient["auth"], "getSession">;
  from(table: string): {
    insert(
      values: Record<string, unknown>,
    ): PromiseLike<{ error: PostgrestError | null }>;
    update(
      values: Record<string, unknown>,
      options?: { count: "exact" },
    ): {
      eq(
        column: "id",
        value: string,
      ): PromiseLike<{ error: PostgrestError | null; count: number | null }>;
    };
  };
}

export interface SupabaseConnectorOptions {
  readonly supabase: SupabaseApi;
  /** The PowerSync service's address, from the app's configuration. */
  readonly powerSyncUrl: string;
  /** The current time. Tests replace it (TEST3). */
  readonly now?: () => Date;
}

/** The parts of the device database that uploading uses. */
export interface UploadDatabase {
  getNextCrudTransaction(): Promise<CrudTransaction | null>;
  execute(sql: string, params: unknown[]): Promise<unknown>;
}

/** Thrown to make PowerSync retry an upload after a delay. */
export class UploadRetryError extends Error {
  readonly code: string;

  constructor(table: string, code: string, message: string) {
    super(
      `A change to ${table} wasn't uploaded and will be retried: ${code} ${message}`,
    );
    this.name = "UploadRetryError";
    this.code = code;
  }
}

/** Columns the server maintains itself, which uploads never send. */
const serverManagedColumns = new Set([
  "created_at",
  "updated_at",
  "deleted_at",
]);

/** RLS skips a row the user may not change without raising an error. */
const notApplied: UploadOutcome = {
  kind: "rejected",
  code: "not_applied",
  message:
    "The server changed nothing: the row doesn't exist, or the user may not change it.",
};

export class SupabaseConnector implements PowerSyncBackendConnector {
  readonly #supabase: SupabaseApi;
  readonly #powerSyncUrl: string;
  readonly #now: () => Date;

  constructor({
    supabase,
    powerSyncUrl,
    now = () => new Date(),
  }: SupabaseConnectorOptions) {
    this.#supabase = supabase;
    this.#powerSyncUrl = powerSyncUrl;
    this.#now = now;
  }

  /** The user's session for PowerSync, or null when nobody is signed in. */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data, error } = await this.#supabase.auth.getSession();
    if (error !== null) {
      throw error;
    }
    if (data.session === null) {
      return null;
    }
    return { endpoint: this.#powerSyncUrl, token: data.session.access_token };
  }

  /**
   * Uploads the oldest local transaction, one change at a time (SYNC3).
   *
   * - A change the server refuses for good is recorded on the device for the
   *   app to show, and the upload moves on, so it never blocks the queue.
   * - Any other failure throws, and PowerSync retries the whole transaction
   *   later. The changes before it were already applied, and uploading them
   *   again is harmless (SYNC2).
   *
   * PowerSync calls this again while changes remain in the queue.
   */
  async uploadData(database: UploadDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (transaction === null) {
      return;
    }
    for (const change of transaction.crud) {
      const outcome = await this.#upload(change);
      if (outcome.kind === "retry") {
        throw new UploadRetryError(change.table, outcome.code, outcome.message);
      }
      if (outcome.kind === "rejected") {
        await recordRejection(database, change, outcome, this.#now());
      }
    }
    await transaction.complete();
  }

  async #upload(change: CrudEntry): Promise<UploadOutcome> {
    const table = this.#supabase.from(change.table);
    switch (change.op) {
      case UpdateType.PUT: {
        // A plain insert, not an upsert: Postgres checks read policies on the
        // new row of INSERT ... ON CONFLICT, and a new ledger isn't readable
        // until its owner membership exists. An insert that already arrived
        // fails on its primary key instead, which counts as applied.
        const { error } = await table.insert({
          ...clientColumns(change),
          id: change.id,
        });
        return error === null
          ? applied
          : classifyUploadError(error, change.table);
      }
      case UpdateType.PATCH: {
        const changes = clientColumns(change);
        if (Object.keys(changes).length === 0) {
          return applied;
        }
        const { error, count } = await table
          .update(changes, { count: "exact" })
          .eq("id", change.id);
        if (error !== null) {
          return classifyUploadError(error, change.table);
        }
        return count === 0 ? notApplied : applied;
      }
      case UpdateType.DELETE: {
        // Deletes are soft (DATA6). If no row changes, the row is already
        // gone for this user, which is what the delete asked for.
        const { error } = await table
          .update({ deleted_at: this.#now().toISOString() })
          .eq("id", change.id);
        return error === null
          ? applied
          : classifyUploadError(error, change.table);
      }
    }
  }
}

/** The change's columns, without those the server maintains itself. */
function clientColumns(change: CrudEntry): Record<string, unknown> {
  const columns = (change.opData ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(columns).filter(([name]) => !serverManagedColumns.has(name)),
  );
}

/**
 * Keeps a refused change on the device for the app to show (SYNC3). Its ID
 * comes from the change's place in the upload queue, so a retried upload
 * doesn't record the same refusal twice.
 */
async function recordRejection(
  database: UploadDatabase,
  change: CrudEntry,
  rejection: { readonly code: string; readonly message: string },
  rejectedAt: Date,
): Promise<void> {
  const id = `upload-${String(change.clientId)}`;
  await database.execute(
    `INSERT INTO upload_rejections
       (id, table_name, row_id, operation, change, error_code, error_message, rejected_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM upload_rejections WHERE id = ?)`,
    [
      id,
      change.table,
      change.id,
      change.op,
      JSON.stringify(change.opData ?? {}),
      rejection.code,
      rejection.message,
      rejectedAt.toISOString(),
      id,
    ],
  );
}
