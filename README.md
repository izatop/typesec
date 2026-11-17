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
git submodule add https://github.com/izatop/typesec.git vendor/typesec
```

```json
{
    "workspaces": {
        "packages": ["packages/*", "vendor/*/packages/**"]
    }
}
```

TypeSec's packages reference their shared dependencies through `catalog:`, which resolves against
the workspace root — your project, not the submodule. Your catalog therefore has to carry the
entries the packages name; the `workspaces.catalog` of this repository is the reference list, and a
missing one fails `bun install` with `<name>@catalog: is not in the catalog`.

`vendor/` at the project root is the place for submodules. Checks cover the repository's own code
only, so the shared configuration leaves `vendor/` out of `bun test`, `bun fmt` and oxlint: a
submodule changes independently and is checked by its own pipeline, and re-running its tests and lint
in every project that pins it slows the development loop and adds CI/CD overhead. TypeSec always sits
there, never at the project root: `bootstrap sync` refuses to run from a checkout outside `vendor/`.
Paths below assume `vendor/typesec/`. Scaffolding the shared lint, format and TypeScript
configuration into an existing project:

```sh
bun vendor/typesec/packages/bootstrap/bin/typesec bootstrap sync
```

The command adds what the project is missing: the configuration files, the packages of every
submodule in `vendor/` to `workspaces`, the entries of TypeSec's catalog, the dev dependencies and the shared
scripts (`check`, `test`, `lint`, `audit`, `fmt:check`, `sync`, `typesec:api` and their variants),
then runs `bun install`. It never changes a catalog entry or dependency the
project already pins. A file or script the project has in a different form is shown as a diff and
replaced only if you agree; a replaced file moves to `.backup/<time>/`, which is added to
`.gitignore`. Without a terminal it keeps everything that differs. `--no-install` skips the install.

### Package cache

The shared `bunfig.toml` turns on Bun's global virtual store (`install.globalStore`): packages are
unpacked once into Bun's cache, and each project's `node_modules` links into it. Installs after a
fresh checkout or `rm -rf node_modules` are much faster, and the copies are shared across projects.

The cost is that every such project depends on the cache directory. `bun pm cache rm` empties it,
including the store, and breaks `node_modules` in every project on the machine until `bun install`
runs in each of them again. You rarely need it:

| Goal                             | Command                                       |
| -------------------------------- | --------------------------------------------- |
| Pick up a version just published | `bun update <pkg>` or `bun add <pkg> --force` |
| Free disk space                  | `bun pm cache prune` (keeps the store)        |
| See the cache directory          | `bun pm cache`                                |

Reach for `bun pm cache rm` only when the cache itself is corrupt or the store has grown too large,
and run `bun install` in your projects afterwards.

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
bun vendor/typesec/packages/cli/bin ./src/index.mts daily -d 2026-01-01
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

service(Database, () => Database.connect(url), false);

void main(
    fn.arrow("worker", async () => {
        const db = await resolve(Database);
        await runtime.heartbeat(() => db.flush());
    }),
);
```

`main` waits for the eager services (`lazy: false`), runs the task under the lifecycle controller, disposes
what it returns, closes the lifecycle and exits `0`, or `1` on failure. One `SIGINT` or `SIGTERM` closes the
lifecycle and ends the process once its cleanup has finished; without `main` the signal is raised again after cleanup,
so the process ends with the signal's usual code.

### Resources

Every controller owns what it is given and releases it once, newest first, when it closes:

- `own(resource)` takes a `Disposable` or `AsyncDisposable`, `defer(callback)` a cleanup callback, and
  `release(resource)` disposes one of them ahead of closure. An object with both hooks gets `Symbol.asyncDispose`
  only.
- `close()` aborts at once, waits for the work started through `run` or `track` and for child controllers, then
  disposes. Await it to observe the cleanup; several failures arrive as one `AggregateError`.
- `clone()` creates a child the parent closes and waits for. `runtime.run(task, child)` runs a task in the child's
  context and closes the child afterwards.
- Once closing has begun, `own` and `defer` throw `RuntimeClosedException` and still release what they were given;
  `track`, `run` and `service` refuse without calling or registering anything.
- Cleanup and tracked work must not await their own controller's `close()`, or an ancestor's: closure waits for them.

### Services

`service(Class, factory)` registers how a service is built and `await resolve(Class)` builds it once and caches it.

- A function is always the factory, and it may return the instance or a promise of it. Any other value is the
  instance itself. A promise or another thenable is refused: `service(Db, () => connect())`, not
  `service(Db, connect())`.
- The factory runs as work of the generation's root controller, whichever task resolves it first, so it reads the
  root through `runtime.use()` and should stop when `runtime.signal` aborts. A factory that ignores the signal holds
  shutdown up.
- A disposable instance is owned by that root and disposed once when it closes. `await unload(ref)` releases it
  earlier, after which the next `resolve` runs a factory anew and rejects for a value registration. `unload` also
  forgets a failed build, which otherwise stays for every caller.
- `lazy: false` starts the build at once. `main`, and a `runtime.run` called from outside every controller, wait for
  those builds before the task and fail with the first failure in registration order. A run nested in a task or a
  factory does not wait. An eager factory must therefore settle without the task's help, and one that never settles
  also holds back the failure of another.
- `controller.service(Class, factory)` registers a service a child controller owns, reached through the returned ref
  and forgotten when the child closes. Its eager builds are not part of the warmup.
- Once the root has begun closing, nothing new is registered or built.

### `bun --hot` and `bun --watch`

Under `bun --hot`, every save re-evaluates the whole module graph in the same process, and each evaluation is a new
generation with its own root controller and services:

- Start the entrypoint with `void main(...)`, not `await main(...)`, and likewise a top-level `runtime.run`: Bun defers
  a reload while the entry's top-level `await` is pending, which includes waiting for eager services.
- The new generation becomes current first; the replaced one is then closed in the background. Its pending factories
  see their `runtime.signal` abort, and their results are released instead of published.
- The two generations overlap: the new one starts before the old one's cleanup has released ports, file locks or
  external consumers. A replaced `main` resolves `undefined` instead of exiting, and an `exit(0)` it scheduled is
  dropped.
- A cleanup failure of a replaced generation is traced, aborts the current one with that error and ends the process
  with `1`. A signal waits for the replaced generations' cleanup still in flight; a second signal ends the process at
  once.
- Only `globalThis` survives a reload. Do not hold a reference to `globalThis.ReloadController` across reloads; each
  generation replaces it, so read it again. Restart a process that was running before a TypeSec update instead of
  letting it reload into the new code.

`bun --watch` restarts the process instead. It runs the `SIGTERM` listeners synchronously and replaces the process
image at once, so the lifecycle's cleanup, which runs asynchronously, does not run on a restart. Only what the
operating system releases with the old image is released; external state, such as a lock file, has to be handled by
the next start.

Breaking changes and their migrations are listed in [`.agents/CHANGELOG.md`](.agents/CHANGELOG.md).

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

`typesec api` reports the public API of the project — every function, type, class and namespace member, with the
specifier to import it from and the line that declares it. It is meant for agents and for anyone who would
rather ask than grep.

```sh
bun packages/bootstrap/bin/typesec api packages            # the package map and documentation coverage
bun packages/bootstrap/bin/typesec api search unique       # keyword search over names and descriptions
bun packages/bootstrap/bin/typesec api show array.uniq     # one symbol in full
```

```
$ bun packages/bootstrap/bin/typesec api search unique
@typesec/the/array  array.uniq<T>(values: T[]): T[] (+1 overloads)
                    Keeps the unique values, comparing the values themselves or the result of `map`.
```

Nothing in the index is TypeSec-specific: it reads any repository shaped the same way, meaning a
`packages/tsconfig.json` that lists the packages as project references, each with an `exports` map
and `.mts` or `.tsx` sources under `src/`. Without `--root` the command indexes the project around
the working directory, and falls back to the checkout the binary belongs to when there is none. A
consuming project is usually shaped like TypeSec, so there the plain command reports the project's
own packages and TypeSec's API takes `--root`:

```sh
bun vendor/typesec/packages/bootstrap/bin/typesec api packages                         # your own project
bun vendor/typesec/packages/bootstrap/bin/typesec api --root vendor/typesec packages   # TypeSec
```

`typesec bootstrap sync` gives the project a `typesec:api` script for the second form, so looking up
what TypeSec provides is `bun run typesec:api search unique`. The script calls the short `typesec`
binary, which resolves only where `@typesec/bootstrap` is a dependency of the project: listing the
submodule in `workspaces` is not enough, because Bun links a binary only for a package something
depends on. Sync adds that dependency too. The former `typesec-api` binary remains as an alias of
`typesec api`.

The examples below shorten the invocation to `typesec api`.

Every keyword has to match, and filters narrow further:

```sh
typesec api search parse --package the --kind function
typesec api search --category state
typesec api search --undocumented
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

`typesec api search --undocumented` lists whatever is still missing one.

## Agent rules

[`.agents/rules.md`](.agents/rules.md) is the instruction file for coding agents: how to search the API
before writing a helper, how entrypoints and imports work, what a package's public surface requires,
and which commands verify a change. It is plain Markdown with no tool-specific syntax, so any agent
can read it.

TypeSec is consumed as a git submodule, so the file is already in the consuming repository — the
submodule commit pins its version along with the code it describes. **Reference it; do not copy it.**
A copy would drift from the very commit the submodule pins.

Add one line to the instruction file your agent reads. Paths are relative to the file that holds
them:

```md
<!-- AGENTS.md — read by most agents -->

Follow the TypeSec rules in [vendor/typesec/.agents/rules.md](vendor/typesec/.agents/rules.md).
```

```md
<!-- CLAUDE.md — @ imports the file into every session -->

@AGENTS.md
@vendor/typesec/.agents/rules.md
```

The rules tell an agent to look TypeSec's API up before writing a helper. In a consuming project
that is the `typesec:api` script, which points `--root` at the submodule:

```sh
bun run typesec:api search <keywords>
```

## Conventions

- Sources are `.mts` and import each other through `.mjs` specifiers.
- Packages are named `@typesec/<name>`; helpers are imported through their subpath — `@typesec/the/fn`, not the
  package root.
- Tests live in `test/<ModuleName>/<TestCaseName>.unit.test.mts` or
  `test/<ModuleName>/<TestCaseName>.integration.test.mts`, relative to the source module's directory.
  Preserve the source filename's case in `ModuleName`; use PascalCase behavior names and `.tsx` for JSX.
  Existing suites may migrate as `Behavior`. Tests remain within the package's type-checking scope.
  See the canonical [testing rules](.agents/rules.md#tests) for classification, execution and isolation.
  Tests run on Bun's test runner. Type-level assertions use the helpers in `@typesec/the/test`:

    ```ts
    import {isXEqualToY} from "@typesec/the/test";

    expect(isXEqualToY<Actual, Expected>(true)).toBeTrue();
    ```

- The package list of the build lives in `packages/tsconfig.json`, which is also what the API index reads.

```sh
bun run check       # typecheck every package with bun check
bun run check:tsc:watch   # incremental tsc -b while editing
bun test            # unit tests; watch and coverage use the same exclusions
bun test --path-ignore-patterns 'vendor/**' .integration.test. # integration only
bun test --path-ignore-patterns 'vendor/**'                   # full suite
bun run lint        # oxlint
bun run fmt:check   # bun fmt
```

The CLI ignore option replaces the configured list; always retain `vendor/**` in overrides.
Test files run sequentially. Enable concurrency only with `test.concurrent()` for independent cases.

## Status

In active development, pre-1.0. Package APIs may still change between versions.
