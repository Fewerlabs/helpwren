# Security policy

Helpwren handles support conversations and contact details, so we take security reports seriously.

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a security problem.**

Report it privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. This creates a private advisory visible only to the maintainers and
to you.

Please include:

- what the problem is and what an attacker could do with it
- the steps or a proof of concept to reproduce it
- the version or commit you tested
- any suggested fix, if you have one

## What to expect

- We aim to acknowledge a report within three working days.
- We will keep you informed while we investigate and agree a disclosure date with you.
- We will credit you in the advisory unless you prefer otherwise.

## Reviews

What has been checked for abuse and misuse, what was fixed and what is left:
[docs/security/abuse-review.md](docs/security/abuse-review.md).

## Supported versions

| Version                 | Security fixes |
| ----------------------- | -------------- |
| Latest 0.x release      | Yes            |
| Earlier 0.x releases    | No             |
| `main` between releases | Yes            |

While Helpwren is at 0.x, fixes land in the next release rather than being backported. Upgrade
with `pnpm helpwren upgrade`; see [Upgrading](https://helpwren.fewerlabs.dev/docs/operations/upgrading)
([source](docs/operations/upgrading.md)).
