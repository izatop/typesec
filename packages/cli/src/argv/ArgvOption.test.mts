import {expect, test} from "bun:test";
import {describe} from "node:test";
import {ArgvOption} from "./ArgvOption.mts";

describe("ArgvOption", () => {
    test("should create an option", () => {
        const option = ArgvOption.from("-f, --foo <foo>", false);
        expect(option.name).toBe("foo");
        expect(option.required).toBeFalse();
        expect(option.match()).toBeFalse();
        expect(option.match("-f")).toBeTrue();
        expect(option.match("--foo")).toBeTrue();
        expect(() => option.validate()).not.toThrowError();
        expect(() => option.validate("value")).not.toThrowError();
    });

    test("should throw an empty value", () => {
        const option = ArgvOption.from("-f, --foo <foo>", true);
        expect(option.required).toBeTrue();
        expect(() => option.validate()).toThrowError();
        expect(() => option.validate("value")).not.toThrowError();
    });
});
