# TypeSec – Project Context

## 📌 Core Idea

TypeSec is a **TypeScript-first framework** with a declarative DSL for describing **data protocols and typed entities**.
Each entrypoint is a function (closure-style): define a protocol (HTTP, CLI, etc.), accept input, return output.

Graph note: the old `graph` package is now deprecated. The new universal layer is GUP (Graph Uni Protocol).

## 🏗️ Architecture

- **Single entrypoint**: default export in a file = strongly-typed entrypoint.
- **File system–based routing**: directory structure defines the tree of routes and commands.
- **Runtime**:
  - Global singleton runtime.
  - Supports isolated instances (cascade-shutdown via the global controller).
- **Protocols**: HTTP and CLI today; transport is kept abstract to work in any environment (server or client).

## 🧩 GUP (Graph Uni Protocol)

GUP defines a universal, environment-agnostic protocol to describe data types and entities, with full TypeScript typing and
first-class constraint injection. It can be used locally (in-process) or serialized as metadata for transport.

- **Core proto types** (`packages/gup/src/proto.mts`):
  - Kinds: `primitive`, `codec`, `complex`, containers `array`, `nullable`.
  - Base shape: `{ id, kind, is }` where `is` is a type guard.
  - Codecs: add `{ encode, decode }` for wire formats (e.g., `Date` ↔ `string`).
  - Factories: `proto.primitive(...)` and `proto.codec(...)` return a value that is also a function. Calling the factory with
    constraints returns a new instance with validation attached.
    - Example: `const email = proto.primitive({ id: "Email", is: (v) => typeof v === 'string' })(constraints<string>(...))`.

- **Constraints** (`packages/gup/src/constraints.mts`):
  - Rules: `validate(value, meta) => boolean | string`, optional `message`.
  - Attach via factories: `proto.primitive(...)(constraints<T>(...))` and `proto.codec(...)(constraints<T>(...))`.
  - `meta` includes `{ id, kind }` for better messages and tooling.

- **Scalars** (`packages/gup/src/scalars.mts`):
  - `string`, `boolean` (simple primitives).
  - `float`: finite numbers only (excludes `NaN`, `±Infinity`).
  - `int`: safe integers only (`Number.isSafeInteger`).
  - `ISODate`: codec for `Date` with `toISOString()`/`new Date(value)`.
  - `bigint`: codec using string encoding for transport.

- **Numbers policy** (`packages/the/src/numbers.mts`):
  - `numbers.is(value)`: JS number (excludes `NaN`, allows `±Infinity`). Low-level utility.
  - `numbers.isFinite(value)`: excludes `NaN` and `±Infinity`. Used by `gup` `float`.

## 🚚 Transport & Execution

- **HTTP/2 + Streams**: primary transport for request/response and streaming results. Works well with standard HTTP infra.
- **SSE (Server-Sent Events)**: preferred for server→client subscriptions and push updates (auto-reconnect, Last-Event-ID).
- **Fetch with upload streams**: where supported, `fetch({... , body: ReadableStream, duplex: 'half'})` is used for client→server
  streaming uploads. For full duplex, use two channels: one uplink (fetch), one downlink (SSE or response stream).
- **Metadata-first**: GUP schemas can be materialized locally or serialized to metadata for transport; the client uses the same
  codecs/types to deserialize.

## 📦 Packages (overview)

- `@typesec/the`: foundational utilities (types, arrays, numbers, strings, date, asserts).
- `@typesec/core`: runtime, lifecycle, controller, heartbeat/dispose.
- `@typesec/gup`: GUP core — proto types, constraints, common scalars/codecs.
- `@typesec/serve`: HTTP runtime based on Bun with FS routing.
- `@typesec/cli`: CLI runtime with FS routing and argv parser.
- `@typesec/unit`: protocol abstraction base classes (shared by serve/cli).
- `@typesec/tracer`: structured logging/tracing.
- `@typesec/graph` (deprecated): legacy graph DSL (superseded by GUP direction).

## 📊 Types & DSL (recap)

- **Primitive types**: `string`, `boolean`, `number`, `object` (via GUP scalars and codecs).
- **Containers**:
  - `nullable(Type)` → `Type | null`
  - `array(Type)` → `Type[]`
- **Constraints** (rules/spec): attach via proto factories and validate after type-checking.
- **Validation stages**:
  1) Type validation via `is` (shape/primitive).
  2) Constraint validation via attached rules.

## 📦 Projects Using TypeSec

1. **Crypto-acquiring system** (already in development).
2. **Prediction service** (tarot/astrology; generates results based on birth date & place).
3. **ERP for restaurant** (kitchen + finance management for plov business).

## 📚 Conventions

- Packages follow the naming: `@typesec/package-name`.
- Code is organized around a universal, typed protocol (GUP) with transport-agnostic metadata.
- Nullable is modeled as a container in the DSL for readability, even though it’s a union type at the type level.

### Testing

- Location: co-locate tests next to sources, in the same `src` folder of each package.
- Filename: `<module>.test.mts` (ESM + TypeScript module syntax).
- Runner: Bun Test. Import assertions from `bun:test`.
  - Example: `import {describe, expect, test|it} from "bun:test"`.
- Imports inside tests:
  - Import the module under test via its `.mjs` path sibling: `import {foo} from "./foo.mjs"` (works with `moduleResolution: bundler` and `allowImportingTsExtensions`).
  - Type-level helpers live in `@typesec/the/test` (or locally `./test.mjs` within `@typesec/the`). Use them for compile-time checks.
- Type-level assertions pattern:
  - `isXEqualToY<X, Y>(true)` for `Equal<X, Y>`.
  - `isXExtendsOfY<X, Y>(true)` for `Extends<X, Y>`.
  - Example:
    ```ts
    import {describe, expect, test} from "bun:test";
    import {isXEqualToY} from "@typesec/the/test";
    import {fn} from "./fn.mjs";

    describe("fn", () => {
      test("invoke", () => {
        expect(fn.invoke("a")).toBe("a");
      });

      test("types", () => {
        type A = 1 | 2;
        type B = 1 | 2;
        expect(isXEqualToY<A, B>(true)).toBeTrue();
      });
    });
    ```
- Execution:
  - All: `bun test`
  - Watch: `bun test --watch`
- Scope and style:
  - Prefer fast, isolated unit tests without external I/O.
  - Keep files small and focused; one test file per module.
  - For runtime guards, exercise both positive and negative paths; for types, prefer helper-based compile-time checks over runtime hacks.

---
