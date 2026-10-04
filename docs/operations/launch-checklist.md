# Launch checklist

The gates that must be complete before each milestone. Tick each item in the pull request that completes it.

## Before entering real financial data (end of Phase 2)

- [ ] Nightly encrypted database backups running, from a separate private repository
- [ ] A restore drill done and documented
- [ ] App lock and the encrypted on-device database working on mobile
- [ ] Tests proving telemetry scrubs financial data, passing
- [ ] The commit-signing key registered on GitHub

## Before inviting anyone else (Phase 4)

- [ ] A domain bought, and a custom email sender (SMTP) configured for sign-in codes
- [ ] A Code of Conduct contact address added
- [ ] "Reported content" enabled in the repository's moderation settings
- [ ] A privacy policy and terms published
- [ ] In-app account deletion and data export
- [ ] Rate limits on authentication, and a captcha on sign-up
- [ ] Free-tier limits reviewed (database size, idle pausing, email quotas)
- [ ] A self-hosting guide
- [ ] The threat model refreshed
- [ ] CONTRIBUTING updated to welcome outside code contributions

## Before the app stores (Phase 5)

- [ ] Apple Developer Program and Google Play Console enrolment
- [ ] Sign in with Apple enabled
- [ ] Final app name and bundle identifiers (a one-way door: they can't change after the first store release)
- [ ] App Store privacy labels and the Google Play Data safety form
- [ ] Production builds through EAS; TestFlight and Play internal testing
