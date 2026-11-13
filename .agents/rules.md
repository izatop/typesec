# TypeSec rules

Rules for writing code in a project built on TypeSec. They describe what this framework expects;
they do not replace the project's own conventions.

Throughout, `<typesec>` is the path to the TypeSec checkout — the submodule directory in a
consuming project, which is always under `vendor/` and normally `vendor/typesec`, or `.` inside the
checkout itself.

## Language

- Everything committed to the TypeSec repository is in English: code, identifiers, comments, JSDoc,
  test names, documentation, commit messages and pull request descriptions.
- Conversation with the user and the local notes in `.agents/doc/` may use the user's language;
  nothing from them is committed.
- A consuming project follows its own language convention.

## Updating TypeSec

- After updating the TypeSec submodule, read the new entries of `<typesec>/.agents/CHANGELOG.md` and
  apply their migrations. Run `typesec bootstrap sync` first; it covers most of them.
- A change to TypeSec that a consuming project has to act on gets a changelog entry in the same
  commit: what changed, how to migrate, how to check.

## Local AI working documentation

- Use `.agents/doc/` for local AI plans, task status, decisions, implementation reports, reviews and fixes.
  This directory is ignored by Git; do not force-add it to commits.
- Start with `.agents/doc/README.md` and the relevant task's status before continuing existing work.
  Verify these notes against the current code and working tree, including concurrent user changes.
- Keep each task in its own subdirectory. Maintain one current status; preserve dated reports as historical evidence.
  Distinguish proposed, agreed, implemented, verified, user-accepted and committed work.
- Update the local record after meaningful implementation, review or user corrections. Record open issues,
  fixes, verification commands and results, commit references and the next action without inventing missing history.
- Keep material for the final project documentation: accepted API contracts, examples, migration notes,
  limitations and links to supporting code and tests. After the planned work is complete, use these records
  to update the maintained project documentation; do not publish unfinished proposals as implemented behavior.
- Verification results apply to the recorded revision and dependencies. Recheck affected results after changes;
  passing checks do not replace user acceptance or authorize a commit by themselves.

## Search the API before writing anything

TypeSec carries a large utility surface. Look for what exists before adding a helper, a type, or a
dependency:

```sh
bun <typesec>/packages/bootstrap/bin/typesec api search <keywords>   # names, descriptions, signatures
bun <typesec>/packages/bootstrap/bin/typesec api show <name>         # one symbol in full
bun <typesec>/packages/bootstrap/bin/typesec api packages            # what each package is for
```

Without `--root` the command indexes the project around the working directory: the nearest
directory at or above it with a `packages/tsconfig.json` listing the packages as project references,
each with an `exports` map and `.mts` or `.tsx` sources under `src/`. Nothing about the index is
TypeSec-specific. Inside the TypeSec checkout that project is TypeSec. A consuming project of the
same shape gets its own packages, so there TypeSec's API takes `--root <typesec>`, which is what the
`typesec:api` script added by `typesec bootstrap sync` runs:

```sh
bun run typesec:api search <keywords>                                 # what TypeSec provides
bun <typesec>/packages/bootstrap/bin/typesec api search <keywords>    # what the project provides
```

Only when no such project surrounds the working directory does the command fall back to the checkout
the binary belongs to. TypeSec is not published to npm, so the short `typesec` binary resolves only
where `@typesec/bootstrap` is a dependency of the project, which sync adds; running the binary by
path always works.

Every keyword has to match. Narrow with `--package`, `--kind function|type|class|const`,
`--category`, `--limit`; add `--json` or `--yaml` to parse the result.

Search first for anything that sounds generic: grouping a list, comparing strings, parsing a TTL,
shifting a date, reading environment variables, guarding a type, waiting on a signal. Reimplementing
one of these is the most common mistake in a TypeSec codebase.

## Code style

- Separate logical blocks with blank lines; keep arrange, act and assert visibly distinct in tests.
  Consecutive single-line statements of one block stay together: a blank line marks a change of
  purpose, not every statement. Measuring `before`, calling the function and measuring `after` is one
  block; the `expect` calls that follow are the next one.
- After an expanded multiline statement, such as a call with callbacks or an object/array literal,
  leave a blank line before the next statement, even when both belong to the same logical phase.
  For example, separate `const pending = promise.then(...)` from `this.#pending.add(pending)`.
- Do not insert blank lines between adjacent closing delimiters or before `else`, `catch` or `finally`.
- Check these boundaries during independent style review. A passing formatter check does not replace
  this check: the formatter preserves blank lines but does not establish every logical boundary.

## Imports

- Sources are `.mts` and import each other through `.mjs` specifiers: `import {fn} from "./fn.mjs"`.
- Import helpers from their subpath, not the package root: `@typesec/the/fn`, `@typesec/the/assert`,
  `@typesec/the/object`. `typesec api show <name>` prints the specifier to use.
- Never add a utility dependency without checking `@typesec/the` first. It has no dependencies of
  its own, and the project keeps it that way.
- Use `assert` from `@typesec/the/assert`, not `node:assert` — it is runtime-neutral.

## Entrypoints

An application is two kinds of file:

- an **application file** declares the protocol and the context, and exports the factory as its
  default export;
- an **entrypoint file** calls that factory with one handler; its path under `app/` is its route.

```ts
// src/index.mts
export const app = context({name: "api", proto: ServeProto.configure({port: 3000}), context: {db}});
export default app;

// src/app/user/[id].mts — answers /user/42
export default route({app, name: "Get a User"})
    .use({args: useParams(Params)})
    .as(z.pipe(User, response.Json))
    .get(({proto}) => ({id: proto.parse("args").id, name: "Dave"}));
```

Rules that follow from this:

- One entrypoint per file, always the default export. Do not put two handlers in one file.
- `proto.parse(key)` only accepts a key the route declared through `use`.
- Read the request body through `useBody(request.Json.pipe(Schema))`; a raw `Request` body can be
  read once, and `request.Preflight` is what makes it reusable.
- To answer with a status, throw `ServeError` or use `assert(value, message, code)` from
  `@typesec/serve`. Do not build error responses by hand.

## Runtime, services, validation

- Reach the runtime through `runtime` from `@typesec/core`; it resolves per async context. Do not
  read `process.env.NODE_ENV` directly — use `runtime.isProduction()` and its siblings.
- Register a dependency with `service(Class, factory)` and read it with `await resolve(Class)`.
  `sync()`, `syncArray()` and `locator()` are deprecated: the throw-and-retry protocol is easy to misplace.
- Anything that must be released implements `Symbol.dispose` or `Symbol.asyncDispose`; the runtime
  disposes what a handler returns.
- `using` and `await using` bindings may exist only to trigger disposal at scope exit. Prefix a binding
  that is never read with `_` and keep the rest descriptive: `await using _closing = ...`. TypeScript
  exempts `_`-prefixed names from its unused-local hint (`TS6133`), which VS Code shows even with
  `noUnusedLocals` off. Configure `no-unused-vars` with `ignoreUsingDeclarations: true`, retaining
  unused-variable checks for ordinary declarations.
- Validate at the boundary with Zod. For a multi-step flow use `@typesec/sam`: `pipeline`, `schema`,
  `refine`, `match`, `transitions`.
- Typed RPC goes through `@typesec/mrpc`: one `contract` per procedure, a `domain` of contracts, a
  `backend` on the server and a `client` on the caller.

## Tests

- Keep the primary test as `<module>.test.mts` beside the source.
- Put additional suites in `test/<module>/<TestName>.test.mts`, relative to the source directory.
  `<module>` is the source filename without its extension; preserve its casing.
  Additional test names use PascalCase, for example `Ownership.test.mts` or `LateRegistration.test.mts`.
  Example: `controller/test/RuntimeController/Ownership.test.mts` tests `controller/RuntimeController.mts`.
  Do not add sibling `<module>.<TestName>.test.mts` files or use kebab-case names for additional tests.
- Use `bun:test`; import the module under test through its `.mjs` specifier.
- Assert types with `isXEqualToY` and `isXExtendsOfY` from `@typesec/the/test`.
- Cover both the passing and the failing path of a guard.
- Do not add tests that only enumerate exports or re-exports, check that imported symbols exist,
  compare a re-export with its source, or restate a direct type alias or explicitly declared field
  or return type. Use normal typed imports and `bun run check` for those checks.
- Keep type tests for generic inference, narrowing, overload selection and negative constraints.
  Runtime tests must check observable behavior; checking the shape of a dynamically constructed
  value is valid when the typechecker cannot guarantee it.
- Check compatibility aliases through actual operations, not standalone alias identity assertions.
  Identity checks for returned resources, errors or memoized results remain useful behavior tests.
- Do not add empty placeholders or smoke tests without an observable assertion.

```ts
import {describe, expect, test} from "bun:test";
import {isXEqualToY} from "@typesec/the/test";
import {fn} from "./fn.mjs";

describe("fn", () => {
    test("types", () => {
        expect(isXEqualToY<Actual, Expected>(true)).toBeTrue();
    });
});
```

## Adding to a package's public API

- Re-export the new symbol from the package entry point. A symbol its own module exports but no
  entry re-exports is unreachable; `typesec api search --json` reports it with `"import": null`.
- Every type that appears in a public signature must itself be exported, so a caller can write the
  type down and not only obtain it through inference.
- Document it with a JSDoc block: one sentence on what it does and when to use it, plus
  `@category <slug>`. Optionally `@example`, `@see`, `@deprecated <reason>`.
- Never rename a published symbol in place. Add the corrected name and keep the old one as a
  deprecated alias.
- `typesec api search --undocumented` must stay empty.

## Vendored submodules

- Every check covers the repository's own code and nothing else: tests, formatting and lint, during
  development and in CI/CD. A submodule changes independently of the project and has a pipeline of
  its own, which is where its code is checked. Depending on the project it can bring thousands of
  files; running tests and lint over them on every change slows the development loop and adds CI/CD
  overhead that grows with each submodule, and it finds nothing the project can fix.
- That is why submodules are isolated in `vendor/` at the project root, and why the shared
  configuration leaves the root `vendor/` out of `bun test`, `bun fmt` and oxlint (`bunfig.toml`,
  `.oxlintrc.json`). Keep it that way: do not add a submodule outside `vendor/`, and do not point a
  check, a script or a CI job at `vendor/`.
- TypeSec itself always sits there, at `vendor/typesec`, never at the project root:
  `typesec bootstrap sync` refuses to run from a checkout outside `vendor/`.
- `typesec bootstrap sync` lists `vendor/*/packages/**` in `workspaces`, so the packages of every
  submodule, at any depth under its `packages/`, resolve as workspace packages of the project.
  Every directory there that holds a `package.json` counts as one. Their `catalog:` dependencies resolve
  against the project's catalog, which therefore has to carry the entries they name.
- The patterns are anchored to the root on purpose. A directory named `vendor` deeper in the tree is
  the project's own code and is checked like any other. Do not widen them to `**/vendor/**`.

## Docker context

- `.dockerignore` denies by default: its first pattern is `*`, and only what is allowed explicitly
  gets into the image. What is not allowed is forbidden.
- Allow by name, one line per file or directory the image needs, as the template does for `src`,
  `bin` and the manifests of the packages. Never allow a whole tree such as `packages/**` or
  `vendor/**`.

## Package cache

- Installs use Bun's global virtual store, so `node_modules` links into Bun's cache directory.
- Do not run `bun pm cache rm`: it empties the store and breaks `node_modules` in every project on
  the machine. To refresh a package use `bun update <pkg>` or `bun add <pkg> --force`; to free disk
  space use `bun pm cache prune`. If the cache really has to be cleared, ask the user first.

## Verify before reporting done

```sh
bun run check       # types
bun test            # suite
bun run lint        # oxlint
bun fmt             # bun fmt, then re-run check
```

Do not hand-format code; `bun fmt` owns the formatting, including markdown.
