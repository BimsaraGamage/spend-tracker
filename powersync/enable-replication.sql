-- Local development and CI only, run by compose.yaml on every start.
--
-- Lets powersync_role sign in with this run's password. Staging and production
-- set theirs once, with psql's \password (docs/operations/sync-service.md).
alter role powersync_role with login password :'password';

-- Drops the replication slots of earlier runs. Their bucket storage is gone,
-- and an unused slot makes Postgres keep its write-ahead log forever.
select pg_drop_replication_slot(slot_name)
from pg_replication_slots
where slot_name like 'powersync%' and not active;
