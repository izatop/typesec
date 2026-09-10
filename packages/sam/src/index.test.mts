import {describe, expect, test} from "bun:test";
import z from "zod";
import {
    issue,
    match,
    pipeline,
    refine,
    schema,
    transitions,
    type AllowedStateChange,
    type ParsedPipeline,
    type ParserStep,
    type PatternStep,
    type Pipeline,
    type StateChange,
    type Step,
    type TransitionDefinition,
    type TransitionErrorCode,
    type TransitionKey,
    type Transitions,
    type TransitionState,
    type TransitionStateDefinition,
} from "./index.mjs";

const PaymentSchema = z.discriminatedUnion("status", [
    z.object({id: z.string(), status: z.literal("created")}),
    z.object({id: z.string(), status: z.literal("paid")}),
]);

type Payment = z.output<typeof PaymentSchema>;

const states = {
    created: {name: "Created", when: {status: "created"}, to: ["paid"]},
    paid: {name: "Paid", when: {status: "paid"}, to: []},
} as const satisfies TransitionDefinition<Payment>;

type States = typeof states;

/**
 * Every annotation below is the point of the test: a caller has to be able to write down the type a
 * public function hands back, not only obtain it through inference.
 */
describe("public surface", () => {
    const payments: Transitions<Payment, States> = transitions(PaymentSchema, states);
    const created: Payment = {id: "1", status: "created"};
    const paid: Payment = {id: "1", status: "paid"};

    test("pipeline types are nameable", () => {
        // `z.string()` carries its input type, so the parser is `string -> string`; `parse` still
        // takes `unknown` because that is what a schema-rooted pipeline promises.
        const parser: ParserStep<string, string> = schema(z.string());
        const parsed: ParsedPipeline<string, number> = pipeline(parser).pipe((value) => value.length);
        const plain: Pipeline<string, number> = pipeline<string>().pipe((value) => value.length);
        const wrapped: Step<string, number> = issue((value: string) => value.length, "cannot measure");

        expect(parsed.parse("hello")).toBe(5);
        expect(plain.run("hello")).toBe(5);
        expect(wrapped("hello")).toBe(5);
    });

    test("refinement types are nameable", () => {
        const pattern: PatternStep<{readonly status: "paid"}> = refine({status: "paid"} as const);
        const narrow: Step<Payment, TransitionState<Payment, States, "created">> = refine(payments, "created");

        expect(pattern(paid)).toBe(paid);
        expect(narrow(created)).toBe(created);
    });

    test("transition types are nameable", () => {
        const definition: TransitionStateDefinition<Payment, TransitionKey<States>> = states.created;
        const key: TransitionKey<States> = payments.resolve(created);
        const change: Step<StateChange<Payment>, AllowedStateChange<Payment, States>> = refine(payments);
        const route: Step<Payment, string> = match(payments, {
            created: (payment) => payment.status,
            paid: (payment) => payment.status,
        });

        expect(definition.name).toBe("Created");
        expect(key).toBe("created");
        expect(change({from: created, to: paid})).toEqual({from: created, to: paid});
        expect(route(paid)).toBe("paid");
    });

    test("the error code is nameable", () => {
        const code: TransitionErrorCode = "TRANSITION_NOT_ALLOWED";

        expect(() => payments.assert(paid, created)).toThrowError(expect.objectContaining({code}) as unknown as Error);
    });
});
