# Security policy

spend-tracker handles personal financial data, so we take security reports seriously and appreciate responsible disclosure.

## Supported versions

The project is pre-1.0. Security fixes go to `main` and to the latest release only.

## Reporting a vulnerability

**Please don't open a public issue, discussion or pull request for a vulnerability.**

Report it privately through GitHub: **Security** tab → **Report a vulnerability**, or go directly to
<https://github.com/BimsaraGamage/spend-tracker/security/advisories/new>.

Please include:

- the affected component (app, database policies, sync configuration, CI/CD) and the version or commit;
- steps to reproduce, or a proof of concept;
- the impact: what an attacker can read, change or prevent;
- any suggested fix.

## What to expect

This is a volunteer-maintained project. We aim to:

- acknowledge your report within **7 days**;
- give an initial assessment and severity rating within **14 days**;
- agree a disclosure timeline with you. By default, we publish the fix and an advisory within **90 days**;
- credit you in the advisory, if you'd like.

## Scope

In scope:

- code in this repository: the app, database schema and Row Level Security policies, and sync rules;
- the GitHub Actions workflows and release process;
- the project's hosted instance, once it is public. Test only with accounts and data you own.

Out of scope:

- vulnerabilities in third-party services (Supabase, PowerSync, Cloudflare, Expo). Please report those to the vendor;
- volumetric denial-of-service, spam and social engineering;
- automated scanner output without a demonstrated impact.

## Good-faith research

If you make a good-faith effort to follow this policy, we won't pursue or support legal action against you. That means:

- avoid privacy violations, data destruction and service disruption;
- access only data you own or have permission to use;
- give us reasonable time to fix the issue before any disclosure.
