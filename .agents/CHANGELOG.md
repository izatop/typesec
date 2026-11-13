# TypeSec changelog for agents

Migrations a project that consumes TypeSec has to apply after updating the submodule. Newest first.
Each entry says what changed, what to do and how to check it.

To see the entries added by an update of the submodule, before committing the update:

```sh
git diff -- vendor/typesec                                        # prints the old and the new submodule commit
git -C vendor/typesec diff <old>..<new> -- .agents/CHANGELOG.md   # the entries between them
```

Most entries are applied by `bun vendor/typesec/packages/bootstrap/bin/typesec bootstrap sync`, which
adds what is missing and asks before replacing anything that differs. Run it first, then go through
the entries for what it does not cover.

## 2026-11-13 — Submodules live in `vendor/`, `typesec:api` script

Every check covers the repository's own code only. A submodule changes independently of the project
and is checked by its own pipeline; tested, formatted and linted again in each project that pins
it, its thousands of files slow the development loop and add CI/CD overhead, and nothing found
there is the project's to fix. Submodules are therefore isolated in
`vendor/` at the project root, and the TypeSec submodule has to sit there, at `vendor/typesec`:
`bootstrap sync` refuses to run from a checkout anywhere else. Three things follow from the
directory:

- The shared `bunfig.toml` and `.oxlintrc.json` leave the root `vendor/` out of `bun test`,
  `bun fmt` and oxlint, so a pinned submodule is no longer tested, formatted and linted together
  with the project. A directory named `vendor` deeper in the tree is still checked.
- `bootstrap sync` lists `vendor/*/packages/**` in `workspaces`: the packages of every submodule in
  `vendor/`, at any depth under its `packages/`, are workspace packages of the project.
- `bootstrap sync` adds a `typesec:api` script, `typesec api --root vendor/typesec`. Inside a
  project shaped like TypeSec the plain `typesec api` indexes the project itself, not TypeSec.

Migrate:

- Move the submodule: `mkdir -p vendor && git mv typesec vendor/typesec`. Drop `typesec/packages/*`
  from `workspaces`, and replace `typesec/` with `vendor/typesec/` in scripts and agent instructions
  such as `@vendor/typesec/.agents/rules.md`.
- Run `bun vendor/typesec/packages/bootstrap/bin/typesec bootstrap sync` and accept `bunfig.toml`
  and `.oxlintrc.json`. It adds the workspaces glob and `typesec:api`, then installs.
- Another submodule in `vendor/` with a `packages/` directory joins the workspaces too. If its
  packages name `catalog:` entries the project lacks, `bun install` fails with
  `<name>@catalog: is not in the catalog`: add those entries to the project's catalog.
- Look up what TypeSec provides with `bun run typesec:api search <keywords>`.

Check: `bun test`, `bun fmt --check` and `oxlint` cover the project's own files only, in CI as well:
no job or script points at `vendor/`. `bun run typesec:api search array.uniq` prints
`@typesec/the/array`.

## 2026-11-13 — `.dockerignore` reaches nested packages, their manifests and `vendor/`

The template `.dockerignore` still denies everything by default: what is not allowed by name stays
out of the image. For packages at any depth under `packages/`, and under `vendor/<submodule>/packages/`,
it now allows exactly `src`, `bin`, `package.json`, `tsconfig.json` and `bunfig.toml`. Before, the
manifests of the packages and the whole submodule stayed out of the build context and
`bun install --frozen-lockfile` failed in the image: `workspace … is listed in bun.lock but not on
disk`.

- Migrate: accept the template `.dockerignore` in `bootstrap sync`. Whatever else the image needs,
  the project allows itself, one explicit line per file or directory; do not allow a whole tree
  such as `packages/**`.
- Check: the image build gets through `bun install --frozen-lockfile`.

## 2026-11-13 — Service factories run under the generation root

`resolve` runs a factory as tracked work of the root controller that registered the service, not in
the context of whichever task resolves it first. A factory that reads `runtime.use()` or
`runtime.signal` gets the root; a child task closing no longer aborts the factory it triggered. Once
the root began closing, `resolve` of an unbuilt service rejects with `RuntimeClosedException`
without calling the factory, and `close()` waits for factories in flight. A synchronous factory
throw is memoized like a rejection, so the factory runs once. `sync()`, `syncArray()` and
`locator()` are deprecated: read services with `await resolve()`.

- Migrate: a factory that must stop with the root should watch `runtime.signal`; one that ignores it
  delays shutdown. Replace `locator(fn)` with `await`ing the handler and `sync(Service)` with
  `await resolve(Service)`.
- Check: `grep -rn "locator(\|sync(" src` finds no service lookups; `bun test` passes.

## 2026-11-13 — `audit` script

`bootstrap sync` adds `"audit": "bun audit --audit-level=high"` to the project's scripts.

- Migrate: run `bootstrap sync`, or add the script by hand.
- Check: `bun run audit` exits with code 0. A high or critical advisory fails it: update the affected
  dependency (`bun update <pkg>`) rather than lowering the level.

## 2026-11-13 — `bun fmt` replaces oxfmt

Formatting runs on Bun's built-in formatter. Its options live in the `[fmt]` section of
`bunfig.toml`; `flavor = "oxfmt"` keeps oxfmt's output, including the 100-column width. Without it,
and without an `.oxfmtrc.json` or an `oxfmt` dependency, Bun formats like Prettier at 80 columns.

- Migrate:
    - Take the `[fmt]` section from the template `bunfig.toml` (`bootstrap sync` offers it). Move any
      option the project's `.oxfmtrc.json` sets on top of the template into `[fmt]` as well.
    - Delete `.oxfmtrc.json` and remove `oxfmt`: `bun remove oxfmt`.
    - Point scripts and CI at `bun fmt` / `bun fmt --check`. Do not name a script `fmt`: `bun fmt`
      runs a script of that name instead of the formatter.
    - VS Code: `bun fmt` has no language server. Format through `jkillian.custom-local-formatters`
      with `bun fmt --stdin-filepath ${file}`, as the template `.vscode/settings.json` does, and
      drop `oxc.enable.oxfmt`. Keep the oxc extension for oxlint diagnostics.
- Check: `bun fmt --doctor` prints no `Still needed: oxfmt` line, and `bun fmt --check` passes
  without reformatting the project. If it does reformat, an option was lost in the move. The line
  `Using oxfmt's defaults` in the doctor's report is expected: it is the `flavor` setting.

## 2026-11-13 — `typesec` binary, `typesec-sync` removed

The bootstrap tools are one binary with namespaces: `typesec api …` and `typesec bootstrap sync`.
`typesec-api` remains an alias of `typesec api`; `typesec-sync` is gone.

- Migrate: replace `typesec-sync` with `typesec bootstrap sync` and `typesec-api` with
  `typesec api` in scripts, docs and agent instructions. A script such as
  `"api": "bun <typesec>/packages/bootstrap/bin/typesec-api"` becomes `".../bin/typesec api"`.
- Check: `grep -rn "typesec-sync" --exclude-dir=node_modules --exclude-dir=typesec .` finds nothing.

## 2026-11-13 — Global virtual store

The template `bunfig.toml` sets `globalStore = true` under `[install]`: `node_modules` links into
Bun's cache instead of holding copies.

- Migrate: accept the template `bunfig.toml`, then `bun install`.
- Never run `bun pm cache rm` afterwards: it breaks `node_modules` in every project that links into
  the cache. Use `bun update <pkg>` or `bun pm cache prune` instead.
- Check: entries under `node_modules/.bun/` are symlinks into Bun's cache, and the test suite passes.
