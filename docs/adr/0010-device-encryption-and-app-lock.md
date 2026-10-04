# ADR-0010: Encrypted device database and app lock

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-10)

## Context

Phones get lost, and browser profiles get copied. Financial data on a device needs protection beyond the operating system's defaults.

## Decision

- **Mobile database:** encrypted with SQLCipher, through PowerSync's op-sqlite adapter. Its random key is kept in Keychain or Keystore.
- **App lock:** biometric or PIN on mobile; an inactivity lock on web.
- **Web database (Phase 2):** encrypted with a key derived from the app-lock PIN. A forgotten PIN means wiping the local copy and syncing again; only changes not yet uploaded are lost.

## Consequences

- The op-sqlite adapter is in beta, so the walking skeleton tests it first. **Fallback:** the default adapter plus the operating system's file encryption.
- The server is the source of truth, so losing a local key is recoverable by syncing again ([ADR-0004](0004-local-first-powersync-supabase.md)).
