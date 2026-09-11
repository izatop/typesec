# TypeSec

TypeSec is a TypeScript-first framework for building services whose shape is described by types.

An entrypoint is a file. Its default export is a strongly-typed handler, the directory tree around it is the
route tree, and the protocol that drives it — HTTP, command line, RPC — is a parameter rather than a rewrite.
The pieces are separate packages, so a project takes only the ones it needs.

Runtime: [Bun](https://bun.com). Sources are `.mts`, imported through their `.mjs` specifiers, and run without a
build step.

## Install

TypeSec is not published to npm. A project consumes it as a git submodule and resolves the
`@typesec/*` specifiers through its own workspaces:

```sh
git submodule add https://github.com/izatop/typesec.git typesec
```

```json
{
    "workspaces": {
        "packages": ["packages/*", "typesec/packages/*"]
    }
}
```

Paths below assume the submodule sits at `typesec/`. Scaffolding the shared lint, format and
TypeScript configuration into an existing project:

```sh
bun typesec/packages/bootstrap/bin/typesec-sync
```

## The model

Two files make an application:

- an **application file** declares the protocol and the context every handler receives;
- an **entrypoint file** exports one handler, and its path in the tree is its route.

```ts
// src/index.mts
import {ServeProto} from "@typesec/serve";
import {context} from "@typesec/unit";

export const app = context({
    name: "api",
    proto: ServeProto.configure({port: 3000}),
    context: {version: 1},
});

export default app;
```

```ts
// src/app/index.mts
import {app} from "../index.mjs";

export default app({
    name: "Hello",
    handle() {
        return new Response("Hello", {status: 200});
    },
});
```

The context is resolved once, through the service container. A protocol instance is built per request, the
response is validated against what the protocol accepts, and both are disposed afterwards.

## HTTP

Routes follow the file tree in Next.js style, so `app/user/[id].mts` answers `/user/42`. A route declares its
request transforms with `use`, the schema its return value is converted by with `as`, and its handler with one
method call.

```ts
// src/app/user/[id].mts
import {response, route, useParams} from "@typesec/serve";
import z from "zod";
import app from "../../index.mjs";

const Params = z.object({id: z.coerce.number()});
const User = z.object({id: z.number(), name: z.string()});

export default route({app, name: "Get a User"})
    .use({args: useParams(Params)})
    .as(z.pipe(User, response.Json))
    .get(function get({proto}) {
        const {id} = proto.parse("args");

        return {id, name: "Dave"};
    });
```

`proto.parse` only accepts keys the route declared, and its return type is the schema's output. Reading the body
works the same way, through `useBody(request.Json.pipe(Schema))`.

Throwing `ServeError`, or the `assert` from `@typesec/serve`, answers with that status:

```ts
import {assert} from "@typesec/serve";

assert(user, "Not found", 404);
```

## Command line

The CLI protocol routes `process.argv` over the same tree, and a command's default export is its handler.

```ts
// src/index.mts
import {CommandLineInterfaceProto} from "@typesec/cli";
import {context} from "@typesec/unit";

export const command = context({
    name: "reports",
    description: "Report commands",
    context: {generated: 0},
    proto: CommandLineInterfaceProto,
});

export default command;
```

```ts
// src/app/daily.mts
import command from "../index.mjs";

export default command({
    name: "daily",
    handle({context, proto}) {
        const {date} = proto.option("-d, --date <date>").parse();
        proto.table("Daily", [{date, generated: context.generated}]);
    },
});
```

```sh
bun typesec/packages/cli/bin ./src/index.mts daily -d 2026-01-01
```

`option` and `require` build the parser one flag at a time, and `parse` returns a record whose keys — and whose
optionality — are known at compile time.

## Typed RPC

`@typesec/mrpc` describes a call surface once and gives both ends the same types. A contract is a pair of Zod
schemas, a domain is a tree of contracts, and a backend pairs every contract with the procedure that answers it.

```ts
import {backend, client, ClientFetchProtocol, contract, domain, procedure} from "@typesec/mrpc";
import z from "zod";

const CountChars = contract({input: z.string(), output: z.number()});

const Api = domain("Api", {
    strings: {count: CountChars},
});

const server = backend(Api, {
    strings: {count: procedure(CountChars, ({input}) => input.length)},
});

await server.execute(context, {strings: {count: ["Hello"]}});
// {strings: {count: 5}}
```

The caller uses the same domain, so a query is checked against the contracts and the result is typed by them:

```ts
const api = client(Api, new ClientFetchProtocol("/rpc"));

await api.query({strings: {count: ["Hello"]}});
// {strings: {count: 5}}
```

A procedure's kind follows what its handler returns: a value is synchronous, a promise asynchronous, and an
async generator becomes a subscription when the contract's output is wrapped in `subscription(...)`.

Calling procedures in process needs no transport at all — `server.createStatic(context)` binds the context and
returns the same tree as plain functions.

## Pipelines and state

`@typesec/sam` composes validation, actions and state transitions into typed pipelines. A pipeline stays
synchronous until a stage returns a thenable.

```ts
import {match, pipeline, refine, schema, transitions} from "@typesec/sam";

const parseLength = pipeline(schema(z.string())).pipe((value) => value.length);

parseLength.parse(fromRequest); // accepts unknown, validates, returns number
```

`transitions` describes named states and the moves between them, `refine` narrows a value to one of them, and
`match` runs the single handler for the state a value is in. See [packages/sam/README.md](packages/sam/README.md)
for the full treatment.

## Runtime and services

`@typesec/core` owns the process: a tree of abort controllers where aborting a parent cascades to its children,
a service container, and the ambient `runtime` resolved per async context.

```ts
import {main, resolve, runtime, service} from "@typesec/core";
import {fn} from "@typesec/the/fn";

service(Database, () => Database.connect(url));

await main(
    fn.arrow("worker", async () => {
        const db = await resolve(Database);
        await runtime.heartbeat(() => db.close());
    }),
);
```

`main` runs the task under the lifecycle controller, disposes what it returns, and exits `0` or `1`. The root
controller traps `SIGINT` and `SIGTERM`, so a signal becomes an orderly shutdown of everything the process
started.

## Packages

| Package                                    | What it is                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| [`@typesec/the`](packages/the)             | Foundation: type utilities, guards, collections, dates, TTLs, environment. |
| [`@typesec/tracer`](packages/tracer)       | Structured, tagged tracing.                                                |
| [`@typesec/core`](packages/core)           | Runtime, lifecycle controllers, service container, cache.                  |
| [`@typesec/unit`](packages/unit)           | Protocol abstraction shared by the HTTP and CLI runtimes.                  |
| [`@typesec/serve`](packages/serve)         | HTTP runtime on Bun, with file-system routing and typed routes.            |
| [`@typesec/cli`](packages/cli)             | Command-line runtime, with file-system routing and a typed argv parser.    |
| [`@typesec/mrpc`](packages/mrpc)           | Contract-first RPC over Zod, shared by backend and client.                 |
| [`@typesec/sam`](packages/sam)             | Typed pipelines and state transition graphs.                               |
| [`@typesec/bootstrap`](packages/bootstrap) | Project scaffolding and the API index below.                               |

The table is in dependency order: `@typesec/the` has none of its own, and every package below it depends
only on the ones above. `mrpc` and `sam` sit apart from the protocol layer — they need `the` and Zod, nothing
else — so either can be used on its own.

## API index

`typesec-api` reports the public API of the project — every function, type, class and namespace member, with the
specifier to import it from and the line that declares it. It is meant for agents and for anyone who would
rather ask than grep.

```sh
bun packages/bootstrap/bin/typesec-api packages            # the package map and documentation coverage
bun packages/bootstrap/bin/typesec-api search unique       # keyword search over names and descriptions
bun packages/bootstrap/bin/typesec-api show array.uniq     # one symbol in full
```

```
$ bun packages/bootstrap/bin/typesec-api search unique
@typesec/the/array  array.uniq<T>(values: T[]): T[] (+1 overloads)
                    Keeps the unique values, comparing the values themselves or the result of `map`.
```

The command indexes the checkout it belongs to, whatever directory it runs from, so a consuming
project calls the same binary through the submodule — `bun typesec/packages/bootstrap/bin/typesec-api
search unique` — and needs `--root <path>` only to point it at a different checkout. `bunx
typesec-api` works wherever the packages are part of the workspace, here included, but not from a
project that merely checks the submodule out.

The examples below shorten the invocation to `typesec-api`. A project that reaches for it often
should give it a script:

```json
{"scripts": {"api": "bun typesec/packages/bootstrap/bin/typesec-api"}}
```

Every keyword has to match, and filters narrow further:

```sh
typesec-api search parse --package the --kind function
typesec-api search --category state
typesec-api search --undocumented
```

`--kind` groups the labels the way a caller thinks about them: `function` covers namespace members and class
methods, `type` covers interfaces, `const` covers namespace objects. `--json` and `--yaml` give the same data
machine-readably. Nothing is generated or committed: the index is parsed from source on each run, in under
a tenth of a second.

The same index is available in process:

```ts
import {indexProject, search} from "@typesec/bootstrap/api";

const index = await indexProject("./typesec");
const found = search(index, {keywords: ["ttl"], kind: "function"});
```

A symbol its own module exports but no entry point re-exports is listed as `internal` rather than hidden, which
is how an unreachable export becomes visible.

## Documentation tags

The index reads JSDoc, so a description lives next to the code it describes and cannot drift from it. The
vocabulary is deliberately small:

```ts
/**
 * Keeps the unique values, comparing the values themselves or the result of `map`.
 * @category collection
 * @example array.uniq(users, (user) => user.id)
 */
```

- the first paragraph is the description;
- `@category` groups a symbol by function, which is what `search --category` filters on;
- `@example` is a one-liner, or an indented block;
- `@see` and `@deprecated` carry the rest.

`typesec-api search --undocumented` lists whatever is still missing one.

## Agent rules

[`.agents/rules.md`](.agents/rules.md) is the instruction file for coding agents: how to search the API
before writing a helper, how entrypoints and imports work, what a package's public surface requires,
and which commands verify a change. It is plain Markdown with no tool-specific syntax, so any agent
can read it.

TypeSec is consumed as a git submodule, so the file is already in the consuming repository — the
submodule commit pins its version along with the code it describes. **Reference it; do not copy it.**
A copy would drift from the very commit the submodule pins.

Add one line to the instruction file your agent reads. Paths are relative to the file that holds
them, and `typesec/` is wherever the submodule sits:

```md
<!-- AGENTS.md — read by most agents -->

Follow the TypeSec rules in [typesec/.agents/rules.md](typesec/.agents/rules.md).
```

```md
<!-- CLAUDE.md — @ imports the file into every session -->

@AGENTS.md
@typesec/.agents/rules.md
```

The rules tell an agent to run `typesec-api` through the submodule:

```sh
bun typesec/packages/bootstrap/bin/typesec-api search <keywords>
```

The command indexes the checkout it belongs to, so no `--root` is needed from a consuming project.

## Conventions

- Sources are `.mts` and import each other through `.mjs` specifiers.
- Packages are named `@typesec/<name>`; helpers are imported through their subpath — `@typesec/the/fn`, not the
  package root.
- Tests sit beside the code as `<module>.test.mts` and run on Bun's test runner. Type-level assertions use the
  helpers in `@typesec/the/test`:

    ```ts
    import {isXEqualToY} from "@typesec/the/test";

    expect(isXEqualToY<Actual, Expected>(true)).toBeTrue();
    ```

- The package list of the build lives in `packages/tsconfig.json`, which is also what the API index reads.

```sh
bun run check       # typecheck every package
bun test            # run the suite
bun run lint        # oxlint
bun run fmt:check   # oxfmt
```

## Status

In active development, pre-1.0. Package APIs may still change between versions.
