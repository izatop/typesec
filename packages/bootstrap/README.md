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

### Obsolete file instructions

`src/bootstrap/migrations.json` lists files and obsolete lines to remove during sync, separately
from the templates. These migrations run automatically, including without a terminal. The first
migration removes TypeSec's old Yarn rules from `.gitattributes`.

Each entry names a project-relative `file`, `removeLines`, and the file format's `commentPrefix`.
Matching ignores leading/trailing whitespace and runs of spaces or tabs; it otherwise requires
the whole line to match. Keep entries for older releases. Use this mechanism only for line-based
formats where this whitespace normalization is safe, not structured JSON settings.

Unmatched lines retain their original bytes and line endings. If at least one obsolete line was
removed and only blank lines or full-line comments remain, sync deletes the file. Files with no
matching lines, missing files and symbolic links are left alone. Original files are backed up under
`.backup/<time>/` before editing or deletion; an existing backup is never overwritten by a migration.
Repeating sync is a no-op for already migrated files. Migration metadata is not copied to projects.

## Formatting

`bun fmt` reads indentation, line width and line endings from `.editorconfig`. Keep these shared
editor defaults there; `bunfig.toml` controls code formatting and enables import and package.json
sorting. Options explicitly set in `[fmt]` override `.editorconfig`.

The VS Code formatter passes `--stdin-filepath`, so Bun applies the same file-specific settings
as the CLI. Use `bun fmt --doctor` to inspect configuration discovery and `bun fmt --check` to
check formatting without writing. Import sorting can produce a broad diff on first adoption.
VS Code removes unused imports on explicit save, but its sort and organize import actions are
disabled so that Bun alone controls import ordering.

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
