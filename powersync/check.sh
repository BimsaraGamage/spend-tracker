#!/usr/bin/env bash
# Checks that the local PowerSync service is healthy: connected to the
# database, finished with its first copy of the synced tables, and reporting
# no errors or warnings. Run it after ./powersync/up.sh.
set -euo pipefail
cd "$(dirname "$0")"

admin_token=$(sed -n 's/^PS_ADMIN_TOKEN=//p' .env)

# The admin token goes in through stdin, so it never shows in the process list.
diagnostics() {
  curl --silent --show-error --fail --max-time 5 --header @- --json '{}' \
    http://127.0.0.1:8080/api/admin/v1/diagnostics <<<"Authorization: Bearer ${admin_token}" |
    jq '.data // .'
}

# The first copy takes a few seconds; allow up to two minutes.
report=""
for _ in $(seq 60); do
  report=$(diagnostics) || report=""
  if jq --exit-status '.active_sync_rules.connections[0].initial_replication_done' <<<"${report:-null}" >/dev/null; then
    break
  fi
  sleep 2
done

if ! jq --exit-status '.active_sync_rules.connections[0].initial_replication_done' <<<"${report:-null}" >/dev/null; then
  echo "PowerSync didn't finish its first copy of the data within two minutes. Last report:" >&2
  echo "${report:-none}" >&2
  exit 1
fi

# Errors and warnings can be reported on the connection, the sync config or a
# table.
problems=$(jq '[.. | objects | .errors? // empty | .[]]' <<<"${report}")
if [[ "${problems}" != "[]" ]]; then
  echo "PowerSync reported problems:" >&2
  echo "${problems}" >&2
  exit 1
fi

tables=$(jq --raw-output '[.active_sync_rules.connections[0].tables[] | "\(.schema).\(.name)"] | join(", ")' <<<"${report}")
echo "PowerSync is replicating without errors: ${tables}"
