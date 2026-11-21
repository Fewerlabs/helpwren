---
"@helpwren/cli": patch
---

`pnpm helpwren upgrade` backs up with a newer pg_dump when the one on the PATH is older than the
database, and says what to install when none is new enough.
