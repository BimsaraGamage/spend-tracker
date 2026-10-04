#!/usr/bin/env bash
# Starts the local PowerSync service against the local Supabase stack, from a
# clean slate. Run `supabase start` first.
#
# Writes fresh random secrets for this run to powersync/.env (ignored by git),
# then starts the containers in compose.yaml and waits until they're healthy.
set -euo pipefail
cd "$(dirname "$0")"

# The local stack's development signing secret, which the service needs to
# verify sessions. It's the same on every machine, but read it rather than
# copy it here.
if ! status=$(supabase status --output env); then
  echo "The local Supabase stack isn't running. Start it with: supabase start" >&2
  exit 1
fi
jwt_secret=$(sed -n 's/^JWT_SECRET="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"${status}")
if [[ -z "${jwt_secret}" ]]; then
  echo "The local Supabase stack isn't running Auth, which the sync service needs." >&2
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
PS_SUPABASE_JWT_SECRET=${jwt_secret}
EOF

docker compose up --detach --wait
echo "PowerSync is running at http://127.0.0.1:8080"
