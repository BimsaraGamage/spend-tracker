/**
 * The device database (ADR-0004, ADR-0007).
 *
 * The synced tables hold exactly the columns the Sync Streams send
 * (powersync/sync-config.yaml), and the sync integration tests check that the
 * two match. PowerSync adds the `id` column itself. Values are SQLite types:
 * IDs, timestamps and calendar dates are text, and amounts are integer minor
 * units (DATA1, DATA3).
 */
import { column, Schema, Table } from "@powersync/common";

const ledgers = new Table({
  name: column.text,
  base_currency: column.text,
  time_zone: column.text,
  created_by: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const ledgerMembers = new Table(
  {
    ledger_id: column.text,
    user_id: column.text,
    role: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger: ["ledger_id"] } },
);

const accounts = new Table(
  {
    ledger_id: column.text,
    name: column.text,
    currency: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger: ["ledger_id"] } },
);

const transactions = new Table(
  {
    ledger_id: column.text,
    account_id: column.text,
    amount_minor: column.integer,
    currency: column.text,
    occurred_on: column.text,
    description: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    // Screens list a ledger's transactions newest first, or an account's.
    indexes: {
      ledger_date: ["ledger_id", "-occurred_on"],
      account: ["account_id"],
    },
  },
);

const tags = new Table(
  {
    ledger_id: column.text,
    name: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger: ["ledger_id"] } },
);

const costTypes = new Table(
  {
    ledger_id: column.text,
    name: column.text,
    tag_ids: column.text, // JSON array of UUIDs
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger: ["ledger_id"] } },
);

const estimatedCosts = new Table(
  {
    ledger_id: column.text,
    month: column.text,
    cost_type_id: column.text,
    amount_minor: column.integer,
    currency: column.text,
    tag_ids: column.text, // JSON array of UUIDs
    note: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger_month: ["ledger_id", "month"] } },
);

const actualCosts = new Table(
  {
    ledger_id: column.text,
    month: column.text,
    cost_type_id: column.text,
    amount_minor: column.integer,
    currency: column.text,
    tag_ids: column.text, // JSON array of UUIDs
    note: column.text,
    date: column.text,
    /** The fixed cost this cost pays, or null (D-167). */
    fixed_obligation_id: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    // Screens read a month of a ledger's costs, and a fixed cost's payments.
    indexes: {
      ledger_month: ["ledger_id", "month"],
      fixed_obligation: ["fixed_obligation_id"],
    },
  },
);

const fixedObligations = new Table(
  {
    ledger_id: column.text,
    month: column.text,
    cost_type_id: column.text,
    amount_minor: column.integer,
    currency: column.text,
    due_day: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger_month: ["ledger_id", "month"] } },
);

const monthlyBudgets = new Table(
  {
    ledger_id: column.text,
    month: column.text,
    amount_minor: column.integer,
    currency: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { ledger_month: ["ledger_id", "month"] } },
);

/**
 * Changes the server refused for good. Kept on this device only, so the app
 * can tell the user what happened, and never uploaded (SYNC3).
 */
const uploadRejections = new Table(
  {
    table_name: column.text,
    row_id: column.text,
    operation: column.text,
    /** The refused change, as JSON. */
    change: column.text,
    error_code: column.text,
    error_message: column.text,
    rejected_at: column.text,
  },
  { localOnly: true },
);

export const AppSchema = new Schema({
  ledgers,
  ledger_members: ledgerMembers,
  accounts,
  transactions,
  tags,
  cost_types: costTypes,
  estimated_costs: estimatedCosts,
  actual_costs: actualCosts,
  fixed_obligations: fixedObligations,
  monthly_budgets: monthlyBudgets,
  upload_rejections: uploadRejections,
});

/** Row types of the device database, by table. */
export type Database = (typeof AppSchema)["types"];
