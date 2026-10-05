# 2026-10-05 · Cost planning: device schema and sync

How devices receive and upload the reworked cost planning data (D-166–D-181). The assistant made these choices inside the maintainer's decisions without a separate question. ★ marks the option taken.

### D-186 · Devices hold each cost planning row's creator

- **Context:**
  - The access rules accept a new row only when `created_by` is the signed-in user.
  - The device schema from #32 had no `created_by` column on the cost planning tables, so a device could never have uploaded one of their rows.
  - The tests wrote those rows through the REST API, not through the device's upload queue, so the gap went unnoticed.
- **Options:**
  - ★ Sync `created_by`, and let the app set it on new rows, as for ledgers and transactions.
  - Default it to the signed-in user in the database.
- **Decision:** Sync it (assistant).
- **Why:** It follows the existing pattern. A shared ledger can also show who added each cost.
- **Action / outcome:**
  - The streams and the device schema gain `created_by` for tags, cost types, estimated and actual costs, fixed costs and monthly budgets.
  - The upload tests now only queue columns the device schema has, as a real device does. That check would have caught the gap.
  - The streams also send monthly budgets and `actual_costs.fixed_obligation_id` (D-177, D-178).
  - Device indexes now cover a ledger's month, which is what the screens will read, and a fixed cost's payments.

### D-187 · Tag lists cross to the server as JSON

- **Context:** The device has no JSON column type, so it stores a tag list as text. The connector uploaded that text as is, which Postgres stored as a JSON string. The database now refuses that (D-180).
- **Options:**
  - ★ The connector parses JSON columns before uploading, and refuses text that isn't JSON as a permanent rejection.
  - Keep tags in link tables on the device.
  - Convert the text in a database trigger.
- **Decision:** Parse in the connector (assistant).
- **Why:** It keeps one row per cost (D-175). The database still checks every list, so a device bug can't store a bad one.
- **Action / outcome:** Unparseable text is recorded on the device with the code `invalid_json`, and the queue moves on (SYNC3). Unit tests cover parsing and refusal. An integration test uploads a month's plan from the device and checks that its tag lists sync back as lists.
