# Repository Secrets

GitHub Actions secrets consumed by the workflows in `.github/workflows/`.
Configure under **Settings → Secrets and variables → Actions → New repository secret**.
Never commit real values. All values should be treated as long-lived credentials
and rotated on a regular cadence.

| Secret                        | Required by                        | Purpose                                                                          | How to provision                                                                                                       |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                  | `eas-build.yml`, `maestro-e2e.yml` | Authenticates the EAS CLI for builds/submits.                                    | expo.dev → Account Settings → Access tokens → Create. Scope to the yakshetra project.                                  |
| `APPLE_ID`                    | `eas-build.yml`                    | Apple ID used by `eas submit` for App Store submission.                          | The Apple Developer account email tied to the app's App Store Connect record.                                          |
| `APPLE_APP_SPECIFIC_PASSWORD` | `eas-build.yml`                    | App-specific password authorizing `eas submit` (2FA accounts).                   | appleid.apple.com → Sign-In & Security → App-Specific Passwords → Generate (label: "EAS Submit").                      |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `eas-build.yml`                    | Google Play service account JSON for Android submission.                         | Google Play Console → Users & permissions → Service accounts → Create (JSON key), paste full JSON as the secret value. |
| `MAESTRO_VERSION`             | `maestro-e2e.yml`                  | Pins the Maestro CLI release (e.g. `v1.40.0`). Optional — defaults to `v1.40.0`. | Pick a tag from github.com/mobile-dev-inc/maestro/releases and set it as the value.                                    |

## Branch protection

Pair these secrets with the rules in `.github/CODEOWNERS` so that any change to
`.github/workflows/**` requires maintainer review. This is the primary defense
against a compromised PR exfiltrating secrets via a modified workflow.

## Runner notes

- `test.yml` requires **no secrets** and runs on every push / pull request.
- `eas-build.yml` and `maestro-e2e.yml` will fail until `EXPO_TOKEN` (and the
  platform-specific submit secrets) are set; this is expected.
