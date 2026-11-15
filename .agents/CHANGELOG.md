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

## 2026-11-15 — Unit and integration test layout

The [testing rules](rules.md#tests) replace tests beside source files with
`test/<ModuleName>/<TestCaseName>.unit.test.mts` or `.integration.test.mts`, relative to the source
module's directory (`.tsx` for JSX). The bootstrap template and TypeSec's root `bunfig.toml` now
exclude `["vendor/**", "**/*.integration.test.*"]`: plain `bun test`, watch and coverage select unit
tests. No `test:unit` script is needed. TypeSec's existing suites have been migrated, preserving
whole suites as `Behavior` where appropriate; its real HTTP suite is integration.

Migrate in a consuming project such as Kitchen:

1. Update the TypeSec submodule to the revision containing this entry, then read the changelog
   entries between the old and new revisions. From the project root, run
   `bun vendor/typesec/packages/bootstrap/bin/typesec bootstrap sync`.
2. Review and accept the `bunfig.toml` update, preserving project-specific settings. Sync offers
   replacement with a backup; non-interactive sync keeps differing files. Confirm `[test]` has
   `pathIgnorePatterns = ["vendor/**", "**/*.integration.test.*"]`. Sync does not migrate test files.
3. Inventory the existing suite before moving it. Preserve the source filename's case in
   `ModuleName`, use PascalCase behavior names and keep tests inside the package's type-checking
   scope. Existing primary suites may become `Behavior`; no need to split every `test()`.
   Update relative imports, fixtures and snapshot locations. Classify real PostgreSQL, Redis, S3
   and HTTP tests as integration, including local HTTP fixture servers. Isolated temporary
   filesystem fixtures may stay unit. A mixed suite remains integration until separated.
4. Update project scripts, CI jobs and test-path references. Watch and coverage inherit the unit
   exclusions; integration and full-suite jobs must explicitly override them. Keep files
   sequential, with no `--parallel`, global `--concurrent` or broad `concurrentTestGlob`.
   Assess isolation before using `test.concurrent()`; tmpfs alone is not case isolation.

Verify with the project's installed Bun and required services available:

```sh
bun test
bun test --path-ignore-patterns 'vendor/**' .integration.test.
bun test --path-ignore-patterns 'vendor/**'
bun run check
bun run lint
bun run fmt:check
```

The CLI ignore option replaces the entire configured list, so retain `vendor/**` in every override.
Compare discovered file lists and pass/skip totals against the pre-migration inventory: unit and
integration must be disjoint and their union must match the full suite, without lost cases or
new skips. Check watch and coverage selection too. Override inherited `NODE_ENV` with `test`
explicitly when necessary. The selection semantics were verified with Bun 1.4.4, including `.mts`
and JSX `.tsx` fixtures; recheck when upgrading Bun.

## 2026-11-14 — Environment and source-map policy

See the canonical [environment policy](rules.md#environment-modes-and-source-maps).
This documentation change does not change runtime/API or build configuration.

- Migrate: review feature gates and production artifact delivery against the policy; agree on
  implementation changes separately. Bootstrap sync does not implement these changes.
- Check: interactive features run only in development, tests override inherited `NODE_ENV`, and
  public production artifacts contain no separate or inline maps or source delivery through maps.
  Account for the existing `stage`/`staging` distinction and development fallback.

## 2026-11-14 — Oxlint rules fail lint on errors

The root and bootstrap `.oxlintrc.json` now set all explicitly configured rules to `error`,
except `unicorn/no-thenable`, which remains `warn` pending review of intentional test thenables.
Unused imports and ordinary unused variables now fail `lint --quiet`. Existing exceptions for
`using` declarations and `_`-prefixed variables and arguments remain. The plugin list is unchanged.

Migrate: run `typesec bootstrap sync` and accept the updated `.oxlintrc.json`.
Fix errors reported by `bun run lint`; run `bun x oxlint` to see warnings hidden by `--quiet`.

## 2026-11-14 — `bun check` is the type check, `typescript@7` replaces `@typescript/native-preview`

`bun check`, built into Bun 1.4.4, reads `tsconfig.json`, follows `references` with `-b` and
reports the same errors as TypeScript 7, with the `lib.*.d.ts` files built in and no `typescript`
package. It has no cache and no watch mode. TypeScript 7 itself is published as `typescript@7`
with the binary `tsc`; `@typescript/native-preview` and its `tsgo` have not been published since
July 2026. The scripts are now:

- `check`: `bun check -b -p packages`, the full check, what CI and the check before a commit run.
  Bun runs the built-in command for a `check` script that calls `bun check`; it does not recurse.
- `check:tsc`: `bun tsc -b packages`, and `check:tsc:watch` with `-w`: incremental through
  `.tsbuildinfo`, for the development loop.
- `check:watch` is gone. `typescript` replaces `@typescript/native-preview` in `catalogs.build`
  and `devDependencies`.

`bootstrap sync` now offers to remove what TypeSec stopped shipping, one question each: an obsolete
script, shown with its current value, and an obsolete dev dependency together with its catalog
entries. Without a terminal it removes nothing.

Migrate:

- Run `bootstrap sync`: replace `check`, remove `check:watch` and `@typescript/native-preview`,
  accept `.vscode/settings.json`. It installs `typescript@7` and drops the preview package.
- Agent instructions and docs: `bun run check:tsc:watch` while working, `bun run check` before a
  commit, as `.agents/rules.md` says. Anything that called `tsgo` calls `tsc`.
- VS Code: the extension `typescriptteam.native-preview` is now listed as "TypeScript 7" under the
  same id. The template settings point it at `node_modules/typescript` through `js/ts.tsdk.path`,
  so the editor checks with the same version as `bun check`. Keep the extension; without it VS
  Code falls back to its bundled TypeScript 5.

Check: `bun run check` prints `No type errors in … files across … projects`, `bun tsc --version`
prints `Version 7.0.2`, and `grep -rn native-preview package.json` finds nothing.

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

## 2026-11-15 — `unload` drops builds in flight and every alias of the instance

`unload(ref)` during a build drops that build: callers already waiting still get its result, which
is then released instead of published, and the promise `unload` returns settles after that release,
so it waits for the factory. A failed build is forgotten on `unload`, and the next `resolve` calls
the factory again; without `unload` the failure still stays for every caller. Every registration
holding the unloaded instance, such as `service(A, x); service(B, x)`, drops it too, and a factory
alias like `define("b", () => resolve(A))` rebuilds onto the new instance. `resolve` of an unloaded
value registration rejects with "Service X was unloaded and has no factory".

- Migrate: do not `await unload(ref)` where its build cannot finish first, such as inside that
  service's own factory or before releasing something the factory awaits. Registrations that must
  survive each other's `unload` need distinct instances. To recover from a failed boot,
  `await unload(ref)` and resolve again instead of registering the service anew.
- Limits: an unloaded promise registration awaits the same promise again and gets the released
  instance back; register a factory instead. A factory that hands out an object another
  registration already released publishes it as is.
- Check: `bun test` passes; `await unload(ref)` after a rejected build lets the next `resolve` succeed.

## 2026-11-14 — `unload` returns the release

`unload(ref)` returns `Promise<void>`: it settles when the disposer has finished and rejects with its
failure, a concurrent `unload` joins the same attempt, and an entry with nothing to release resolves
at once. A `resolve` during an unfinished release waits for it before rebuilding. The owner's
`close()` waits for a release in flight. `unload` of an unknown reference rejects instead of
throwing.

- Migrate: `await unload(ref)` wherever the test or the code asserts on the released state next;
  `unload(ref); await tick()` becomes `await unload(ref)`. A dropped promise leaves a disposer failure
  as an unhandled rejection, which exits the process under plain `bun`.
- Check: `bun test` passes; `await unload(ref)` of a failing disposer rejects with that failure.

## 2026-11-14 — Nothing is built after the root began closing

Once the generation's root controller has begun closing, `service()` and `define()` throw
`RuntimeClosedException` before registering anything, and a factory result that lands late is
released, or dropped when it has no disposal hook, instead of published: that `resolve` and every
later one reject with `RuntimeClosedException`, while a factory failure keeps its own reason.
Already built instances still serve shutdown work. `RuntimeClosedException.controller` is no longer
enumerable, so printing the exception no longer dumps the controller.

- Migrate: register services at application setup, not from shutdown work; shutdown work resolves
  only services built before the close began. A value refused by `service()` stays with the caller.
- Check: `bun test` passes; `resolve` of an unbuilt service after `lifecycle.close()` rejects with
  `RuntimeClosedException`.

## 2026-11-13 — Service instances are owned and released once

A disposable service instance, built by its factory or registered as a value, is owned by the root
controller that registered it and disposed once when that controller closes. `unload` releases the
instance through the owner, one microtask later, and the owner's `close()` does not dispose it again.
An instance with both hooks gets `Symbol.asyncDispose` only. `RuntimeController.release(resource)` is
new: it disposes one owned resource ahead of closure. `own` refuses a resource another controller
already owns.

- Migrate: drop manual disposal of services on shutdown; the lifecycle does it. A test that reads
  state right after `unload` awaits a tick first. Never `own` a resolved service on a child
  controller.
- Check: `bun test` passes; a disposable service closes exactly once on `lifecycle.close()`.

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
