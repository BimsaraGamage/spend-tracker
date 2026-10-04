# Accounts, secrets and recovery

The project must survive the loss of any single device, including the maintainer's laptop (requirement NFR-REC-1). This runbook covers every account and secret: where each one lives, and how to recover.

## Principles

- **Nothing project-critical lives on only one machine.** A laptop holds a disposable clone, local Docker data and a commit-signing key that can be revoked.
- **Secrets live in exactly three places:** GitHub (Actions and Environment secrets), EAS secrets, and the maintainer's password manager. Never in the repository, chat, issues, logs or screenshots.
- **Accounts use the maintainer's personal email or "Sign in with GitHub"**, with two-factor authentication everywhere. Recovery codes go in the password manager.

## Accounts

| Service                         | Purpose                     | Sign-in                                              | Recovery                               | Status      |
| ------------------------------- | --------------------------- | ---------------------------------------------------- | -------------------------------------- | ----------- |
| GitHub                          | Code, CI, settings          | Password + 2FA on a personal phone                   | Recovery codes in the password manager | Active      |
| Supabase (staging, production)  | Database and authentication | Sign in with GitHub                                  | Through GitHub                         | Not created |
| PowerSync (staging, production) | Sync service                | Sign in with GitHub or email                         | Through GitHub or email                | Not created |
| Cloudflare                      | Web hosting                 | Email + 2FA                                          | Recovery codes in the password manager | Not created |
| Expo (EAS)                      | Mobile builds and updates   | Sign in with GitHub or email                         | Through GitHub or email                | Not created |
| Sentry                          | Crash reports (Phase 2)     | Sign in with GitHub                                  | Through GitHub                         | Not created |
| Renovate, CodeRabbit            | GitHub Apps                 | Installed on the repository                          | Reinstall from GitHub Marketplace      | Not created |
| Release bot (GitHub App)        | Opens release PRs           | App private key in GitHub secrets + password manager | Generate a new key in the App settings | Not created |

## Secrets inventory

Names only, never values. Add a row whenever a secret is created.

| Secret     | Stored in | Used by | Rotate |
| ---------- | --------- | ------- | ------ |
| _None yet_ |           |         |        |

## If a device is lost or compromised

Work from another device:

1. Sign in to GitHub and revoke the lost device's sessions (Settings → Sessions).
2. Delete that device's SSH keys, both authentication and signing (Settings → SSH and GPG keys). Commits already pushed stay "Verified", because GitHub stores verification results permanently.
3. Revoke the GitHub CLI's access (Settings → Applications → Authorized OAuth Apps → GitHub CLI).
4. Rotate any secret that existed on the device in plain text. By design, local `.env` files hold only values for local development.
5. Set up the new machine:
   - clone the repository and follow CONTRIBUTING (Node 24, pnpm through Corepack);
   - create a new signing key (see below);
   - register the key on GitHub.

## Commit signing on a new machine

Use a dedicated key for this repository only. Keep it outside `~/.ssh`, because desktop keyrings auto-load keys from there and would offer it for SSH logins.

```sh
mkdir -p ~/.config/spend-tracker/signing && chmod 700 ~/.config/spend-tracker ~/.config/spend-tracker/signing
ssh-keygen -t ed25519 -C "spend-tracker commit signing" -f ~/.config/spend-tracker/signing/signing_ed25519
git config gpg.format ssh
git config user.signingkey ~/.config/spend-tracker/signing/signing_ed25519
git config commit.gpgsign true
```

Register the public key (`signing_ed25519.pub`) on GitHub as a **Signing Key**: Settings → SSH and GPG keys → New SSH key.
