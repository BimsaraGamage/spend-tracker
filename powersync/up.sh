#!/usr/bin/env bash
# Starts the local PowerSync service against the local Supabase stack, from a
# clean slate. Run `supabase start` first.
#
# Writes fresh random secrets for this run to powersync/.env (ignored by git),
# then starts the containers in compose.yaml and waits until they're healthy.
set -euo pipefail
cd "$(dirname "$0")"

if ! supabase status >/dev/null; then
  echo "The local Supabase stack isn't running. Start it with: supabase start" >&2
  exit 1
fi

# Stop the previous run, using its secrets.
if [[ -f .env ]]; then
  docker compose down --remove-orphans
fi

replication_password=$(openssl rand -hex 24)
storage_password=$(openssl rand -hex 24)
admin_token=$(openssl rand -hex 24)
umask 077
cat >.env <<EOF
PS_REPLICATION_PASSWORD=${replication_password}
PS_STORAGE_PASSWORD=${storage_password}
PS_ADMIN_TOKEN=${admin_token}
EOF

docker compose up --detach --wait
echo "PowerSync is running at http://127.0.0.1:8080"
