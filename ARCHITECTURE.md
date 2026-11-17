# TypeSec – Project Context

## 📌 Core Idea

TypeSec is a **TypeScript-first framework** with a declarative DSL for describing **data protocols and typed entities**.
Each entrypoint is a function (closure-style): define a protocol (HTTP, CLI, etc.), accept input, return output.

## 🏗️ Architecture

- **Single entrypoint**: default export in a file = strongly-typed entrypoint.
- **File system–based routing**: directory structure defines the tree of routes and commands.
- **Runtime** (`@typesec/core`):
    - One root controller per generation, `lifecycle`; the ambient `runtime` resolves the current controller per async
      context through `AsyncLocalStorage`.
    - Child controllers (`clone`) cascade abort from their parent and own their resources; a parent's `close()` waits
      for its tracked work and its children, then releases its own resources newest first.
    - Services are built as work of the root that registered them, and the root owns and disposes their instances.
    - Hot reload: a process-wide store on `globalThis` holds only data (the current root, the reload count, the async
      context). A new generation publishes its root first and closes the replaced one in the background; that cleanup
      is awaited on shutdown, and its failure ends the current generation.
    - Contracts, limits and the `--hot`/`--watch` difference: README, "Runtime and services".
- **Protocols**: HTTP and CLI today; transport is kept abstract to work in any environment (server or client).

- **Numbers policy** (`packages/the/src/numbers.mts`):
    - `numbers.is(value)`: JS number (excludes `NaN`, allows `±Infinity`). Low-level utility.
    - `numbers.isFinite(value)`: excludes `NaN` and `±Infinity`.

## 🚚 Transport & Execution

- **HTTP/2 + Streams**: primary transport for request/response and streaming results. Works well with standard HTTP infra.
- **SSE (Server-Sent Events)**: preferred for server→client subscriptions and push updates (auto-reconnect, Last-Event-ID).
- **Fetch with upload streams**: where supported, `fetch({... , body: ReadableStream, duplex: 'half'})` is used for client→server
  streaming uploads. For full duplex, use two channels: one uplink (fetch), one downlink (SSE or response stream).

## 📦 Packages (overview)

- `@typesec/the`: foundational utilities (types, arrays, numbers, strings, date, asserts).
- `@typesec/core`: runtime, lifecycle, controller, heartbeat/dispose.
- `@typesec/serve`: HTTP runtime based on Bun with FS routing.
- `@typesec/cli`: CLI runtime with FS routing and argv parser.
- `@typesec/unit`: protocol abstraction base classes (shared by serve/cli).
- `@typesec/tracer`: structured logging/tracing.
- `@typesec/graph` (deprecated): legacy graph DSL.

## 📦 Projects Using TypeSec

1. **Crypto-acquiring system** (already in development).
2. **Prediction service** (tarot/astrology; generates results based on birth date & place).
3. **ERP for restaurant** (kitchen + finance management for plov business).

## 📚 Conventions

- Packages follow the naming: `@typesec/package-name`.

### Testing

- Put tests in `test/<Module>/<TestCaseName>.unit.test.mts` or `.integration.test.mts`, relative to the source
  directory. `<Module>` is the source filename without its extension; preserve its casing. `.agents/rules.md` is the
  full rule set.
- Runner: Bun Test. Import assertions from `bun:test`.
    - Example: `import {describe, expect, test|it} from "bun:test"`.
- Imports inside tests:
    - Import the module under test through a `.mjs` specifier relative to the test file: `../../foo.mjs` from
      `test/foo/Regression.unit.test.mts`.
    - Type-level helpers live in `@typesec/the/test` (or a relative `.mjs` import within `@typesec/the`). Use them for meaningful compile-time checks.
- Type-level assertions pattern:
    - `isXEqualToY<X, Y>(true)` for `Equal<X, Y>`.
    - `isXExtendsOfY<X, Y>(true)` for `Extends<X, Y>`.
- Example test:

    ```ts
    import {describe, expect, test} from "bun:test";
    import {fn} from "../../fn.mjs";

    describe("fn", () => {
        test("invoke", () => {
            expect(fn.invoke("a")).toBe("a");
        });
    });
    ```

- Execution:
    - Unit tests: `bun test`; integration tests: `bun test --path-ignore-patterns 'vendor/**' .integration.test.`
    - Watch: `bun --watch test`
- Scope and style:
    - Prefer fast, isolated unit tests without external I/O.
    - Keep files small and focused.
    - Separate arrange, act and assert with blank lines, but keep consecutive single-line statements of one phase together. After an expanded multiline statement, leave a blank line before the next statement, even within the same logical phase.
    - Test observable behavior instead of export inventories, alias declaration mirrors, or empty placeholders.
    - For runtime guards, exercise both positive and negative paths.
    - Keep compile-time tests for generic inference, narrowing, overload selection, and negative constraints.

---
