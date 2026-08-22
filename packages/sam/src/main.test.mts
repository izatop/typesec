import {isXEqualToY, isXExtendsOfY} from "@typesec/the";
import {describe, expect, it} from "bun:test";
import z from "zod";
import {RefinementError, TransitionError} from "./errors.mts";
import * as sam from "./index.mts";
import type {StateChange} from "./interfaces.mts";
import {issue, match, pipeline, refine, schema, transitions} from "./main.mts";

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

type PaymentState = z.output<typeof PaymentStateSchema>;
type CreatedState = PaymentState & {status: "created"; substatus: null};
type ProcessingState = PaymentState & {status: "processing"; substatus: null};
type ManualReviewState = PaymentState & {status: "processing"; substatus: "manual_review"};
type CompletedState = PaymentState & {status: "completed"; substatus: null};

const paymentTransitions = transitions(PaymentStateSchema, {
    created: {
        name: "Created",
        description: "The payment has not started processing.",
        when: {status: "created", substatus: null},
        to: ["processing", "cancelled"],
    },
    processing: {
        name: "Processing",
        when: {status: "processing", substatus: null},
        to: ["manualReview", "completed", "cancelled"],
    },
    manualReview: {
        name: "Manual review",
        description: "The payment requires an operator decision.",
        when: {status: "processing", substatus: "manual_review"},
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

function caught(action: () => unknown): unknown {
    try {
        action();
    } catch (error) {
        return error;
    }

    return new Error("Expected action to throw");
}

describe("pipeline", () => {
    it("starts with an identity step", () => {
        const identity = pipeline<string>();

        expect(isXEqualToY<ReturnType<typeof identity.run>, string>(true)).toBe(true);
        expect(identity.run("value")).toBe("value");

        if (false) {
            // @ts-expect-error parse is only available when a pipeline starts with schema(...)
            identity.parse(1);
        }
    });

    it("exposes parse only on schema-rooted pipelines at runtime", () => {
        const identity = pipeline<string>();
        const regular = pipeline((value: string) => value.trim());
        const parsed = pipeline(schema(z.string()));
        const parsedThenTransformed = parsed.pipe((value) => value.length);

        expect("parse" in identity).toBe(false);
        expect("parse" in regular).toBe(false);
        expect("parse" in parsed).toBe(true);
        expect("parse" in parsedThenTransformed).toBe(true);
    });

    it("keeps a synchronous chain synchronous", () => {
        const length = pipeline(schema(z.string()))
            .pipe((value) => value.length)
            .pipe((value) => value > 0);

        expect(isXEqualToY<ReturnType<typeof length.run>, boolean>(true)).toBe(true);
        expect(length.run("value")).toBe(true);
    });

    it("awaits an asynchronous stage before calling the next step", async () => {
        const positiveLength = pipeline(async (value: string) => value.length).pipe((length) => length > 0);

        expect(isXEqualToY<ReturnType<typeof positiveLength.run>, Promise<boolean>>(true)).toBe(true);
        await expect(positiveLength.run("value")).resolves.toBe(true);
    });

    it("accepts typed input through run and unknown input through parse", () => {
        const name = pipeline(schema(z.object({name: z.string()}))).pipe((value) => value.name);

        expect(name.run({name: "Ada"})).toBe("Ada");
        expect(name.parse({name: "Grace"})).toBe("Grace");
        expect(() => name.parse({name: 42})).toThrow();
    });
});

describe("refine", () => {
    type Operation = {
        kind: "avg" | "min" | "max";
        source: "user" | "schedule";
        values: number[];
    };

    it("narrows a value with a shallow multi-key pattern", () => {
        const operation: Operation = {kind: "avg", source: "schedule", values: [2, 4]};
        const scheduledAverage = pipeline<Operation>().pipe(refine({kind: "avg", source: "schedule"}));
        const result = scheduledAverage.run(operation);

        expect(
            isXEqualToY<ReturnType<typeof scheduledAverage.run>, Operation & {kind: "avg"; source: "schedule"}>(true),
        ).toBe(true);
        expect(result).toBe(operation as typeof result);
    });

    it("uses Object.is for pattern values", () => {
        const value = {amount: Number.NaN};

        expect(
            pipeline<typeof value>()
                .pipe(refine({amount: Number.NaN}))
                .run(value),
        ).toBe(value);
    });

    it("throws RefinementError when a pattern does not match", () => {
        const scheduled = pipeline<Operation>().pipe(refine({source: "schedule"}));

        expect(() => scheduled.run({kind: "avg", source: "user", values: []})).toThrow(RefinementError);
    });

    it("narrows with a type predicate", () => {
        type NonEmptyOperation = Operation & {values: [number, ...number[]]};
        const nonEmpty = pipeline<Operation>().pipe(
            refine((operation): operation is NonEmptyOperation => operation.values.length > 0),
        );

        expect(isXEqualToY<ReturnType<typeof nonEmpty.run>, NonEmptyOperation>(true)).toBe(true);
        expect(nonEmpty.run({kind: "min", source: "user", values: [1]}).values[0]).toBe(1);
        expect(() => nonEmpty.run({kind: "min", source: "user", values: []})).toThrow(RefinementError);
    });

    it("rejects an empty pattern", () => {
        expect(() => refine({})).toThrow(RefinementError);
    });
});

describe("issue", () => {
    it("wraps a synchronous error with a message and cause", () => {
        const reason = new Error("database offline");
        const load = issue(() => {
            throw reason;
        }, "Cannot load payment");

        try {
            load("payment-1");
            throw new Error("Expected issue to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe("Cannot load payment");
            expect((error as Error).cause).toBe(reason);
        }
    });

    it("maps an asynchronous rejection with its step payload", async () => {
        const reason = new Error("timeout");
        const payload = {paymentId: "payment-1"};
        const load = issue(
            async (_input: typeof payload) => {
                throw reason;
            },
            (caught, input) => new Error(`Cannot load ${input.paymentId}`, {cause: caught}),
        );

        await expect(load(payload)).rejects.toEqual(new Error("Cannot load payment-1", {cause: reason}));
    });

    it("returns a successful result unchanged", async () => {
        const sync = issue((value: string) => value.length, "unused");
        const asyncStep = issue(async (value: string) => value.length, "unused");

        expect(sync("value")).toBe(5);
        await expect(asyncStep("value")).resolves.toBe(5);
    });

    it("normalizes custom thenables to a native Promise type", async () => {
        class CustomPromise<T> extends Promise<T> {
            public readonly custom = true;
        }

        const wrapped = issue(() => new CustomPromise<number>((resolve) => resolve(5)), "unused");
        const result = wrapped(undefined);

        expect(isXEqualToY<typeof result, Promise<number>>(true)).toBe(true);
        expect(result).toBeInstanceOf(Promise);
        expect(result).not.toBeInstanceOf(CustomPromise);
        await expect(result).resolves.toBe(5);
    });

    it("preserves schema and pattern step capabilities", () => {
        const parser = issue(schema(z.string()), (reason, payload) => {
            expect(isXEqualToY<typeof payload, unknown>(true)).toBe(true);
            return new Error(`Invalid string: ${String(payload)}`, {cause: reason});
        });
        const parsed = pipeline(parser).pipe((value) => value.length);
        const narrowed = pipeline<{kind: "a" | "b"}>().pipe(issue(refine({kind: "a"}), "Expected A"));

        expect("parse" in parsed).toBe(true);
        expect(parsed.parse("value")).toBe(5);
        expect(() => parsed.parse(1)).toThrow("Invalid string: 1");
        expect(isXEqualToY<ReturnType<typeof narrowed.run>, {kind: "a" | "b"} & {kind: "a"}>(true)).toBe(true);
        expect(narrowed.run({kind: "a"})).toEqual({kind: "a"});
    });

    it("does not catch errors from later pipeline steps", () => {
        const later = new Error("later");
        const operation = pipeline(issue((value: string) => value, "wrapped")).pipe(() => {
            throw later;
        });

        expect(() => operation.run("value")).toThrow(later);
    });
});

describe("transitions", () => {
    const created: CreatedState = {id: "payment-1", status: "created", substatus: null};
    const processing: ProcessingState = {id: "payment-1", status: "processing", substatus: null};
    const manualReview: ManualReviewState = {
        id: "payment-1",
        status: "processing",
        substatus: "manual_review",
    };
    const completed: CompletedState = {id: "payment-1", status: "completed", substatus: null};

    it("resolves correlated states and exposes their metadata", () => {
        expect(paymentTransitions.resolve(created)).toBe("created");
        expect(paymentTransitions.resolve(manualReview)).toBe("manualReview");
        expect(paymentTransitions.states.manualReview).toEqual({
            name: "Manual review",
            description: "The payment requires an operator decision.",
            when: {status: "processing", substatus: "manual_review"},
            to: ["processing", "completed", "cancelled"],
        });
    });

    it("uses the schema for inference without parsing an output state again", () => {
        let parseCount = 0;
        const InputStateSchema = z.object({raw: z.literal("open")}).transform(({raw}) => {
            parseCount += 1;
            return {status: raw};
        });
        const flow = transitions(InputStateSchema, {
            open: {name: "Open", when: {status: "open"}, to: []},
        });
        const select = pipeline(schema(InputStateSchema)).pipe(
            match(flow, {
                open: (state) => state.status,
            }),
        );

        expect(isXEqualToY<ReturnType<typeof select.run>, "open">(true)).toBe(true);
        expect(select.parse({raw: "open"})).toBe("open");
        expect(parseCount).toBe(1);
    });

    it("throws STATE_NOT_FOUND when no pattern matches a valid schema value", () => {
        const partial = transitions(PaymentStateSchema, {
            created: {name: "Created", when: {status: "created", substatus: null}, to: []},
        });
        const error = caught(() => partial.resolve(completed));

        expect(error).toBeInstanceOf(TransitionError);
        expect((error as TransitionError).code).toBe("STATE_NOT_FOUND");
    });

    it("throws STATE_AMBIGUOUS with readable names when patterns overlap", () => {
        const AmbiguousSchema = z.object({kind: z.literal("same")});
        const ambiguous = transitions(AmbiguousSchema, {
            first: {name: "First state", when: {kind: "same"}, to: []},
            second: {name: "Second state", when: {kind: "same"}, to: []},
        });
        const error = caught(() => ambiguous.resolve({kind: "same"}));

        expect(error).toBeInstanceOf(TransitionError);
        expect((error as TransitionError).code).toBe("STATE_AMBIGUOUS");
        expect((error as Error).message).toContain('"First state", "Second state"');
    });

    it("rejects invalid definitions", () => {
        const unknownTarget = caught(() =>
            transitions(PaymentStateSchema, {
                created: {
                    name: "Created",
                    when: {status: "created", substatus: null},
                    to: ["missing"],
                },
            } as any),
        );
        const emptyPattern = caught(() =>
            transitions(PaymentStateSchema, {
                any: {name: "Any", when: {}, to: []},
            }),
        );

        expect((unknownTarget as TransitionError).code).toBe("INVALID_DEFINITION");
        expect((emptyPattern as TransitionError).code).toBe("INVALID_DEFINITION");
    });

    it("reports malformed JavaScript definitions as INVALID_DEFINITION", () => {
        const malformed = [
            null,
            undefined,
            {broken: {when: {status: "created"}, to: []}},
            {broken: {name: "Broken", to: []}},
            {broken: {name: "Broken", when: {status: "created"}}},
        ];

        for (const definition of malformed) {
            const error = caught(() => transitions(PaymentStateSchema, definition as any));
            expect(error).toBeInstanceOf(TransitionError);
            expect((error as TransitionError).code).toBe("INVALID_DEFINITION");
        }
    });

    it("checks allowed, forbidden, and explicit self-transitions", () => {
        expect(paymentTransitions.can(created, processing)).toBe(true);
        expect(paymentTransitions.can(created, completed)).toBe(false);
        expect(paymentTransitions.can(processing, processing)).toBe(false);

        const self = transitions(z.object({status: z.literal("active")}), {
            active: {name: "Active", when: {status: "active"}, to: ["active"]},
        });
        expect(self.can({status: "active"}, {status: "active"})).toBe(true);
    });

    it("asserts forbidden transitions with readable names", () => {
        const error = caught(() => paymentTransitions.assert(processing, created));

        expect(error).toBeInstanceOf(TransitionError);
        expect((error as TransitionError).code).toBe("TRANSITION_NOT_ALLOWED");
        expect((error as Error).message).toBe('Transition from "Processing" to "Created" is not allowed');
    });

    it("refines an allowed state change", () => {
        const validate = pipeline<StateChange<PaymentState>>().pipe(refine(paymentTransitions));
        const change = {from: created, to: processing};
        const result = validate.run(change);

        type AllowedChange = ReturnType<typeof validate.run>;
        expect(isXExtendsOfY<{from: CreatedState; to: ProcessingState}, AllowedChange>(true)).toBe(true);
        expect(isXExtendsOfY<{from: CreatedState; to: CompletedState}, AllowedChange>(false)).toBe(false);
        expect(result).toBe(change as typeof result);
        expect(() => validate.run({from: created, to: completed})).toThrow(TransitionError);
    });

    it("refines one state by its key", () => {
        const selectManualReview = pipeline<PaymentState>().pipe(refine(paymentTransitions, "manualReview"));

        expect(isXExtendsOfY<ReturnType<typeof selectManualReview.run>, ManualReviewState>(true)).toBe(true);
        expect(isXExtendsOfY<ManualReviewState, ReturnType<typeof selectManualReview.run>>(true)).toBe(true);
        expect(selectManualReview.run(manualReview)).toBe(manualReview);
        expect(() => selectManualReview.run(processing)).toThrow(RefinementError);
    });

    it("propagates resolution errors through transition operations", () => {
        const partial = transitions(PaymentStateSchema, {
            created: {name: "Created", when: {status: "created", substatus: null}, to: []},
        });
        const validateChange = refine(partial);
        const selectCreated = refine(partial, "created");
        const actions = [
            () => partial.can(created, completed),
            () => partial.assert(created, completed),
            () => validateChange({from: created, to: completed}),
            () => selectCreated(completed),
        ];

        for (const action of actions) {
            const error = caught(action);
            expect(error).toBeInstanceOf(TransitionError);
            expect((error as TransitionError).code).toBe("STATE_NOT_FOUND");
        }
    });
});

describe("match", () => {
    it("runs exactly one handler selected by state", () => {
        const selected: string[] = [];
        const select = match(paymentTransitions, {
            created: () => {
                selected.push("created");
                return 1;
            },
            processing: () => {
                selected.push("processing");
                return 2;
            },
            manualReview: () => {
                selected.push("manualReview");
                return 3;
            },
            completed: () => {
                selected.push("completed");
                return 4;
            },
            cancelled: () => {
                selected.push("cancelled");
                return 5;
            },
        });
        const result = select({id: "payment-1", status: "processing", substatus: "manual_review"});

        expect(isXEqualToY<ReturnType<typeof select>, 1 | 2 | 3 | 4 | 5>(true)).toBe(true);
        expect(result).toBe(3);
        expect(selected).toEqual(["manualReview"]);
    });

    it("passes a narrowed state to each handler", () => {
        const select = match(paymentTransitions, {
            created: (state) => state.status,
            processing: (state) => state.substatus,
            manualReview: (state) => {
                expect(isXExtendsOfY<typeof state, ManualReviewState>(true)).toBe(true);
                return state.substatus;
            },
            completed: (state) => state.status,
            cancelled: (state) => state.status,
        });

        expect(select({id: "payment-1", status: "processing", substatus: "manual_review"})).toBe("manual_review");
    });

    it("returns asynchronous handler results and propagates handler errors", async () => {
        const failure = new Error("handler failed");
        const asyncSelect = match(paymentTransitions, {
            created: async () => "started",
            processing: () => "processing",
            manualReview: () => "review",
            completed: () => "completed",
            cancelled: () => "cancelled",
        });
        const failingSelect = match(paymentTransitions, {
            created: () => "created",
            processing: () => "processing",
            manualReview: () => {
                throw failure;
            },
            completed: () => "completed",
            cancelled: () => "cancelled",
        });

        expect(
            isXEqualToY<
                ReturnType<typeof asyncSelect>,
                Promise<"started"> | "processing" | "review" | "completed" | "cancelled"
            >(true),
        ).toBe(true);
        await expect(asyncSelect({id: "payment-1", status: "created", substatus: null})).resolves.toBe("started");

        const allAsyncSelect = match(paymentTransitions, {
            created: async () => "created",
            processing: async () => "processing",
            manualReview: async () => "review",
            completed: async () => "completed",
            cancelled: async () => "cancelled",
        });
        expect(
            isXEqualToY<
                ReturnType<typeof allAsyncSelect>,
                Promise<"created" | "processing" | "review" | "completed" | "cancelled">
            >(true),
        ).toBe(true);
        await expect(allAsyncSelect({id: "payment-1", status: "created", substatus: null})).resolves.toBe("created");

        const mixedAsyncSelect = match(paymentTransitions, {
            created: async () => "created",
            processing: async () => "processing",
            manualReview: () => "review",
            completed: () => "completed",
            cancelled: () => "cancelled",
        });
        expect(
            isXEqualToY<
                ReturnType<typeof mixedAsyncSelect>,
                Promise<"created" | "processing"> | "review" | "completed" | "cancelled"
            >(true),
        ).toBe(true);
        expect(() => failingSelect({id: "payment-1", status: "processing", substatus: "manual_review"})).toThrow(
            failure,
        );
    });
});

describe("public API", () => {
    it("builds a schema-to-transition-to-match pipeline from the entrypoint", () => {
        const StateSchema = z.discriminatedUnion("status", [
            z.object({status: z.literal("open")}),
            z.object({status: z.literal("closed")}),
        ]);
        const flow = sam.transitions(StateSchema, {
            open: {name: "Open", when: {status: "open"}, to: ["closed"]},
            closed: {name: "Closed", when: {status: "closed"}, to: []},
        });
        const render = sam.pipeline(sam.schema(StateSchema)).pipe(
            sam.match(flow, {
                open: () => "open",
                closed: () => "closed",
            }),
        );

        expect(isXEqualToY<ReturnType<typeof render.parse>, "open" | "closed">(true)).toBe(true);
        expect(render.parse({status: "open"})).toBe("open");
        expect(sam.RefinementError).toBe(RefinementError);
        expect(sam.TransitionError).toBe(TransitionError);
        expect("Atom" in sam).toBe(false);
        expect("group" in sam).toBe(false);
        expect("context" in sam).toBe(false);
    });
});

describe("type constraints", () => {
    it("rejects incompatible patterns and incomplete transition APIs", () => {
        if (false) {
            const operations = pipeline<{kind: "avg" | "min"}>();

            // @ts-expect-error refinement values must be compatible with the pipeline input
            operations.pipe(refine({kind: "bogus"}));

            const onlyA = refine({kind: "a"});
            // @ts-expect-error a direct pattern step call must validate the input value
            onlyA({kind: "b"} as const);

            type Branch = {kind: "a"; a: number} | {kind: "b"; b: string};
            const branches = pipeline<Branch>();
            // @ts-expect-error a pattern cannot combine fields from different union branches
            branches.pipe(refine({kind: "a", b: "cross-branch"}));

            const BranchSchema = z.discriminatedUnion("kind", [
                z.object({kind: z.literal("a"), a: z.number()}),
                z.object({kind: z.literal("b"), b: z.string()}),
            ]);
            transitions(BranchSchema, {
                // @ts-expect-error transition patterns cannot combine fields from different schema branches
                broken: {name: "Broken", when: {kind: "a", b: "cross-branch"}, to: []},
            });

            transitions(PaymentStateSchema, {
                // @ts-expect-error transition patterns cannot contain fields outside the schema output
                broken: {name: "Broken", when: {status: "created", bogus: true}, to: []},
            });

            transitions(PaymentStateSchema, {
                // @ts-expect-error correlated schema fields cannot form an impossible state pattern
                broken: {name: "Broken", when: {status: "created", substatus: "manual_review"}, to: []},
            });

            transitions(PaymentStateSchema, {
                broken: {
                    name: "Broken",
                    when: {status: "created", substatus: null},
                    // @ts-expect-error transition targets must reference a key from the same definition
                    to: ["missing"],
                },
            });

            // @ts-expect-error match handlers must cover every transition key
            match(paymentTransitions, {created: () => "created"});
        }

        expect(true).toBe(true);
    });
});
