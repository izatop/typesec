# TypeSec rules

Rules for writing code in a project built on TypeSec. They describe what this framework expects;
they do not replace the project's own conventions.

Throughout, `<typesec>` is the path to the TypeSec checkout — the submodule directory in a
consuming project, or `.` inside the checkout itself.

## Search the API before writing anything

TypeSec carries a large utility surface. Look for what exists before adding a helper, a type, or a
dependency:

```sh
bun <typesec>/packages/bootstrap/bin/typesec-api search <keywords>   # names, descriptions, signatures
bun <typesec>/packages/bootstrap/bin/typesec-api show <name>         # one symbol in full
bun <typesec>/packages/bootstrap/bin/typesec-api packages            # what each package is for
```

TypeSec is not published to npm, so `bunx typesec-api` resolves only where `@typesec/bootstrap` is a
dependency of the project — listing the submodule in `workspaces` is not enough. Anywhere else bunx
looks the name up on the registry and fails. Running the binary by path always works. A project that
uses it often should give it a script:

```json
{"scripts": {"api": "bun typesec/packages/bootstrap/bin/typesec-api"}}
```

The command indexes the checkout it belongs to, so `--root <path>` is only needed to point it at a
different one.

Every keyword has to match. Narrow with `--package`, `--kind function|type|class|const`,
`--category`, `--limit`; add `--json` or `--yaml` to parse the result.

Search first for anything that sounds generic: grouping a list, comparing strings, parsing a TTL,
shifting a date, reading environment variables, guarding a type, waiting on a signal. Reimplementing
one of these is the most common mistake in a TypeSec codebase.

## Imports

- Sources are `.mts` and import each other through `.mjs` specifiers: `import {fn} from "./fn.mjs"`.
- Import helpers from their subpath, not the package root: `@typesec/the/fn`, `@typesec/the/assert`,
  `@typesec/the/object`. `typesec-api show <name>` prints the specifier to use.
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
  Inside a handler, `sync()` plus `locator()` avoids awaiting.
- Anything that must be released implements `Symbol.dispose` or `Symbol.asyncDispose`; the runtime
  disposes what a handler returns.
- Validate at the boundary with Zod. For a multi-step flow use `@typesec/sam`: `pipeline`, `schema`,
  `refine`, `match`, `transitions`.
- Typed RPC goes through `@typesec/mrpc`: one `contract` per procedure, a `domain` of contracts, a
  `backend` on the server and a `client` on the caller.

## Tests

- Co-locate as `<module>.test.mts` beside the source, one file per module.
- Use `bun:test`; import the module under test through its `.mjs` specifier.
- Assert types with `isXEqualToY` and `isXExtendsOfY` from `@typesec/the/test`.
- Cover both the passing and the failing path of a guard.

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
  entry re-exports is unreachable; `typesec-api search --json` reports it with `"import": null`.
- Every type that appears in a public signature must itself be exported, so a caller can write the
  type down and not only obtain it through inference.
- Document it with a JSDoc block: one sentence on what it does and when to use it, plus
  `@category <slug>`. Optionally `@example`, `@see`, `@deprecated <reason>`.
- Never rename a published symbol in place. Add the corrected name and keep the old one as a
  deprecated alias.
- `typesec-api search --undocumented` must stay empty.

## Verify before reporting done

```sh
bun run check       # types
bun test            # suite
bun run lint        # oxlint
bun run fmt:write   # oxfmt, then re-run check
```

Do not hand-format code; `oxfmt` owns the formatting, including markdown.
