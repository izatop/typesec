import {describe, expect, it} from "bun:test";
import {constraints, defaultConstraintMessage} from "./constraints.mts";
import {scalars} from "./scalars.mts";

describe("Constraints<T>", () => {
    it("should pass", () => {
        const config = constraints<string>({validate: (value) => value.length > 0});

        expect(() => config.assert("Test", scalars.string)).not.toThrow();
    });

    it("should generate a default error message", () => {
        const config = constraints<string>({validate: (value) => value.length > 0});

        expect(() => config.assert("", scalars.string)).toThrowError(defaultConstraintMessage(scalars.string));
    });

    it("should allow a string error message", () => {
        const config = constraints<string>({
            validate: (value) => value.length > 0,
            message: "A string length should be greater than 0",
        });

        expect(() => config.assert("", scalars.string)).toThrowError("A string length should be greater than 0");
    });

    it("should format an error message", () => {
        const config = constraints<string>({
            validate: (value) => value.length > 0,
            message: ({id}) => `A string ${id} length should be greater than 0`,
        });

        expect(() => config.assert("", scalars.string)).toThrowError(
            `A string ${scalars.string.id} length should be greater than 0`,
        );
    });

    it("should format an error message as a validation returns", () => {
        const minLength = 10;
        const config = constraints<string>({
            validate: (value) =>
                value.length > minLength || `A string length is ${value.length} should be greater than ${10}`,
        });

        const value = "abc";
        expect(() => config.assert(value, scalars.string)).toThrowError(
            `A string length is ${value.length} should be greater than ${minLength}`,
        );
    });
});
