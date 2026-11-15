import {describe, expect, mock, test} from "bun:test";
import {assert, AssertionError, AssertionException} from "../../assert.mjs";
import {ApplicationException, ValidationException} from "../../errors.mjs";
import {isXEqualToY} from "../../test.mjs";

describe("assert", () => {
    test("passes through truthy values", () => {
        expect(() => assert(true, "ok")).not.toThrow();
        expect(() => assert(1, "ok")).not.toThrow();
        expect(() => assert.validate(true, "ok")).not.toThrow();
        expect(() => assert.validate(1, "ok")).not.toThrow();
    });

    test("throws AssertionException and retains the AssertionError alias", () => {
        expect(() => assert(false, "failed")).toThrow(AssertionException);
        expect(() => assert(false, "failed")).toThrow(AssertionError);
        expect(() => assert(false, "failed")).toThrow("failed");

        try {
            assert(false, "failed");
        } catch (error) {
            expect(error).toMatchObject({name: "AssertionException", code: "ERR_ASSERTION"});
        }
    });

    test("validation failures default to ValidationException", () => {
        expect(() => assert.validate(false, "invalid")).toThrow(ValidationException);
        expect(() => assert.validate(false, "invalid")).toThrow("invalid");
    });

    test("preserves concrete exception identity, type, and cause", () => {
        const cause = new Error("Original cause");
        const assertionReason = new ValidationException("Specific assertion failure", {cause});
        const validationReason = new ApplicationException("Specific validation failure", {cause});
        let assertionFailure: unknown;
        let validationFailure: unknown;

        try {
            assert(false, assertionReason);
        } catch (error) {
            assertionFailure = error;
        }

        try {
            assert.validate(false, validationReason);
        } catch (error) {
            validationFailure = error;
        }

        expect(assertionFailure).toBe(assertionReason);
        expect(validationFailure).toBe(validationReason);
        expect(assertionReason.cause).toBe(cause);
        expect(validationReason.cause).toBe(cause);
    });

    test("does not evaluate exception factories for successful checks", () => {
        const reason = mock(() => {
            throw new Error("Factory should not run");
        });

        assert(true, reason);
        assert.validate(true, reason);

        expect(reason).not.toHaveBeenCalled();
    });

    test("evaluates each failing check's factory once and preserves its exception", () => {
        const cause = new Error("Factory cause");
        const reason = new ApplicationException("Factory failure", {cause});
        const assertionFactory = mock(() => reason);
        const validationFactory = mock(() => reason);
        let assertionFailure: unknown;
        let validationFailure: unknown;

        try {
            assert(false, assertionFactory);
        } catch (error) {
            assertionFailure = error;
        }

        try {
            assert.validate(false, validationFactory);
        } catch (error) {
            validationFailure = error;
        }

        expect(assertionFactory).toHaveBeenCalledTimes(1);
        expect(validationFactory).toHaveBeenCalledTimes(1);
        expect(assertionFailure).toBe(reason);
        expect(validationFailure).toBe(reason);
        expect(reason.cause).toBe(cause);
    });

    test("preserves exceptions thrown by a factory without wrapping them", () => {
        const reason = new Error("Factory threw");
        const factory = mock(() => {
            throw reason;
        });
        let assertionFailure: unknown;
        let validationFailure: unknown;

        try {
            assert(false, factory);
        } catch (error) {
            assertionFailure = error;
        }

        try {
            assert.validate(false, factory);
        } catch (error) {
            validationFailure = error;
        }

        expect(factory).toHaveBeenCalledTimes(2);
        expect(assertionFailure).toBe(reason);
        expect(validationFailure).toBe(reason);
    });

    test("narrows values through assertion and validation calls", () => {
        function check(direct: string | undefined, directValidation: string | undefined): void {
            assert(direct, "Direct assertion");
            assert.validate(directValidation, "Direct validation");

            expect(isXEqualToY<typeof direct, string>(true)).toBeTrue();
            expect(isXEqualToY<typeof directValidation, string>(true)).toBeTrue();
        }

        check("direct", "direct validation");
    });
});
