# SAM

State Action Model (SAM) builds typed pipelines that combine validation, actions, transforms, refinements, and state transition selection.

```text
unknown input
    -> validation
    -> action or transform
    -> transition validation
    -> state-specific handler
    -> output
```

Each stage is a plain function. A pipeline stays synchronous until a stage returns a thenable. Every later stage receives the awaited value.

## Pipeline

Use `pipeline(step)` when the first stage accepts typed input. Use `pipeline<T>()` to start with an identity pipeline for an existing type. A pipeline started with `schema(...)` also exposes `parse(unknown)`.

```ts
const parseLength = pipeline(schema(z.string())).pipe((value) => value.length);

parseLength.run("hello"); // 5
parseLength.parse(valueFromRequest); // accepts unknown, validates with z.string()

const normalizeName = pipeline<string>()
    .pipe((value) => value.trim())
    .pipe((value) => value.toLowerCase());
```

`run(value)` accepts the pipeline's `TInput`. On a schema-rooted pipeline, `parse(value)` accepts `unknown`, validates it with the root schema, and runs the remaining steps. Pipelines without a root schema do not expose `parse`.

An action and a transform use the same `.pipe(fn)` primitive. Each step returns the value for the next step.

```ts
const loadUser = pipeline(schema(z.string()))
    .pipe((userId) => users.get(userId))
    .pipe(async (user) => {
        await audit.read(user.id);
        return user;
    })
    .pipe((user) => ({...user, displayName: user.name.trim()}));
```

## Refinement

`refine` asserts a narrower type without changing the value. It accepts a shallow object pattern, a type predicate, or `Transitions`.

```ts
type Operation = {
    kind: "avg" | "min" | "max";
    source: "user" | "schedule";
    values: number[];
};

const scheduledAverage = pipeline<Operation>().pipe(refine({kind: "avg", source: "schedule"}));

// Output:
// Operation & {kind: "avg"; source: "schedule"}
```

A pattern compares every listed property with `Object.is`. Properties omitted from the pattern do not participate in matching. An empty pattern is invalid.

Custom predicates support refinements that an object pattern cannot express:

```ts
type NonEmptyOperation = Operation & {values: [number, ...number[]]};

const nonEmpty = pipeline<Operation>().pipe(
    refine((operation): operation is NonEmptyOperation => operation.values.length > 0),
);
```

A failed pattern or predicate throws `RefinementError`.

## Transitions

`Transitions` describes named states and the allowed edges between them. It reads state and validates transitions. It does not mutate state or run an action.

Define correlated fields as a union. TypeScript can then reject impossible `status` and `substatus` combinations.

```ts
const PaymentStateSchema = z.discriminatedUnion("status", [
    z.object({
        id: z.string(),
        status: z.literal("created"),
        substatus: z.null(),
    }),
    z.object({
        id: z.string(),
        status: z.literal("processing"),
        substatus: z.union([z.null(), z.literal("manual_review")]),
    }),
    z.object({
        id: z.string(),
        status: z.literal("completed"),
        substatus: z.null(),
    }),
    z.object({
        id: z.string(),
        status: z.literal("cancelled"),
        substatus: z.null(),
    }),
]);

const paymentTransitions = transitions(PaymentStateSchema, {
    created: {
        name: "Created",
        description: "The payment has been accepted but processing has not started.",
        when: {status: "created", substatus: null},
        to: ["processing", "cancelled"],
    },
    processing: {
        name: "Processing",
        description: "The provider is processing the payment.",
        when: {status: "processing", substatus: null},
        to: ["manualReview", "completed", "cancelled"],
    },
    manualReview: {
        name: "Manual review",
        description: "The payment requires an operator decision.",
        when: {
            status: "processing",
            substatus: "manual_review",
        },
        to: ["processing", "completed", "cancelled"],
    },
    completed: {
        name: "Completed",
        when: {status: "completed", substatus: null},
        to: [],
    },
    cancelled: {
        name: "Cancelled",
        when: {status: "cancelled", substatus: null},
        to: [],
    },
});
```

The `transitions(ZodDiscriminatedUnion, definition)` form infers the state type from the schema output and every state key from the definition. The `to` arrays only accept keys from the same definition. The graph matches schema output values and does not parse them again; use `schema(...)` at the pipeline boundary when runtime validation is required.

Each state has a required human-readable `name` and an optional `description`. The definition key remains the stable identifier returned by `resolve` and referenced by `to`. Transition errors use `name` in their messages. Metadata remains available through `paymentTransitions.states`; `description` is not appended to error messages.

### State resolution

The map requires exactly one matching state pattern:

```ts
paymentTransitions.resolve(payment); // "created" | "processing" | ...
```

- No match throws `TransitionError` with code `STATE_NOT_FOUND`.
- More than one match throws `TransitionError` with code `STATE_AMBIGUOUS`.
- Declaration order does not affect resolution.

Patterns should not overlap. The map does not apply an implicit "most specific pattern wins" rule because adding a new pattern could then change existing routing.

### Transition validation

`can` and `assert` compare two complete state values:

```ts
if (paymentTransitions.can(current, proposed)) {
    paymentTransitions.assert(current, proposed);
}
```

`can` returns `false` when both values resolve to known states without an edge between them. Unknown and ambiguous states remain resolution errors. `assert` throws `TRANSITION_NOT_ALLOWED` for a missing edge. A self-transition requires its own state key in `to`.

`refine(paymentTransitions)` turns the same validation into a pipeline stage. It accepts a `{from, to}` pair and narrows the result to the union of allowed changes.

```ts
type StateChange<S> = {
    readonly from: S;
    readonly to: S;
};

const ChangePaymentSchema = z.object({
    paymentId: z.string(),
    to: PaymentStateSchema,
});

const changePayment = pipeline(schema(ChangePaymentSchema))
    // action: load the current state
    .pipe(async (command) => ({
        command,
        from: await payments.get(command.paymentId),
    }))
    // transform: build the proposed change
    .pipe(({command, from}) => ({from, to: command.to}))
    // transition validation and type refinement
    .pipe(refine(paymentTransitions))
    // action: audit the change and pass it to the next step
    .pipe(async (change) => {
        await audit.transition(change.from, change.to);
        return change;
    })
    .pipe(async ({to}) => {
        await payments.save(to);
        return to;
    });
```

Use the state-key overload to narrow one value to a named state:

```ts
const manualReview = pipeline(schema(PaymentStateSchema))
    .pipe(refine(paymentTransitions, "manualReview"))
    .pipe((payment) => {
        // payment.status is "processing"
        // payment.substatus is "manual_review"
        return payment;
    });
```

## Transition selection

`match` resolves the current state and runs one handler. Handlers cover every state in the map, and each handler receives its narrowed state type.

```ts
const handlePayment = pipeline(schema(PaymentStateSchema)).pipe(
    match(paymentTransitions, {
        created: (payment) => startPayment(payment),
        processing: (payment) => pollProvider(payment),
        manualReview: (payment) => {
            // payment.status is "processing"
            // payment.substatus is "manual_review"
            return assignReviewer(payment);
        },
        completed: (payment) => payment,
        cancelled: (payment) => payment,
    }),
);
```

`match` resolves state before it invokes a handler. It does not run handlers as probes, catch a handler error, or fall through to another branch. Handler return types form the output union.

Literal return values are inferred as-is; handler functions do not need `as const`.

## Async behavior

The pipeline preserves synchronous results until the first thenable:

```ts
const sync = pipeline((value: string) => value.length).pipe((length) => length > 0);
// Pipeline<string, boolean>

const asyncThenSync = pipeline(async (value: string) => value.length).pipe((length) => length > 0);
// Pipeline<string, Promise<boolean>>
```

After an async stage, `.pipe` passes `Awaited<TResult>` to the next step. Promise chaining flattens later async results.

`match` starts one handler. Unselected async handlers do not run. A mix of sync and async handlers produces a union such as `T | Promise<T>`.

## Custom error handling

`issue` replaces an error from one step without changing its input or output type:

```ts
type IssueResult<TOutput> = TOutput extends PromiseLike<infer TValue> ? Promise<Awaited<TValue>> : TOutput;

function issue<TInput, TOutput>(
    step: Step<TInput, TOutput>,
    error: string | ((reason: unknown, payload: TInput) => Error),
): Step<TInput, IssueResult<TOutput>>;
```

```ts
const loadPayment = pipeline(schema(PaymentIdSchema)).pipe(
    issue(
        (id) => repository.get(id),
        (reason, id) =>
            new PaymentLoadError(`Cannot load payment ${id}`, {
                cause: reason,
            }),
    ),
);
```

`issue` catches a synchronous throw or rejected thenable from the wrapped step. The factory receives the original reason and the value passed to that step. When `issue` wraps `schema(...)`, the payload type is `unknown` because `parse` may receive any value before validation. The string form throws `new Error(message, {cause: reason})`. Async results keep their resolved value type; custom thenables are normalized to a native `Promise`. Errors from later pipeline steps remain unchanged.

## Errors

The public errors have stable classes. `TransitionError` also carries a stable `code`.

```ts
class RefinementError extends Error {}

type TransitionErrorCode = "INVALID_DEFINITION" | "STATE_NOT_FOUND" | "STATE_AMBIGUOUS" | "TRANSITION_NOT_ALLOWED";

class TransitionError extends Error {
    readonly code: TransitionErrorCode;
}
```

Errors refer to states by their human-readable names:

```text
Transition from "Processing" to "Created" is not allowed
State matches multiple transitions: "Processing", "Manual review"
```

SAM does not wrap errors from schemas, predicates, actions, transforms, or selected handlers unless the caller wraps that step with `issue`. A failed `refine` creates `RefinementError`; state resolution and transition validation create `TransitionError`.

## Public v1 surface

```ts
export {issue, match, pipeline, refine, schema, transitions};

export type {Pipeline, StateChange, Step, Transitions};

export {RefinementError, TransitionError};
```

`Transitions` names the runtime object because it owns the state graph. A transition is one edge in that graph; v1 does not need a public `Transition` class.

## Non-goals

SAM does not provide persistence, retries, transactions, compensation, or an event store. Application actions own those concerns. `Transitions` validates state and routes values without changing them.

Dedicated wrappers for actions and transforms would add names without behavior. Plain pipeline steps cover the v1 semantics. Metadata, tracing, or retry policies may justify wrappers later.
