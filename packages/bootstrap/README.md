# Bootstrap

## Upgrade

After updating the TypeSec submodule in `vendor/typesec`, run from the consuming project's root:

```sh
bun vendor/typesec/packages/bootstrap/bin/typesec sync
```

With the workspace dependencies installed, use `bun typesec sync` or `bun run sync`.
The original `typesec bootstrap sync` remains available for existing scripts.

Review the proposed `bunfig.toml` diff and accept the updated test exclusions, retaining any
project-specific settings. Sync asks before replacing a differing file and backs up replacements;
without an interactive prompt it keeps differing files. Sync does not move or classify tests.

### VS Code settings

Sync automatically merges `src/files/.vscode/settings.json` into the project's `.vscode/settings.json`.
Objects are merged recursively; template values and arrays replace matching project values.
Project settings absent from the template are preserved. The adjacent `settings-deletions.json`
contains an array of literal top-level setting names to remove after merging, for example
`["typescript.tsdk"]`. Dots in setting names are not path separators. Keep historical deletions
in this list so projects can skip releases. This migration file is not copied to the project.

Changed settings are backed up under `.backup/<time>/.vscode/settings.json` without prompting.
JSONC comments and trailing commas are accepted; changed files are written as JSON without comments.
If the merged values are unchanged, the original file is left untouched.

Debug configurations in `.vscode/launch.json` belong to each project and are not shipped by bootstrap.
Existing launch configurations are left untouched.

## Formatting

`bun fmt` reads indentation, line width and line endings from `.editorconfig`. Keep these shared
editor defaults there; `bunfig.toml` controls code formatting and enables import and package.json
sorting. Options explicitly set in `[fmt]` override `.editorconfig`.

The VS Code formatter passes `--stdin-filepath`, so Bun applies the same file-specific settings
as the CLI. Use `bun fmt --doctor` to inspect configuration discovery and `bun fmt --check` to
check formatting without writing. Import sorting can produce a broad diff on first adoption.

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
