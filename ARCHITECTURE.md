# TypeSec – Project Context

## 📌 Core Idea

TypeSec is a **TypeScript-first framework** with a declarative DSL for describing **data graphs and protocols**.
The framework is closure-style: each entrypoint defines a protocol (HTTP, CLI, queue, etc.), accepts input, and returns output.

## 🏗️ Architecture

- **Single entrypoint**: default export in a file = strongly typed entrypoint.
- **File system–based routing**: directory structure defines the tree of routes and commands.
- **Runtime**:
    - Global singleton runtime.
    - Supports isolated instances (automatically cascade-shutdown when the global controller stops).
- **Protocols**: supports HTTP, CLI.

## 📊 Types & DSL

- **Primitive types**: `string`, `boolean`, `number`, `object`.
- **Containers**:
    - `nullable(Type)` → `Type | null`
    - `array(Type)` → `Type[]`
- **Constraints** (a.k.a. rules/spec):
    - For `string`: `minLength`, `maxLength`, `pattern`
    - For `number`: `min`, `max`
- **Validation** is split into two stages:
    - Type validation (primitive/structure check).
    - Constraint validation (rules for values).

## 📦 Projects Using TypeSec

1. **Crypto-acquiring system** (already in development).
2. **Prediction service** (tarot/astrology; generates results based on birth date & place).
3. **ERP for restaurant** (kitchen + finance management for plov business).

## 📚 Conventions

- Packages follow the naming: `@typesec/package-name`.
- Code is organized around a first-class type graph.
- Nullable can be seen as a union type, but in the DSL it’s modeled as a container for readability.

---
