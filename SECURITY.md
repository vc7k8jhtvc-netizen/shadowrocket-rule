# Security

This repository is public. Private subscription URLs, proxy credentials, UUIDs, passwords, tokens, generated private configurations, and node connection parameters must not be committed.

## If a credential is exposed

1. Revoke or rotate the credential at the provider first.
2. Remove the sensitive material from the current branch.
3. Rewrite repository history if necessary.
4. Treat old Git objects, workflow logs, pull requests, forks, caches, and local clones as potentially still containing the exposed value.
5. If sensitive Git objects remain reachable after history rewriting, request GitHub-side cleanup where appropriate.

History rewriting is not a substitute for credential revocation.

## Local checks

Run `bash scripts/check-config.sh` before publishing changes. The checks include a current-tree heuristic scan for common credential formats. This is a guardrail, not a guarantee that no secret exists.

For a private WestData configuration, run `node scripts/check-westdata-local.js /path/to/private-westdata.conf`. The validator reports only counts and PASS/FAIL status. Do not commit the private input file.
