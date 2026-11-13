# TypeSec rules

Rules for writing code in a project built on TypeSec. They describe what this framework expects;
they do not replace the project's own conventions.

Throughout, `<typesec>` is the path to the TypeSec checkout — the submodule directory in a
consuming project, or `.` inside the checkout itself.

## Language

- Everything committed to the TypeSec repository is in English: code, identifiers, comments, JSDoc,
  test names, documentation, commit messages and pull request descriptions.
- Conversation with the user and the local notes in `.agents/doc/` may use the user's language;
  nothing from them is committed.
- A consuming project follows its own language convention.

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

Without `--root` the command indexes the checkout the binary belongs to, which is what you want when
looking up what TypeSec already provides. Point it elsewhere to index a different project of the
same shape — the one you are working in, for instance:

```sh
bun <typesec>/packages/bootstrap/bin/typesec api --root . search <keywords>
```

That shape is a `packages/tsconfig.json` listing the packages as project references, each with an
`exports` map and `.mts` or `.tsx` sources under `src/`. Nothing about the index is
TypeSec-specific.

TypeSec is not published to npm, so `bunx typesec api` resolves only where `@typesec/bootstrap` is a
dependency of the project — listing the submodule in `workspaces` is not enough. Anywhere else bunx
looks the name up on the registry and fails. Running the binary by path always works. A project that
uses it often should give it a script:

```json
{"scripts": {"api": "bun typesec/packages/bootstrap/bin/typesec api"}}
```

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
