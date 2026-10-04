# ADR-0009: Authentication and sessions

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-09, D-10, D-32, D-34)

## Context

Sign-in has to work on web and mobile without passwords being mandatory. App Store rules require a privacy-friendly option whenever third-party sign-in is offered.

## Decision

- **Provider:** Supabase Auth.
- **Sign-in methods:**
  - email one-time code (primary);
  - email and password;
  - Google;
  - Sign in with Apple, built but behind a flag until Apple Developer enrolment.
- **Two-factor:** optional TOTP. Passkeys come once Supabase supports them in its JavaScript SDK.
- **Sessions:** stored in SecureStore on native platforms. Signing out wipes the local database and its keys.
- **Email delivery:** with no custom domain yet, Supabase's built-in mailer reaches only the project owner. A domain and a custom SMTP sender are launch blockers before anyone else signs up ([launch checklist](../operations/launch-checklist.md)).

## Consequences

- No password is ever required.
- Tests and staging use a password test account, or the local mail catcher, instead of real email.
