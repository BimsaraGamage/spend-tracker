# Releases (release-please and the release bot)

[release-please](https://github.com/googleapis/release-please) reads the Conventional Commit titles of everything merged into `main`:

1. It keeps a **release PR** open that bumps the version in `package.json` and writes `CHANGELOG.md`.
2. Merging that release PR creates the `vX.Y.Z` tag and a GitHub release.
3. Versions start at `0.x`: features bump the minor version, fixes the patch version, and breaking changes also bump the minor version until `1.0.0`.

Its configuration is [`release-please-config.json`](../../release-please-config.json), and the workflow is [`.github/workflows/release.yml`](../../.github/workflows/release.yml).

## Why a GitHub App

Pull requests opened with the workflow's built-in `GITHUB_TOKEN` don't trigger other workflows, so the required CI check would never run on the release PR, and it could never be merged. A small GitHub App, the "release bot", fixes that:

- it gets a short-lived token for each run, limited to this repository and to three permissions;
- GitHub signs commits that an app creates through its API, provided they carry no custom author or committer details. That should satisfy the signed-commits rule. **Check this on the first release PR:** if its commits show as "Unverified", the ruleset blocks the merge, and this setup needs revisiting.

## One-time setup (maintainer)

1. **Create the app.** Go to GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**:
   - **Name:** for example `spend-tracker-release-bot` (names are global, so add a suffix if it's taken).
   - **Homepage URL:** `https://github.com/BimsaraGamage/spend-tracker`.
   - **Webhook:** untick **Active**.
   - **Repository permissions:** Contents → **Read and write**; Pull requests → **Read and write**; Issues → **Read and write**. Leave everything else at **No access**.
   - **Where can this GitHub App be installed?** → **Only on this account**.
   - Click **Create GitHub App**.
2. **Copy the Client ID** from the app's page.
3. **Generate a private key** on the same page. A `.pem` file downloads. Store it in your password manager straight away.
4. **Install the app:** in the app's left menu, click **Install App** → your account → **Only select repositories** → `spend-tracker`.
5. **Give the workflow its credentials through the `release` environment.** Environment secrets are released only to jobs running on `main`, so a workflow edited on another branch can't read them.
   - Repository **Settings** → **Environments** → `release`. If it doesn't exist yet, create it with **Deployment branches and tags** → **Selected branches** → `main`.
   - **Environment variables** → add `RELEASE_BOT_CLIENT_ID` = the Client ID.
   - **Environment secrets** → add `RELEASE_BOT_PRIVATE_KEY` = the full contents of the `.pem` file.
6. Delete the downloaded `.pem` file from the laptop once it's in the password manager and in the secret.

The next push to `main` runs release-please, which opens the first release PR.

If the key ever leaks: generate a new private key on the app's page, update the secret, and delete the old key there.
