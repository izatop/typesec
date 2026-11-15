# Bootstrap

## Upgrade

After updating the TypeSec submodule in `vendor/typesec`, run from the consuming project's root:

```sh
bun vendor/typesec/packages/bootstrap/bin/typesec bootstrap sync
```

Review the proposed `bunfig.toml` diff and accept the updated test exclusions, retaining any
project-specific settings. Sync asks before replacing a differing file and backs up replacements;
without an interactive prompt it keeps differing files. Sync does not move or classify tests.

## Tests

Follow the canonical [testing rules](../../.agents/rules.md#tests) and the
[migration checklist](../../.agents/CHANGELOG.md#2026-11-15--unit-and-integration-test-layout).
The template excludes `vendor/**` and `**/*.integration.test.*`, so `bun test`, `test:watch` and
`test:coverage` select unit tests. There is no separate `test:unit` script.

```sh
bun test --path-ignore-patterns 'vendor/**' .integration.test. # integration only
bun test --path-ignore-patterns 'vendor/**'                   # full suite
```

The CLI option replaces the entire configured ignore list; every override must retain `vendor/**`.
Files stay sequential; use `test.concurrent()` only for explicitly isolated independent cases.
